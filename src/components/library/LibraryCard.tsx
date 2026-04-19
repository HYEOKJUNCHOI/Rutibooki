"use client";

import { Book } from "@/types/book";
import { useBookState } from "@/store/selectors";
import { calcProgress } from "@/utils/reading";

interface LibraryCardProps {
  book: Book;
  cover?: string;
  onClick: () => void;
}

// 서재 카드 — 작은 책 사이즈(약 64×86). 제목 띠지 + 뱃지 2종.
//
// 뱃지(#7, #18):
// - 좌상(넘패드 7): ⭐ 좋아요 / 📎 새 책(안 펼침) — ⭐ 우선
// - 상단 중앙(넘패드 8): "37%" 진행률 (진행 중일 때만)
export default function LibraryCard({ book, cover, onClick }: LibraryCardProps) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;
  const progress = calcProgress(currentPage, book.totalPages);
  const isFresh = currentPage === 0;
  const isFavorite = state?.favorite === true;

  return (
    <button
      onClick={onClick}
      aria-label={book.title + (isFavorite ? " (좋아요)" : "")}
      style={{
        position: "relative",
        width: 64,
        height: 86,
        padding: 0,
        background: "#161616",
        border: "1px solid #1A1A1A",
        borderRadius: 5,
        cursor: "pointer",
        overflow: "hidden",
        fontFamily: "inherit",
        flexShrink: 0,
        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
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

      {/* 제목 띠지 — 하단 가로. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "3px 5px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%)",
          color: "#F0F0F0",
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
