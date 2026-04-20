// 백그라운드 등록 파이프라인.
// 사용자는 "등록" 탭 즉시 서재로 복귀하고, 이 함수가 뒤에서 Gemini/알라딘을 돌려
// booksStore.updateBook 으로 책을 한 조각씩 완성시킨다. 실패 시 status="failed".

import type { AladinBook } from "@/types/aladin";
import type { Book, BookPart } from "@/types/book";
import { useBooksStore } from "@/store/booksStore";
import { postProcessParts } from "@/utils/postProcessParts";
import { normalizeAuthor } from "@/utils/normalizeAuthor";

// parseAladinToc 는 알라딘 목차 HTML 이 존재할 때만 의미 있음.
// 실측상 베스트셀러 12권 중 0권이 toc 를 제공 → 죽은 경로로 판정.
// 경로 제거했지만 Aladin 측 정책이 바뀌면 부활 가능하게 파일은 남김.

interface StartArgs {
  shellId: string;
  coverFile?: File;
  tocFiles: File[];
  // 바코드 경로로 들어온 경우 ISBN 고정 — 표지 OCR/제목 검색 스킵하고 바로 메타 조회.
  isbn13?: string;
}

export function startBackgroundRegistration(args: StartArgs) {
  // fire-and-forget — 실패는 내부에서 updateBook({ status: "failed" }) 로 마감.
  // extractionStep 까지 같이 털어야 UI 카드에 "알라딘 조회중..." 같은 라벨이 박제되지 않음.
  void runPipeline(args).catch(async (err) => {
    console.error("[bg-register] unexpected", err);
    try {
      await useBooksStore
        .getState()
        .updateBook(args.shellId, { status: "failed" });
      await clearExtractionStep(args.shellId);
    } catch (e) {
      console.warn("[bg-register] mark-failed fail", e);
    }
  });
}

async function runPipeline({
  shellId,
  coverFile,
  tocFiles,
  isbn13,
}: StartArgs) {
  const { updateBook } = useBooksStore.getState();
  console.log("[bg-register] start", {
    shellId,
    tocCount: tocFiles.length,
    hasIsbn: !!isbn13,
    hasCover: !!coverFile,
  });

  // 두 진입 경로:
  //   A) 바코드 경로 (isbn13 있음) — 표지 OCR + 제목검색 스킵, ISBN 직접 조회.
  //   B) 사진 경로 (coverFile 있음) — 표지 OCR → 제목 검색 → 메타 확정.
  //      두 경로 모두 마지막에 tocFiles 가 있으면 Vision 2-stage 목차 추출.
  let aladinMeta: AladinBook | null = null;

  if (isbn13) {
    aladinMeta = await resolveMetaByIsbn(shellId, isbn13);
  } else if (coverFile) {
    aladinMeta = await resolveMetaByCover(shellId, coverFile);
  } else {
    console.warn("[bg-register] no isbn13 nor coverFile — nothing to anchor");
  }

  await updateBook(shellId, { extractionStep: "목차 정리중" });

  // 목차 — 사용자가 사진 올렸으면 Vision 2-stage. 안 올렸으면 바로 단일-파트 폴백.
  // 알라딘 TOC HTML 은 실측상 0% 제공률이라 완전히 스킵.
  let parts: BookPart[] = [];
  let totalPages = aladinMeta?.itemPage ?? 0;

  if (tocFiles.length > 0) {
    try {
      console.log("[bg-register] vision toc", tocFiles.length, "files");
      const result = await callExtractToc(tocFiles, totalPages);
      if (result) {
        parts = result.parts;
        if (!totalPages) totalPages = result.totalPages;
      } else {
        console.warn("[bg-register] vision toc null");
      }
    } catch (e) {
      console.warn("[bg-register] vision toc fail", e);
    }
  }

  // 최종 폴백 — 목차 없지만 itemPage 있으면 "본문 1..N" 단일 파트로 저장.
  if (parts.length === 0 && totalPages > 0) {
    console.log("[bg-register] single-part fallback");
    parts = [
      {
        index: 1,
        title: aladinMeta?.title || "본문",
        startPage: 1,
        endPage: totalPages,
        sections: [{ title: "본문", startPage: 1, endPage: totalPages }],
      },
    ];
  }

  console.log("[bg-register] finalize", { parts: parts.length, totalPages });
  if (parts.length > 0 && totalPages > 0) {
    await updateBook(shellId, { parts, totalPages });
    await clearStatusField(shellId);
  } else {
    // totalPages 0 → 알라딘 메타 자체가 없거나 페이지 수 미상.
    // extractionStep 도 같이 털어서 카드에 "알라딘 조회중..." 이 박제되지 않게.
    await updateBook(shellId, { status: "failed" });
    await clearExtractionStep(shellId);
  }
}

