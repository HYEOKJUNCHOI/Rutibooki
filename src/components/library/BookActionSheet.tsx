"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types/book";

// 서재 카드 길게눌러 뜨는 액션 시트.
// [2026-04-22] 삭제 외 기능(목차 재등록/바코드 메타 업데이트) 전부 제거 — 롱프레스는 삭제 전용.

interface Props {
  book: Book | null;
  onClose: () => void;
  onDelete: (book: Book) => Promise<void> | void;
}

export default function BookActionSheet({ book, onClose, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 시트가 닫히면 확인 상태 초기화 — 다음 번 열릴 때 바로 "삭제" 로 시작.
  useEffect(() => {
    if (!book) {
      setConfirmDelete(false);
      setDeleting(false);
    }
  }, [book]);

  if (!book) return null;

  const handleDelete = async () => {
    if (deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(book);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0E0E0E",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          border: "1px solid #1A1A1A",
          padding: "10px 12px 24px",
          animation: "sheet-rise 180ms ease-out",
        }}
      >
        {/* 상단 책 요약 — 누구를 지우려는지 혼동 방지. */}
        <div
          style={{
            padding: "12px 8px 14px",
            borderBottom: "1px solid #1A1A1A",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#5A5A5A",
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            선택된 책
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#E8E8E8",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {book.title}
          </div>
          {book.author && (
            <div
              style={{
                fontSize: 11,
                color: "#7A7A7A",
                marginTop: 2,
                letterSpacing: "-0.2px",
              }}
            >
              {book.author}
            </div>
          )}
        </div>

        <SheetButton
          label={
            deleting
              ? "삭제 중…"
              : confirmDelete
                ? "한 번 더 눌러 확정"
                : "삭제"
          }
          danger
          disabled={deleting}
          onClick={handleDelete}
        />
        <SheetButton label="취소" onClick={onClose} muted />
      </div>

      <style>{`
        @keyframes sheet-rise {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SheetButton({
  label,
  onClick,
  danger,
  muted,
  disabled,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  muted?: boolean;
  disabled?: boolean;
}) {
  const color = danger ? "#FF6E6E" : muted ? "#7A7A7A" : "#E8E8E8";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "14px 12px",
        background: "transparent",
        border: "none",
        color,
        fontSize: 15,
        fontWeight: danger ? 700 : 500,
        letterSpacing: "-0.3px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );
}
