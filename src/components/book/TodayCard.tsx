"use client";

import { Book } from "@/types/book";
import {
  calcProgress,
  formatPageRange,
  formatPartLabel,
  getActivePart,
  getActiveSection,
} from "@/utils/reading";
import { useBookState } from "@/store/selectors";

interface TodayCardProps {
  book: Book;
}

// T-17: "오늘" 라벨·"목표" 문구 제거. 파트/섹션 라벨 + 진행 바.
// 시간 예측 문구("보통 이 분량은 N분")는 추정치 부담을 주어 제거 — 숫자보다 여정(FullJourney)을 강조.
export default function TodayCard({ book }: TodayCardProps) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;

  // 오늘 읽을 활성 섹션 = 현재 페이지가 속한 섹션. 미시작(0p)이면 첫 섹션.
  const section = getActiveSection(book, currentPage || 1);
  const part = getActivePart(book, currentPage || 1);

  const progress = calcProgress(currentPage, book.totalPages);
  const remaining = book.totalPages - currentPage;

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
      {/* 파트 · 페이지 범위 라벨 — "오늘"이라는 단어는 쓰지 않는다. 분량 제시일 뿐 목표 아님. */}
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#E8E8E8",
          marginBottom: 14,
          letterSpacing: "-0.3px",
        }}
      >
        {formatPartLabel(part.index)}
        <span style={{ margin: "0 8px", color: "#4A4A4A" }}>·</span>
        <span style={{ color: "#8A8A8A", fontWeight: 500 }}>
          {formatPageRange(section.startPage, section.endPage)}
        </span>
      </p>
      {/* 진행 바 — 책 전체 대비 현재 페이지. 단일 의미. */}
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
          {currentPage}p
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
