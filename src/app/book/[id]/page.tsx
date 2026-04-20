"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { books as mockBooks } from "@/data/books";
import { useBooksStore } from "@/store/booksStore";
import { useBookCovers } from "@/hooks/useBookCovers";
import { formatDateShort, getDayLabel } from "@/utils/reading";
import PhoneFrame from "@/components/layout/PhoneFrame";
import TodayCard from "@/components/book/TodayCard";
import FullJourney from "@/components/book/FullJourney";
import RestNudge from "@/components/book/RestNudge";
import { useBookState } from "@/store/selectors";
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
  // Firestore pull 완료 전에 selectedBook 미검출로 "/" 로 튕기는 이슈 방지 —
  // 스토어의 실제 hydrated 플래그가 true 가 된 뒤에만 리다이렉트 판정.
  const hydrated = useBooksStore((s) => s.hydrated);

  const registered = useBooksStore((s) => s.registered);
  // 사용자 등록 책 우선, 없으면 목업에서 찾는다.
  const allBooks = [...registered, ...mockBooks];
  const selectedBook = allBooks.find((b) => b.id === id);
  // FullJourney 현재 위치 표기용 — 훅은 조건부 호출 불가라 id 없을 땐 빈문자열로.
  const bookState = useBookState(selectedBook?.id ?? "");
  const currentPage = bookState?.currentPage ?? 0;

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
      style={{ background: "#050505", minHeight: "100vh", overflow: "hidden" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 서재로 돌아가기 ← · 날짜 · 쉬어가기 */}
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* 뒤로가기 — 이전엔 얇은 ← 기호라 안 보인다는 피드백. 원형 버튼으로 시인성 확보. */}
            <button
              onClick={() => router.push("/")}
              aria-label="서재로"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "#111",
                color: "#E8E8E8",
                border: "1px solid #2A2A2A",
                borderRadius: "50%",
                fontSize: 16,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
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
            {/* 장르 칩 — Gemini 가 표지에서 추론한 값. 목업 책은 비어있어 미표시. */}
            {selectedBook.genre && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9AE0B9",
                  background: "rgba(0,255,122,0.08)",
                  border: "1px solid rgba(0,255,122,0.2)",
                  borderRadius: 10,
                  padding: "3px 8px",
                  letterSpacing: "-0.2px",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {selectedBook.genre}
              </span>
            )}
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

        {/* 여정 카드 v3 — 커버를 레일의 시작점으로. 커버→파트→완독 연속 흐름. */}
        <FullJourney
          book={selectedBook}
          currentPage={currentPage}
          coverUrl={covers[0] ?? null}
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
