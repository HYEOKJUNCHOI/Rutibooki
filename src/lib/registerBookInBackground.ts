// 백그라운드 등록 파이프라인 — 바코드 원툴.
// [2026-04-22 리팩] AI(Gemini/CLOVA) 및 사진 OCR 경로 완전 제거.
// 플로우: 바코드 → ISBN → 알라딘 메타 → 교보 목차 스크래핑 → 확정.
// 교보에 없으면 실패 처리. 사진 폴백 없음 (혁준님 "바코드 원툴" 결정).

import type { AladinBook } from "@/types/aladin";
import type { Book, BookPart } from "@/types/book";
import { useBooksStore } from "@/store/booksStore";
import { postProcessParts } from "@/utils/postProcessParts";
import { normalizeAuthor } from "@/utils/normalizeAuthor";

interface StartArgs {
  shellId: string;
  // 바코드 경로 필수. 없으면 그대로 실패 처리.
  isbn13?: string;
}

export function startBackgroundRegistration(args: StartArgs) {
  // fire-and-forget — 실패는 내부에서 updateBook({ status: "failed" }) 로 마감.
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

async function runPipeline({ shellId, isbn13 }: StartArgs) {
  const { updateBook } = useBooksStore.getState();
  console.log("[bg-register] start", { shellId, hasIsbn: !!isbn13 });

  if (!isbn13) {
    console.warn("[bg-register] no isbn13 — barcode required");
    await updateBook(shellId, { status: "failed" });
    await clearExtractionStep(shellId);
    return;
  }

  // 1단계: 알라딘에서 메타 확정 (제목·저자·표지·총쪽수·출판사·장르).
  const aladinMeta = await resolveMetaByIsbn(shellId, isbn13);
  if (!aladinMeta) {
    await updateBook(shellId, { status: "failed" });
    await clearExtractionStep(shellId);
    return;
  }

  // 2단계: 교보에서 실제 인쇄 목차 긁기.
  await updateBook(shellId, { extractionStep: "교보 목차 가져오는중" });
  let parts: BookPart[] = [];
  let totalPages = aladinMeta.itemPage ?? 0;
  try {
    const result = await callFetchTocFromKyobo(isbn13, totalPages);
    if (result) {
      parts = result.parts;
      if (!totalPages) totalPages = result.totalPages;
    } else {
      console.warn("[bg-register] kyobo no toc for", isbn13);
    }
  } catch (e) {
    console.warn("[bg-register] kyobo throw", e);
  }

  console.log("[bg-register] finalize", { parts: parts.length, totalPages });
  if (parts.length > 0 && totalPages > 0) {
    await updateBook(shellId, { parts, totalPages });
    await clearStatusField(shellId);
  } else {
    // 교보 실패 → 실패 마감. 사진 폴백 없음.
    await updateBook(shellId, { status: "failed" });
    await clearExtractionStep(shellId);
  }
}

interface ExtractTocResult {
  parts: BookPart[];
  totalPages: number;
}

// 교보 스크래핑 라우트 호출 — ISBN 만 던지면 서버 사이드에서 검색→상품페이지→<li> 파싱.
async function callFetchTocFromKyobo(
  isbn13: string,
  aladinTotal: number,
): Promise<ExtractTocResult | null> {
  try {
    const r = await fetch("/api/fetch-toc-kyobo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbn13, totalPages: aladinTotal }),
    });
    if (!r.ok) {
      console.warn("[bg-register] kyobo !ok", r.status);
      return null;
    }
    const data = await r.json();
    if (data.error || data.unknown) return null;
    const rawParts = (data.parts ?? []) as BookPart[];
    const { parts } = postProcessParts(rawParts, aladinTotal || data.totalPages);
    const totalPages = aladinTotal || data.totalPages || 0;
    if (parts.length > 0 && totalPages > 0) {
      return { parts, totalPages };
    }
    return null;
  } catch (e) {
    console.warn("[bg-register] kyobo throw", e);
    return null;
  }
}

// 바코드 경로 — ISBN 으로 알라딘 ItemLookUp 직조회.
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
    if (data.category) patch.category = data.category;
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

// extractionStep 만 Firestore 에서 삭제. failed 마감 시 라벨 제거용.
export async function clearExtractionStep(shellId: string) {
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

// status·extractionStep 필드를 Firestore 에서 실제로 삭제. undefined patch 는 에러라 deleteField 사용.
export async function clearStatusField(shellId: string) {
  const { auth, db } = await import("@/lib/firebase");
  const { doc, updateDoc, deleteField } = await import("firebase/firestore");
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid, "books", shellId), {
      status: deleteField(),
      extractionStep: deleteField(),
    });
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

// 이미 등록된 책에 목차 재등록 (서재 길게누름 → "목차 다시 가져오기").
// 기존 사진 업로드 경로는 제거. 교보 스크래핑만 재시도.
export async function updateTocForExistingBook(
  bookId: string,
  isbn13: string,
): Promise<boolean> {
  if (!isbn13) return false;
  const { updateBook, registered } = useBooksStore.getState();
  const existing = registered.find((b) => b.id === bookId);
  const aladinTotal = existing?.totalPages ?? 0;

  await updateBook(bookId, {
    status: "extracting",
    extractionStep: "교보 목차 가져오는중",
    extractionStartedAt: new Date().toISOString(),
  });
  try {
    const result = await callFetchTocFromKyobo(isbn13, aladinTotal);
    if (!result) {
      await clearExtractingFlags(bookId);
      return false;
    }
    await updateBook(bookId, {
      parts: result.parts,
      totalPages: result.totalPages,
    });
    await clearExtractingFlags(bookId);
    return true;
  } catch (e) {
    console.warn("[update-toc] fail", e);
    await clearExtractingFlags(bookId);
    return false;
  }
}

async function clearExtractingFlags(bookId: string) {
  const { auth, db } = await import("@/lib/firebase");
  const { doc, updateDoc, deleteField } = await import("firebase/firestore");
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid, "books", bookId), {
      status: deleteField(),
      extractionStep: deleteField(),
      extractionStartedAt: deleteField(),
    });
  } catch (e) {
    console.warn("[update-toc] clear flags fail", e);
  }
}
