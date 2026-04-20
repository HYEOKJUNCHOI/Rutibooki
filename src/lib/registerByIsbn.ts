// 바코드 스캔 후 ISBN-13 기반 등록 파이프라인.
// Gemini 호출 없이 알라딘 ItemLookUp 한 방 + HTML 목차 파싱으로 Book 완성.
// 알라딘에 목차가 없으면 "본문 단일 파트" 로 폴백 → 실패 0% 목표.

import type { Book, BookPart } from "@/types/book";
import { useBooksStore } from "@/store/booksStore";
import { parseAladinToc } from "@/utils/parseAladinToc";

interface StartArgs {
  isbn13: string;
  shellId: string;
}

interface AladinLookupPayload {
  toc?: string;
  itemPage?: number;
  title?: string;
  author?: string;
  publisher?: string;
  cover?: string;
  error?: string;
}

export async function registerByIsbn({ isbn13, shellId }: StartArgs): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const { updateBook } = useBooksStore.getState();
  console.log("[isbn-register] start", { isbn13, shellId });

  let data: AladinLookupPayload;
  try {
    const r = await fetch(
      `/api/fetch-toc?isbn=${encodeURIComponent(isbn13)}`,
    );
    if (!r.ok) {
      await updateBook(shellId, { status: "failed" });
      return { ok: false, reason: `status ${r.status}` };
    }
    data = (await r.json()) as AladinLookupPayload;
  } catch (e) {
    await updateBook(shellId, { status: "failed" });
    return { ok: false, reason: (e as Error).message };
  }

  console.log("[isbn-register] aladin payload", {
    title: data.title,
    itemPage: data.itemPage,
    tocLen: (data.toc ?? "").length,
  });

  if (data.error === "no_match" || !data.title) {
    await updateBook(shellId, { status: "failed" });
    return { ok: false, reason: "no_match" };
  }

  // 1) 메타 먼저 반영 — 목차 단계 실패해도 최소 제목·표지는 카드에 보이게.
  const metaPatch: Partial<Book> = { title: data.title };
  if (data.author) metaPatch.author = data.author;
  if (data.publisher) metaPatch.publisher = data.publisher;
  if (data.cover) metaPatch.coverUrl = data.cover;
  await updateBook(shellId, metaPatch);

  // 2) 목차 HTML 파싱.
  const parsed = parseAladinToc(data.toc ?? "");
  let parts: BookPart[] = parsed.parts;
  const itemPage = data.itemPage ?? 0;
  const totalPages = itemPage > 0 ? itemPage : parsed.lastPage;

  console.log("[isbn-register] toc parse", {
    hasToc: (data.toc ?? "").length > 0,
    partsCount: parts.length,
    itemPage,
    parsedLastPage: parsed.lastPage,
    totalPages,
  });

  // 3) 목차 비었지만 itemPage 는 있음 → 단일 파트 폴백.
  if (parts.length === 0 && totalPages > 0) {
    parts = [
      {
        index: 1,
        title: data.title || "본문",
        startPage: 1,
        endPage: totalPages,
        sections: [{ title: "본문", startPage: 1, endPage: totalPages }],
      },
    ];
  }

  if (parts.length === 0 || totalPages === 0) {
    // 메타는 남아있고 status=failed 로 표시 → 서재에서 "사진으로 목차 보강" 유도 가능.
    await updateBook(shellId, { status: "failed" });
    return { ok: false, reason: "empty_parts_and_no_pages" };
  }

  await updateBook(shellId, { parts, totalPages });
  await clearStatusField(shellId);

  return { ok: true };
}

async function clearStatusField(shellId: string) {
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
    console.warn("[isbn-register] clear status fail", e);
  }
}
