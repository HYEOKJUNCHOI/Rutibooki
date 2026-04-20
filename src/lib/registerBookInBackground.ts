// 백그라운드 등록 파이프라인.
// 사용자는 "등록" 탭 즉시 서재로 복귀하고, 이 함수가 뒤에서 Gemini/알라딘을 돌려
// booksStore.updateBook 으로 책을 한 조각씩 완성시킨다. 실패 시 status="failed".

import type { AladinBook } from "@/types/aladin";
import type { Book, BookPart } from "@/types/book";
import { useBooksStore } from "@/store/booksStore";
import { postProcessParts } from "@/utils/postProcessParts";
import { parseAladinToc } from "@/utils/parseAladinToc";

interface StartArgs {
  shellId: string;
  coverFile: File;
  tocFiles: File[];
}

export function startBackgroundRegistration(args: StartArgs) {
  // fire-and-forget — 실패는 내부에서 updateBook({ status: "failed" }) 로 마감.
  void runPipeline(args).catch((err) => {
    console.error("[bg-register] unexpected", err);
    useBooksStore.getState().updateBook(args.shellId, { status: "failed" });
  });
}

async function runPipeline({ shellId, coverFile, tocFiles }: StartArgs) {
  const { updateBook } = useBooksStore.getState();
  console.log("[bg-register] start", { shellId, tocCount: tocFiles.length });

  // 단계 라벨 갱신 — UI(서재 카드) 가 현재 뭘 하고 있는지 보여주게.
  await updateBook(shellId, { extractionStep: "표지 읽는중" });

  // 1) 표지 OCR → 제목/저자/장르/출판사.
  let extractedTitle = "";
  let extractedAuthor = "";
  try {
    console.log("[bg-register] cover resize start");
    const dataUrl = await fileToResizedDataUrl(coverFile, 1200);
    // 업로드한 사진을 임시 표지로 즉시 박아넣음 — 알라딘 매칭 전까지 "일하는 중" 감.
    // 알라딘 매칭되면 더 깨끗한 URL 로 덮어씀.
    try {
      await updateBook(shellId, { coverUrl: dataUrl });
    } catch (e) {
      console.warn("[bg-register] local cover preview set fail", e);
    }
    console.log("[bg-register] cover resize done, calling /api/extract-cover");
    const r = await fetch("/api/extract-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    console.log("[bg-register] extract-cover status", r.status);
    if (r.ok) {
      const data = await r.json();
      console.log("[bg-register] extract-cover data", data);
      const patch: Partial<Book> = {};
      if (typeof data.title === "string" && data.title.trim()) {
        extractedTitle = data.title.trim();
        patch.title = extractedTitle;
      }
      if (typeof data.author === "string" && data.author.trim()) {
        extractedAuthor = data.author.trim();
        patch.author = extractedAuthor;
      }
      if (typeof data.genre === "string" && data.genre.trim()) {
        patch.genre = data.genre.trim();
      }
      if (typeof data.publisher === "string" && data.publisher.trim()) {
        patch.publisher = data.publisher.trim();
      }
      if (Object.keys(patch).length > 0) {
        await updateBook(shellId, patch);
      }
    }
  } catch (e) {
    console.warn("[bg-register] cover OCR fail", e);
  }

  await updateBook(shellId, { extractionStep: "책 찾는중" });

  // 2) 알라딘 매칭 → ISBN/표지URL/itemPage 확보.
  let aladinMatch: AladinBook | null = null;
  if (extractedTitle) {
    try {
      console.log("[bg-register] aladin search start", extractedTitle);
      const r = await fetch(
        `/api/search-book?q=${encodeURIComponent(extractedTitle)}`,
      );
      console.log("[bg-register] search-book status", r.status);
      if (r.ok) {
        const data = await r.json();
        console.log("[bg-register] aladin items count", data.items?.length ?? 0);
        const top: AladinBook | undefined = data.items?.[0];
        if (top) {
          console.log("[bg-register] aladin top", {
            title: top.title,
            isbn13: top.isbn13,
            itemPage: top.itemPage,
          });
          aladinMatch = top;
          const patch: Partial<Book> = { title: top.title };
          if (top.author) patch.author = top.author;
          else if (extractedAuthor) patch.author = extractedAuthor;
          if (top.publisher) patch.publisher = top.publisher;
          if (top.cover) patch.coverUrl = top.cover;
          await updateBook(shellId, patch);
        } else {
          console.warn("[bg-register] aladin no match for", extractedTitle);
        }
      }
    } catch (e) {
      console.warn("[bg-register] aladin search fail", e);
    }
  } else {
    console.warn("[bg-register] skipping aladin — no extractedTitle");
  }

  await updateBook(shellId, { extractionStep: "목차 정리중" });

  // 3) 목차 — 알라딘 우선, 실패 시 Gemini Vision.
  let parts: BookPart[] = [];
  let totalPages = 0;

  if (aladinMatch?.isbn13) {
    try {
      console.log("[bg-register] aladin toc fetch", aladinMatch.isbn13);
      const r = await fetch(
        `/api/fetch-toc?isbn=${encodeURIComponent(aladinMatch.isbn13)}`,
      );
      console.log("[bg-register] fetch-toc status", r.status);
      if (r.ok) {
        const data = await r.json();
        const html = typeof data.toc === "string" ? data.toc : "";
        console.log("[bg-register] aladin toc html len", html.length);
        if (html) {
          const parsed = parseAladinToc(html);
          console.log("[bg-register] parsed parts", parsed.parts.length, "lastPage", parsed.lastPage);
          if (parsed.parts.length > 0) {
            parts = parsed.parts;
            totalPages =
              (typeof data.itemPage === "number" && data.itemPage > 0
                ? data.itemPage
                : aladinMatch.itemPage) || parsed.lastPage;
          }
        }
      }
    } catch (e) {
      console.warn("[bg-register] aladin toc fail", e);
    }
  } else {
    console.warn("[bg-register] skipping aladin toc — no isbn13");
  }

  // 알라딘 실패했고 사용자 사진 슬롯이 있으면 Gemini Vision 폴백.
  if (parts.length === 0 && tocFiles.length > 0) {
    try {
      console.log("[bg-register] gemini toc fallback", tocFiles.length, "files");
      const result = await callExtractToc(tocFiles, aladinMatch?.itemPage ?? 0);
      if (result) {
        parts = result.parts;
        totalPages =
          aladinMatch?.itemPage && aladinMatch.itemPage > 0
            ? aladinMatch.itemPage
            : result.totalPages;
      } else {
        console.warn("[bg-register] gemini toc returned null");
      }
    } catch (e) {
      console.warn("[bg-register] gemini toc fail", e);
    }
  }

  // 3.5) 폴백 중의 폴백 — 알라딘에 책 있지만 목차만 비어있는 경우(소형 출판사 흔함).
  // itemPage 라도 있으면 "본문 1..N" 단일 파트로 저장해 최소 읽을 수 있게.
  if (
    parts.length === 0 &&
    aladinMatch?.itemPage &&
    aladinMatch.itemPage > 0
  ) {
    console.log("[bg-register] single-part fallback with aladin itemPage");
    totalPages = aladinMatch.itemPage;
    parts = [
      {
        index: 1,
        title: aladinMatch.title || "본문",
        startPage: 1,
        endPage: totalPages,
        sections: [
          { title: "본문", startPage: 1, endPage: totalPages },
        ],
      },
    ];
  }

  // 4) 마감 — 성공이면 status 필드 자체를 Firestore 에서 삭제, 실패면 status="failed".
  console.log("[bg-register] finalize", { parts: parts.length, totalPages });
  if (parts.length > 0 && totalPages > 0) {
    // Firestore updateDoc 에 deleteField() 를 넘겨야 실제 필드가 지워진다.
    // 타입 안전하게 처리하기 위해 별도 import 대신 repo 레벨에서 뺄 수도 있지만,
    // 간단히 빈 문자열 대신 "ready" 센티넬로 둔다 — undefined 로 두면 Firestore 에러.
    await updateBook(shellId, {
      parts,
      totalPages,
    });
    await clearStatusField(shellId);
  } else {
    await updateBook(shellId, { status: "failed" });
  }
}

// status·extractionStep 필드를 Firestore 에서 실제로 삭제. undefined patch 는 에러라 deleteField 사용.
async function clearStatusField(shellId: string) {
  const { auth } = await import("@/lib/firebase");
  const { db } = await import("@/lib/firebase");
  const { doc, updateDoc, deleteField } = await import("firebase/firestore");
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid, "books", shellId), {
      status: deleteField(),
      extractionStep: deleteField(),
    });
    // 로컬 스토어도 동기화 — onSnapshot 도착 전 UI 즉시 반영.
    useBooksStore.setState((state) => ({
      registered: state.registered.map((b) => {
        if (b.id !== shellId) return b;
        const clone = { ...b };
        delete clone.status;
        delete clone.extractionStep;
        return clone;
      }),
    }));
  } catch (e) {
    console.warn("[bg-register] clear status fail", e);
  }
}

