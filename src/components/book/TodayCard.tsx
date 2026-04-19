"use client";

import { Book } from "@/types/book";
import {
  calcProgress,
  formatPageRange,
  formatPartLabel,
  getActivePart,
  getActiveSection,
} from "@/utils/reading";
import { estimateMinutes } from "@/utils/estimatePace";
import { useBookState, useBookPace } from "@/store/selectors";

interface TodayCardProps {
  book: Book;
}

// T-17: "오늘" 라벨·"목표" 문구 제거. 파트/섹션 라벨 + anchor 시간 문구.
// 시간 문구는 Pre-reading 원칙을 따라 anchor 용으로만 ("보통 이 분량은 N분 정도 걸려요").
export default function TodayCard({ book }: TodayCardProps) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;

  // EMA pace는 readingStore에서 책별로 관리 — Book 타입의 avgMinPerPage와 동기화해서 estimateMinutes에 전달.
  const pace = useBookPace(book.id);
  const bookWithPace: Book = pace != null ? { ...book, avgMinPerPage: pace } : book;

  // 오늘 읽을 활성 섹션 = 현재 페이지가 속한 섹션. 미시작(0p)이면 첫 섹션.
  const section = getActiveSection(book, currentPage || 1);
  const part = getActivePart(book, currentPage || 1);

  // 라벨에 섹션 전체 범위(1~28p)를 보여주므로 시간도 섹션 전체 기준이어야 일관됨.
  // (남은 페이지 기준으로 하면 "1~28p / 2분" 같은 불일치가 난다)
  const pagesToRead = Math.max(1, section.endPage - section.startPage + 1);
  const { min, anchor } = estimateMinutes(bookWithPace, pagesToRead);
  // 3회 미만(min === null)이면 anchor, 이상이면 EMA min. 두 경우 모두 같은 문구 템플릿.
  const minutes = min ?? anchor;

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
          marginBottom: 8,
          letterSpacing: "-0.3px",
        }}
      >
        {formatPartLabel(part.index)}
        <span style={{ margin: "0 8px", color: "#4A4A4A" }}>·</span>
        <span style={{ color: "#8A8A8A", fontWeight: 500 }}>
          {formatPageRange(section.startPage, section.endPage)}
        </span>
      </p>
      {/* 시간 문구는 anchor — 목표 시간 아님. "보통 이 분량은 N분 정도 걸려요" 고정 템플릿. */}
      <p
        style={{
          fontSize: 12,
          color: "#5A5A5A",
          marginBottom: 14,
          letterSpacing: "-0.3px",
        }}
      >
        보통 이 분량은 <span style={{ color: "#8A8A8A", fontWeight: 600 }}>{minutes}분</span> 정도 걸려요
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
