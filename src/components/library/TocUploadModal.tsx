"use client";

/* eslint-disable @next/next/no-img-element */
// 썸네일은 blob: URL 이라 next/image remotePatterns 불가 — <img> 유지.

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/types/book";

// 이미 등록된 책에 목차 사진 3장까지 덧붙이는 모달.
// iOS Safari 네이티브 피커가 번호 뱃지를 안 띄우는 환경(구 iOS·Android 등)을 위한
// 우리가 직접 그리는 "카톡식" 선택 스택 UI — 탭할 때마다 ①②③ 순으로 쌓임.

interface Picked {
  file: File;
  previewUrl: string;
}

interface Props {
  book: Book;
  onClose: () => void;
  onConfirm: (files: File[]) => Promise<void> | void;
}

const MAX = 3;

export default function TocUploadModal({ book, onClose, onConfirm }: Props) {
  const [items, setItems] = useState<Picked[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // 모달 닫힐 때 blob URL 정리 — 메모리 누수 방지.
  useEffect(() => {
    return () => {
      items.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFile = (file: File) => {
    setItems((prev) => {
      if (prev.length >= MAX) return prev;
      return [...prev, { file, previewUrl: URL.createObjectURL(file) }];
    });
  };

  const removeAt = (i: number) => {
    setItems((prev) => {
      const clone = [...prev];
      const [gone] = clone.splice(i, 1);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return clone;
    });
  };

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    // multiple 이 작동하는 환경에선 여러 장 한 번에, 단일만 되는 환경에선 한 장씩.
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    picked.forEach((f) => addFile(f));
  };

  const remaining = MAX - items.length;
  const canAdd = remaining > 0 && !submitting;
  const canSubmit = items.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(items.map((p) => p.file));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(3px)",
        zIndex: 1100,
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
          padding: "14px 14px 22px",
          animation: "sheet-rise 180ms ease-out",
        }}
      >
        {/* 헤더 — 책 제목 + 안내. */}
        <div
          style={{
            padding: "4px 4px 12px",
            borderBottom: "1px solid #1A1A1A",
            marginBottom: 12,
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
            목차 등록
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
          <div
            style={{
              fontSize: 11,
              color: "#7A7A7A",
              marginTop: 4,
              letterSpacing: "-0.2px",
            }}
          >
            탭할 때마다 ①②③ 순서대로 쌓여요 · 최대 {MAX}장
          </div>
        </div>

        {/* 썸네일 스택 — 선택된 순서대로만 표시. 비어있으면 안내 문구. */}
        {items.length === 0 ? (
          <div
            style={{
              padding: "28px 12px",
              textAlign: "center",
              color: "#4A4A4A",
              fontSize: 12,
              border: "1px dashed #1F1F1F",
              borderRadius: 10,
              background: "#0B0B0B",
              marginBottom: 14,
              letterSpacing: "-0.2px",
            }}
          >
            아래 + 버튼으로 목차 사진을 추가하세요
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {items.map((item, i) => (
              <div
                key={item.previewUrl}
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: 96,
                  aspectRatio: "3 / 4",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid #2A2A2A",
                  background: "#000",
                }}
              >
                <img
                  src={item.previewUrl}
                  alt={`목차 ${i + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {/* 순번 뱃지 — 카톡식 원형 번호 */}
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#00FF7A",
                    color: "#000",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  }}
                >
                  {i + 1}
                </div>
                {/* 제거 버튼 */}
                <button
                  onClick={() => removeAt(i)}
                  disabled={submitting}
                  aria-label={`${i + 1}번 사진 제거`}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)",
                    color: "#E8E8E8",
                    border: "none",
                    fontSize: 13,
                    lineHeight: 1,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* + 사진 추가 — 탭마다 한 장씩 네이티브 피커. 3장 되면 비활성. */}
        <button
          onClick={() => addInputRef.current?.click()}
          disabled={!canAdd}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: 10,
            background: canAdd ? "#1A1A1A" : "#0E0E0E",
            color: canAdd ? "#E8E8E8" : "#4A4A4A",
            border: "1px solid #2A2A2A",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: canAdd ? "pointer" : "not-allowed",
            letterSpacing: "-0.2px",
            fontFamily: "inherit",
          }}
        >
          {canAdd
            ? `+ 사진 추가 (${items.length}/${MAX})`
            : `${MAX}장 모두 추가됨`}
        </button>
        {/* multiple 도 허용 — 네이티브 피커가 번호 뱃지 지원하는 환경(iOS 14+)에선
            한 번에 여러 장 들어오게. 둘 다 같은 onChange 가 처리. */}
        <input
          ref={addInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAdd}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "12px",
              background: "transparent",
              border: "1px solid #2A2A2A",
              borderRadius: 10,
              color: "#9A9A9A",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 2,
              padding: "12px",
              background: canSubmit ? "#00FF7A" : "#1A1A1A",
              color: canSubmit ? "#000" : "#5A5A5A",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 800,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              letterSpacing: "-0.2px",
            }}
          >
            {submitting
              ? "추출 시작…"
              : items.length === 0
                ? "사진을 추가해주세요"
                : `${items.length}장으로 추출 시작`}
          </button>
        </div>
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
