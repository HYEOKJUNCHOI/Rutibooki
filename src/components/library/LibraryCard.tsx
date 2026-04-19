"use client";

import { Book } from "@/types/book";
import { useBookState } from "@/store/selectors";
import { calcProgress } from "@/utils/reading";

interface LibraryCardProps {
  book: Book;
  cover?: string;
  onClick: () => void;
}

// 서재 카드 — 표지 썸네일 + 제목·저자 + 진행 바(숫자 없음, 회의록 D 헌법).
export default function LibraryCard({ book, cover, onClick }: LibraryCardProps) {
  const state = useBookState(book.id);
  const progress = calcProgress(state?.currentPage ?? 0, book.totalPages);

  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textAlign: "left",
      }}
    >
      {/* 표지 영역 — 3:4 비율, 없으면 플레이스홀더 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 4",
          background: "#0E0E0E",
          border: "1px solid #1A1A1A",
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cover ? (
          // Next/Image는 외부 도메인 설정 부담이 커서 MVP에선 <img>. 썸네일이라 퍼포먼스 영향 적음.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={book.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontSize: 10,
              color: "#3A3A3A",
              padding: "0 6px",
              textAlign: "center",
              letterSpacing: "-0.2px",
            }}
          >
            {book.title}
          </span>
        )}
      </div>

      {/* 제목 — 1줄 ellipsis */}
      <div
        style={{
          fontSize: 12,
          color: "#E8E8E8",
          fontWeight: 600,
          letterSpacing: "-0.3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {book.title}
      </div>

      {/* 진행 바 — 숫자 없음. 색 진하기로만 상태 표현(헌법 D). */}
      <div
        style={{
          width: "100%",
          height: 3,
          background: "#1A1A1A",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#00FF7A",
            opacity: progress > 0 ? 0.85 : 0,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </button>
  );
}