// extractionStep 만 Firestore 에서 삭제. failed 마감 시 라벨 제거용.
async function clearExtractionStep(shellId: string) {
  const { auth, db } = await import("@/lib/firebase");
  const { doc, updateDoc, deleteField } = await import("firebase/firestore");
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid, "books", shellId), {
      extractionStep: deleteField(),
    });
    useBooksStore.setState((state) => ({
      registered: state.registered.map((b) => {
        if (b.id !== shellId) return b;
        const clone = { ...b };
        delete clone.extractionStep;
        return clone;
      }),
    }));
  } catch (e) {
    console.warn("[bg-register] clear extractionStep fail", e);
  }
}

// 바코드 경로 — ISBN 으로 알라딘 ItemLookUp 직조회.
// 프론트에서 이미 한 번 호출했지만 백그라운드에선 Firestore 반영이 목적이라 재호출.
// 네트워크 1회 추가 비용은 허용 (알라딘 TTB 무료, 병렬 안 해도 1~2초).
async function resolveMetaByIsbn(
  shellId: string,
  isbn13: string,
): Promise<AladinBook | null> {
  const { updateBook } = useBooksStore.getState();
  await updateBook(shellId, { extractionStep: "알라딘 조회중" });
  try {
    const r = await fetch(
      `/api/fetch-toc?isbn=${encodeURIComponent(isbn13)}`,
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (data.error === "no_match" || !data.title) return null;

    const patch: Partial<Book> = { title: data.title };
    if (data.author) patch.author = normalizeAuthor(data.author);
    if (data.publisher) patch.publisher = data.publisher;
    if (data.cover) patch.coverUrl = data.cover;
    await updateBook(shellId, patch);

    return {
      isbn13: data.isbn13 || isbn13,
      title: data.title,
      author: normalizeAuthor(data.author || ""),
      publisher: data.publisher || "",
      cover: data.cover || "",
      itemPage: data.itemPage ?? 0,
      pubDate: data.pubDate || "",
    };
  } catch (e) {
    console.warn("[bg-register] resolveMetaByIsbn fail", e);
    return null;
  }
}

// 사진 경로 — 표지 OCR → 알라딘 제목 검색 → 메타 확정.
// Naver 폴백은 일시적으로 비활성화. 알라딘 쿼터 (일 5,000) 초과 조짐이 보이면
// 아래 commented 블록을 활성화해서 Aladin 실패 시 Naver 로 커버 보강하도록 복구.
async function resolveMetaByCover(
  shellId: string,
  coverFile: File,
): Promise<AladinBook | null> {
  const { updateBook } = useBooksStore.getState();
  await updateBook(shellId, { extractionStep: "표지 읽는중" });

  let extractedTitle = "";
  let extractedAuthor = "";
  try {
    const dataUrl = await fileToResizedDataUrl(coverFile, 1200);
    try {
      await updateBook(shellId, { coverUrl: dataUrl });
    } catch (e) {
      console.warn("[bg-register] local cover preview fail", e);
    }
    const r = await fetch("/api/extract-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (r.ok) {
      const data = await r.json();
      const patch: Partial<Book> = {};
      if (typeof data.title === "string" && data.title.trim()) {
        extractedTitle = data.title.trim();
        patch.title = extractedTitle;
      }
      if (typeof data.author === "string" && data.author.trim()) {
        extractedAuthor = normalizeAuthor(data.author.trim());
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

  if (!extractedTitle) return null;

  await updateBook(shellId, { extractionStep: "책 찾는중" });

  // [DISABLED 2026-04-21] Naver book-cover 병렬 호출은 일시 비활성화.
  // Aladin 메타 + 커버가 품질상 충분하고, 중복 호출은 비용/레이턴시 낭비라 판단.
  // 향후 Aladin 쿼터 초과 또는 커버 누락률 상승 시 아래 구조로 복구:
  //
  //   const [naverRes, aladinRes] = await Promise.allSettled([
  //     fetch(`/api/book-cover?title=${encodeURIComponent(extractedTitle)}`),
  //     fetch(`/api/search-book?q=${encodeURIComponent(extractedTitle)}`),
  //   ]);
  //   // ...naver 커버 우선, aladin 실패 시 naver 메타까지 끌어오는 로직

  try {
    const r = await fetch(
      `/api/search-book?q=${encodeURIComponent(extractedTitle)}`,
    );
    if (!r.ok) return null;
    const data = await r.json();
    const top: AladinBook | undefined = data.items?.[0];
    if (!top) {
      console.warn("[bg-register] aladin no match", extractedTitle);
      return null;
    }

    const patch: Partial<Book> = { title: top.title };
    if (top.author) patch.author = normalizeAuthor(top.author);
    else if (extractedAuthor) patch.author = extractedAuthor;
    if (top.publisher) patch.publisher = top.publisher;
    if (top.cover) patch.coverUrl = top.cover;
    await updateBook(shellId, patch);

    return top;
  } catch (e) {
    console.warn("[bg-register] aladin search fail", e);
    return null;
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
  // 2-stage 파이프라인:
  //   1) /api/ocr-vision  — Cloud Vision 으로 순수 텍스트만 뽑음 (호출당 flat rate).
  //   2) /api/extract-toc-text — 추출된 텍스트를 Gemini 텍스트-전용 모드로 구조화.
  // Cloud Vision 은 해상도에 따른 가격 증가 없음 → 1400px 까지 올려 OCR 정확도 우선.
  // 흑백+대비 부스트는 유지 (OCR 엔진이 이미 전처리하지만 해치지 않음).
  const MAX_BODY_BYTES = 3.8 * 1024 * 1024;
  const SIZES = [1400, 1100, 900];
  let resized: Blob[] = [];
  for (const edge of SIZES) {
    resized = await Promise.all(
      files.map(async (f) => {
        try {
          const dataUrl = await fileToResizedDataUrl(f, edge, true);
          return await (await fetch(dataUrl)).blob();
        } catch {
          return f as Blob;
        }
      }),
    );
    const total = resized.reduce((acc, b) => acc + b.size, 0);
    if (total <= MAX_BODY_BYTES) break;
  }

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

  // Stage 1: OCR
  let ocrText: string;
  try {
    const r = await fetch("/api/ocr-vision", { method: "POST", body: form });
    if (!r.ok) {
      console.warn("[bg-register] ocr-vision failed", r.status);
      return null;
    }
    const data = await r.json();
    if (data.error || typeof data.text !== "string" || !data.text) {
      console.warn("[bg-register] ocr-vision empty", data);
      return null;
    }
    ocrText = data.text;
    console.log("[bg-register] ocr-vision ok, textLen", ocrText.length);
  } catch (e) {
    console.warn("[bg-register] ocr-vision fetch fail", e);
    return null;
  }

  // Stage 2: 구조화
  try {
    console.log("[bg-register] extract-toc-text call");
    const r = await fetch("/api/extract-toc-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ocrText }),
    });
    console.log("[bg-register] extract-toc-text status", r.status);
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.warn("[bg-register] extract-toc-text !ok", r.status, body.slice(0, 300));
      return null;
    }
    const data = await r.json();
    console.log("[bg-register] extract-toc-text ok", {
      hasError: !!data.error,
      partsLen: data.parts?.length ?? 0,
      totalPages: data.totalPages,
    });
    if (data.error) return null;
    const rawParts = (data.parts ?? []) as BookPart[];
    const { parts } = postProcessParts(
      rawParts,
      aladinTotal || data.totalPages,
    );
    const totalPages = aladinTotal || data.totalPages || 0;
    if (parts.length > 0 && totalPages > 0) {
      return { parts, totalPages };
    }
    console.warn("[bg-register] extract-toc-text empty parts/pages", {
      parts: parts.length,
      totalPages,
    });
    return null;
  } catch (e) {
    console.warn("[bg-register] extract-toc-text throw", e);
    return null;
  }
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
  enhance: boolean = false,
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
    const needResize = longest > maxEdge;
    if (!needResize && !enhance) return await fileToDataUrl(file);
    const scale = needResize ? maxEdge / longest : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await fileToDataUrl(file);
    ctx.drawImage(img, 0, 0, w, h);

    if (enhance) {
      // 흑백 + 대비 부스트 — OCR 가독성 향상.
      // 타일 토큰은 해상도로만 결정되므로 비용엔 영향 없음. 정확도 ↑ → 재시도 ↓ 로 간접 절감.
      // 방식: 휘도 변환 후 중간값(128) 기준 대비 1.5배 스트레치. 흰 배경은 더 희게, 글자는 더 검게.
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const contrast = 1.5;
      for (let i = 0; i < data.length; i += 4) {
        const gray =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const stretched = (gray - 128) * contrast + 128;
        const clamped = Math.max(0, Math.min(255, stretched));
        data[i] = data[i + 1] = data[i + 2] = clamped;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
