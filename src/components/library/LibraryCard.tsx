"use client";

import { Book } from "@/types/book";
import { useBookState } from "@/store/selectors";
import { calcProgress } from "@/utils/reading";

interface LibraryCardProps {
  book: Book;
  cover?: string;
  onClick: () => void;
}

// 서재 카드 — 작은 책 사이즈(약 64×86). 제목은 표지 하단 띠지 오버레이.
// 진행도는 좌측 얇은 초록 막대로만 (숫자 X, 헌법 D).
export default function LibraryCard({ book, cover, onClick }: LibraryCardProps) {
  const state = useBookState(book.id);
  const progress = calcProgress(state?.currentPage ?? 0, book.totalPages);

  return (
    <button
      onClick={onClick}
      aria-label={book.title}
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
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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

      {/* 제목 띠지 — 하단 가로, 어두운 반투명 배경에 흰 글자 1줄 ellipsis */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "3px 5px",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%)",
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

      {/* 진행도 — 좌측 세로 얇은 초록 막대(숫자 없음) */}
      {progress > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: "#00FF7A",
            opacity: 0.9,
            transform: `scaleY(${progress / 100})`,
            transformOrigin: "top",
          }}
        />
      )}
    </button>
  );
}
