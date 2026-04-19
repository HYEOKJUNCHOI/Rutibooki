"use client";

import { Book } from "@/types/book";
import { useBookState } from "@/store/selectors";
import { calcProgress } from "@/utils/reading";

interface LibraryCardProps {
  book: Book;
  cover?: string;
  onClick: () => void;
}

// 서재 카드 — 작은 책 사이즈(약 64×86). 제목 띠지 + 뱃지 3종.
//
// 뱃지(#7, #18):
// - 좌상(넘패드 7): ⭐ 좋아요 / 📎 새 책(안 펼침) — ⭐ 우선
// - 상단 중앙(넘패드 8): "37%" 진행률 (진행 중일 때만)
// - 완독: 표지 자체를 흑백 + 돋움 돌 처리 (디아블로 퀘스트 완료 느낌). ⭐는 컬러 유지.
export default function LibraryCard({ book, cover, onClick }: LibraryCardProps) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;
  const progress = calcProgress(currentPage, book.totalPages);
  const isCompleted = currentPage >= book.totalPages && book.totalPages > 0;
  const isFresh = currentPage === 0;
  const isFavorite = state?.favorite === true;

  // 완독 = 흑백 + 약간 줄여서 뒤로 물러난 느낌 + 미묘한 초록 아우라(디아블로 완료 퀘스트).
  // hover/tap 시 컬러 되돌림으로 "잠깐 꺼내 본다" 감각.
  const completedImgFilter = "grayscale(1) contrast(0.9) brightness(0.82)";

  return (
    <button
      onClick={onClick}
      aria-label={book.title + (isCompleted ? " (완독)" : "") + (isFavorite ? " (좋아요)" : "")}
      style={{
        position: "relative",
        width: 64,
        height: 86,
        padding: 0,
        background: "#161616",
        border: isCompleted ? "1px solid #2A2A2A" : "1px solid #1A1A1A",
        borderRadius: 5,
        cursor: "pointer",
        overflow: "hidden",
        fontFamily: "inherit",
        flexShrink: 0,
        // 완독 책은 bevel(엠보싱) + 살짝 축소 + 초록 아우라.
        boxShadow: isCompleted
          ? [
              "inset 0 2px 3px rgba(255,255,255,0.08)", // 상단 하이라이트
              "inset 0 -3px 6px rgba(0,0,0,0.6)",      // 하단 깊이
              "0 6px 14px rgba(0,0,0,0.8)",            // 바닥 그림자
              "0 0 0 1px rgba(0,255,122,0.12)",        // 초록 아우라
            ].join(", ")
          : "0 2px 6px rgba(0,0,0,0.5)",
        transform: isCompleted ? "scale(0.96)" : undefined,
        transition: "transform 0.3s ease, filter 0.3s ease",
      }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            filter: isCompleted ? completedImgFilter : undefined,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            color: "#5A5A5A",
            padding: 4,
            lineHeight: 1.3,
            textAlign: "center",
            filter: isCompleted ? completedImgFilter : undefined,
          }}
        >
          {book.title.slice(0, 8)}
        </div>
      )}

      {/* 좌상 뱃지 (넘패드 7) — ⭐ 좋아요 > 📎 새 책 */}
      {(isFavorite || isFresh) && (
        <div
          style={{
            position: "absolute",
            top: 3,
            left: 3,
            fontSize: 11,
            lineHeight: 1,
            // 뱃지 자체는 컬러 유지 (완독 책 위의 ⭐도 살아있게).
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.9))",
          }}
        >
          {isFavorite ? "⭐" : "📎"}
        </div>
      )}

      {/* 상단 중앙 뱃지 (넘패드 8) — 진행률. 0%/100% 에서는 숨김. */}
      {progress > 0 && progress < 100 && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 8,
            fontWeight: 700,
            color: "#E8E8E8",
            background: "rgba(0,0,0,0.55)",
            padding: "1px 5px",
            borderRadius: 6,
            letterSpacing: "-0.3px",
            backdropFilter: "blur(2px)",
          }}
        >
          {progress}%
        </div>
      )}

      {/* 제목 띠지 — 하단 가로. 완독 책은 띠지도 같이 흑백(제목 톤다운). */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "3px 5px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%)",
          color: isCompleted ? "#9A9A9A" : "#F0F0F0",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "-0.2px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textShadow: "0 1px 2px rgba(0,0,0,0.9)",
          textAlign: "left",
        }}
      >
        {book.title}
      </div>
    </button>
  );
}
