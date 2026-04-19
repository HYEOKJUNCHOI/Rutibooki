"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { books as mockBooks } from "@/data/books";
import { useBooksStore } from "@/store/booksStore";
import { useBookCovers } from "@/hooks/useBookCovers";
import { formatDateShort, getDayLabel } from "@/utils/reading";
import { useReadingStore } from "@/store/readingStore";
import PhoneFrame from "@/components/layout/PhoneFrame";
import BookCoverSwipe from "@/components/book/BookCoverSwipe";
import TodayCard from "@/components/book/TodayCard";
import RestNudge from "@/components/book/RestNudge";
import { getNudge } from "@/data/nudges";

// /book/[id] — 서재에서 책 선택 시 진입하는 상세·실행 화면.
// 기존 홈의 "큰 표지 + 오늘 분량 + CTA" 로직이 그대로 옮겨옴.

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16에선 params가 Promise — React 19 `use()` 로 풀어야 함.
  const { id } = use(params);
  const router = useRouter();
  const today = new Date();
  const todayIdx = today.getDay();
  const dateStr = formatDateShort(today);

  const [showNudge, setShowNudge] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      Promise.resolve(useReadingStore.persist.rehydrate()),
      Promise.resolve(useBooksStore.persist.rehydrate()),
    ]).finally(() => setHydrated(true));
  }, []);

  const registered = useBooksStore((s) => s.registered);
  // 사용자 등록 책 우선, 없으면 목업에서 찾는다.
  const allBooks = [...registered, ...mockBooks];
  const selectedBook = allBooks.find((b) => b.id === id);

  useEffect(() => {
    if (hydrated && !selectedBook) router.replace("/");
  }, [hydrated, selectedBook, router]);

  // 표지 로딩은 선택된 책 1권만 대상. BookCoverSwipe가 배열을 받으므로 1개짜리로 감싸 넘김.
  const coverBooks = selectedBook ? [selectedBook] : [];
  const covers = useBookCovers(coverBooks);

  if (!hydrated || !selectedBook) {
    return (
      <main
        style={{ background: "#050505", minHeight: "100vh" }}
        className="flex flex-col items-center justify-center px-6 py-12"
      >
        <PhoneFrame>
          <div style={{ flex: 1 }} />
        </PhoneFrame>
      </main>
    );
  }

  const handleOpenBook = () => {
    router.push(`/read?bookId=${selectedBook.id}`);
  };

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 서재로 돌아가기 ← · 날짜 · 쉬어가기 */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.push("/")}
              aria-label="서재로"
              style={{
                background: "transparent",
                color: "#9A9A9A",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "2px 4px",
                lineHeight: 1,
              }}
            >
              ←
            </button>
            <p style={{ fontSize: 13, color: "#E8E8E8", letterSpacing: 1, margin: 0 }}>
              <span style={{ color: "#00FF7A", fontWeight: 600 }}>
                {getDayLabel(todayIdx)}
              </span>
              <span style={{ margin: "0 8px", color: "#4A4A4A" }}>·</span>
              {dateStr}
            </p>
          </div>
          <button
            onClick={() => setShowNudge(true)}
            style={{
              background: "transparent",
              color: "#E8E8E8",
              border: "none",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            쉬어가기
          </button>
        </div>

        {/* 단권 상세 — BookCoverSwipe 는 스와이프 비활성 모드로 뒤집기만 유지 */}
        <BookCoverSwipe
          books={coverBooks}
          covers={covers}
          selectedIdx={0}
          onSelect={() => {}}
        />

        <TodayCard book={selectedBook} />

        <button
          onClick={handleOpenBook}
          style={{
            width: "100%",
            background: "#00FF7A",
            color: "#000",
            border: "none",
            borderRadius: 14,
            padding: "18px",
            fontSize: 17,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.5px",
          }}
        >
          책 펼쳤어요 →
        </button>

        {showNudge && (
          <RestNudge
            nudge={getNudge(selectedBook.id)}
            onClose={() => setShowNudge(false)}
          />
        )}
      </PhoneFrame>
    </main>
  );
}
