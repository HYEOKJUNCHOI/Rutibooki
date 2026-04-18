"use client";

import { useState } from "react";
import { books } from "@/data/books";
import { useBookCovers } from "@/hooks/useBookCovers";
import { formatDateShort, getDayLabel } from "@/utils/reading";
import PhoneFrame from "@/components/layout/PhoneFrame";
import BookCoverSwipe from "@/components/book/BookCoverSwipe";
import BookThumbnails from "@/components/book/BookThumbnails";
import TodayCard from "@/components/book/TodayCard";
import RestNudge from "@/components/book/RestNudge";
import ModeToggle, { ReadingMode } from "@/components/book/ModeToggle";

export default function Home() {
  const today = new Date();
  const todayIdx = today.getDay();
  const dateStr = formatDateShort(today);

  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const [showNudge, setShowNudge] = useState(false);
  // 독서 모드 — 루틴(요일별) / 인터리빙(챕터 교차). MVP는 루틴 기본.
  const [mode, setMode] = useState<ReadingMode>("routine");

  const covers = useBookCovers(books);
  const selectedBook = books[selectedIdx];
  const isToday = selectedIdx === todayIdx;

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 요일·날짜·쉬어가기 한 줄 */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#E8E8E8", letterSpacing: 1 }}>
            <span style={{ color: isToday ? "#00FF7A" : "#00B858", fontWeight: 600 }}>
              {getDayLabel(selectedIdx)}
            </span>
            <span style={{ margin: "0 8px", color: "#4A4A4A" }}>·</span>
            {dateStr}
          </p>
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

        {/* 모드 토글 — 루틴 / 인터리빙 */}
        <ModeToggle mode={mode} onChange={setMode} />

        {/* 책 표지 스와이프 */}
        <BookCoverSwipe
          books={books}
          covers={covers}
          selectedIdx={selectedIdx}
          onSelect={setSelectedIdx}
        />

        {/* 썸네일 */}
        <BookThumbnails
          books={books}
          covers={covers}
          selectedIdx={selectedIdx}
          todayIdx={todayIdx}
          onSelect={setSelectedIdx}
        />

        {/* 오늘 카드 */}
        <TodayCard
          book={selectedBook}
          isToday={isToday}
          dayLabel={getDayLabel(selectedIdx)}
        />

        {/* CTA */}
        <button
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

        {/* 쉬어가기 오버레이 */}
        {showNudge && (
          <RestNudge
            nudge={selectedBook.nudge}
            onClose={() => setShowNudge(false)}
          />
        )}
      </PhoneFrame>

      <p style={{ color: "#5A5A5A", fontSize: 12, marginTop: 20, letterSpacing: 1 }}>
        스플래시 없이 바로.{" "}
        <span style={{ color: "#00FF7A" }}>책 한 권, 버튼 하나</span>.
      </p>
    </main>
  );
}