interface ExtractTocResult {
  parts: BookPart[];
  totalPages: number;
}

async function callExtractToc(
  files: File[],
  aladinTotal: number,
): Promise<ExtractTocResult | null> {
  // 원본 대신 1600px JPEG 로 리사이즈 — 서버 용량 한계/Gemini 비용 절감.
  const resized: Blob[] = await Promise.all(
    files.map(async (f) => {
      try {
        // 1800px — Vercel 서버리스 요청 바디 4.5MB 제한 회피.
        // 2400 3장 = 바디 초과로 edge 에서 413 차단(함수 로그 안 남음).
        // Flash OCR 품질은 1800 에서도 거의 유지.
        const dataUrl = await fileToResizedDataUrl(f, 1800);
        return await (await fetch(dataUrl)).blob();
      } catch {
        return f;
      }
    }),
  );

  const form = new FormData();
  resized.forEach((blob, i) => {
    const name = files[i].name || `toc-${i + 1}.jpg`;
    form.append(
      "image",
      new File([blob], name.replace(/\.\w+$/, "") + ".jpg", {
        type: "image/jpeg",
      }),
    );
  });

  // 3회 retry — Gemini 429 대응.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("/api/extract-toc", {
        method: "POST",
        body: form,
      });
      if (!r.ok) {
        await wait(500 * (attempt + 1));
        continue;
      }
      const data = await r.json();
      if (data.error) {
        await wait(500 * (attempt + 1));
        continue;
      }
      const rawParts = (data.parts ?? []) as BookPart[];
      const { parts } = postProcessParts(
        rawParts,
        aladinTotal || data.totalPages,
      );
      const totalPages = aladinTotal || data.totalPages || 0;
      if (parts.length > 0 && totalPages > 0) {
        return { parts, totalPages };
      }
      return null;
    } catch {
      // 네트워크 오류 — 다음 retry 로.
    }
  }
  return null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("read_not_string"));
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

async function fileToResizedDataUrl(
  file: File,
  maxEdge: number,
): Promise<string> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return fileToDataUrl(file);
  }
  const originalUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image_load_failed"));
      el.src = originalUrl;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= maxEdge) return await fileToDataUrl(file);
    const scale = maxEdge / longest;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await fileToDataUrl(file);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
