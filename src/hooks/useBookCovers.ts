"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types/book";
import { getCached, setCached } from "@/lib/firestore/coverCacheRepo";

// 책 표지 조회 — Firestore coverCache 우선, miss/stale 이면 /api/book-cover 로 폴백.
// 성공 시 캐시에 저장해 다음 방문부터는 네이버 API 요금 + 지연 없이 로드.

export function useBookCovers(books: Book[]): Record<number, string> {
  const [covers, setCovers] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;

    books.forEach((book, idx) => {
      const q = book.searchQuery;
      (async () => {
        try {
          const cached = await getCached(q);
          if (cached?.image) {
            if (!cancelled)
              setCovers((prev) => ({ ...prev, [idx]: cached.image! }));
            return;
          }
        } catch (err) {
          // 캐시 실패는 조용히 무시 — 네이버 API 폴백으로 계속 진행.
          console.warn("[useBookCovers] cache lookup fail", err);
        }

        try {
          const r = await fetch(
            `/api/book-cover?title=${encodeURIComponent(q)}`,
          );
          const d = await r.json();
          if (d.image && !cancelled) {
            setCovers((prev) => ({ ...prev, [idx]: d.image }));
          }
          // null 이어도 캐시에 박아둬서 반복 호출 방지.
          await setCached(q, d.image ?? null);
        } catch (err) {
          console.warn("[useBookCovers] fetch fail", err);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [books]);

  return covers;
}
