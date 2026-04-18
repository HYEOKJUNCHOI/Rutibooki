"use client";

import { Book } from "@/types/book";
import { getDayLabel } from "@/utils/reading";

interface BookThumbnailsProps {
  books: Book[];
  covers: Record<number, string>;
  selectedIdx: number;
  todayIdx: number;
  onSelect: (idx: number) => void;
}

export default function BookThumbnails({
  books,
  covers,
  selectedIdx,
  todayIdx,
  onSelect,
}: BookThumbnailsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        marginBottom: 16,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {books.map((book, idx) => {
        const isSelected = selectedIdx === idx;
        const isToday = idx === todayIdx;
        // 선택된 것만 초록 강조 (+ 띠지). 라벨은 오늘일 때 "오늘"로 바뀌어 정보만 전달
        const labelColor = isSelected ? "#00FF7A" : "#4A4A4A";

        return (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
            }}
          >
            {/* 요일 라벨 — 선택된 것만 초록 */}
            <span
              style={{
                fontSize: 9,
                fontWeight: isSelected ? 700 : 500,
                color: labelColor,
                letterSpacing: 0.3,
                lineHeight: 1,
              }}
            >
              {isToday ? "오늘" : getDayLabel(idx)}
            </span>
            <button
              onClick={() => onSelect(idx)}
              style={{
                width: 40,
                height: 54,
                borderRadius: 6,
                overflow: "hidden",
                border: isSelected ? "2px solid #00FF7A" : "2px solid transparent",
                background: "#161616",
                cursor: "pointer",
                padding: 0,
                position: "relative",
                opacity: isSelected ? 1 : 0.55,
                transition: "all 0.2s",
              }}
            >
              {covers[idx] ? (
                <img
                  src={covers[idx]}
                  alt={book.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <p
                  style={{
                    fontSize: 7,
                    color: "#5A5A5A",
                    padding: 3,
                    lineHeight: 1.3,
                    textAlign: "center",
                  }}
                >
                  {book.title.slice(0, 5)}
                </p>
              )}

            </button>
          </div>
        );
      })}
    </div>
  );
}
