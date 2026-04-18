"use client";

import { Book } from "@/types/book";
import { calcProgress } from "@/utils/reading";

interface TodayCardProps {
  book: Book;
  isToday: boolean;
  dayLabel: string;
}

export default function TodayCard({ book, isToday, dayLabel }: TodayCardProps) {
  const progress = calcProgress(book.currentPage, book.totalPages);
  const remaining = book.totalPages - book.currentPage;

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1F1F1F",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      {/* 요일 라벨은 헤더에 있으므로 여기선 챕터부터. "오늘/요일" 중복 제거 */}
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#E8E8E8",
          marginBottom: 8,
          letterSpacing: "-0.3px",
        }}
      >
        {book.chapter}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: "#00FF7A", fontWeight: 600 }}>약 {book.minutes}분</span>
        <span style={{ fontSize: 12, color: "#5A5A5A" }}>
          · {isToday ? "오늘 분량" : `${dayLabel}요일 분량`}
        </span>
      </div>

      {/* 진행 바 — 바 하나만 단일 의미로. 양끝 라벨과 중앙 요약으로 설명 */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <div
          style={{
            width: "100%",
            height: 6,
            background: "#1F1F1F",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#00FF7A",
              borderRadius: 3,
              boxShadow: "0 0 8px rgba(0,255,122,0.6)",
              transition: "width 0.6s ease",
            }}
          />
        </div>
        {/* 현재 위치 점 — 바 위의 "지금 여기" 마커 */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${progress}%`,
            width: 10,
            height: 10,
            background: "#00FF7A",
            border: "2px solid #111",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 8px rgba(0,255,122,0.8)",
          }}
        />
      </div>

      {/* 바 양끝 라벨 — "여기까지 왔다 / 여기가 끝" */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: "#00FF7A", fontWeight: 600, letterSpacing: "-0.3px" }}>
          {book.currentPage}p
          <span style={{ fontSize: 10, color: "#5A5A5A", fontWeight: 400, marginLeft: 4 }}>
            여기까지 왔어요
          </span>
        </span>
        <span style={{ fontSize: 11, color: "#5A5A5A", letterSpacing: "-0.3px" }}>
          <span style={{ color: "#8A8A8A" }}>{remaining}p 남음</span>
          <span style={{ margin: "0 6px", color: "#2A2A2A" }}>·</span>
          {book.totalPages}p
        </span>
      </div>
    </div>
  );
}
