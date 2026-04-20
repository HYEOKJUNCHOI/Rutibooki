"use client";

import { useState } from "react";
import RegisterSlot, { SlotStatus } from "@/components/register/RegisterSlot";
import type { Book } from "@/types/book";

// 이미 등록된 책에 목차 사진 3장까지 덧붙이는 모달.
// 등록 페이지와 동일한 RegisterSlot 을 재사용 — 사용자 입장에서 UI 일관성 유지.

interface SlotState {
  file: File;
  previewUrl: string;
  status: SlotStatus;
}

interface Props {
  book: Book;
  onClose: () => void;
  onConfirm: (files: File[]) => Promise<void> | void;
}

export default function TocUploadModal({ book, onClose, onConfirm }: Props) {
  const [slots, setSlots] = useState<Record<number, SlotState | null>>({
    0: null,
    1: null,
    2: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const setSlot = (i: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setSlots((prev) => {
      const old = prev[i];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return { ...prev, [i]: { file, previewUrl, status: "done" } };
    });
  };

  const clearSlot = (i: number) => {
    setSlots((prev) => {
      const old = prev[i];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return { ...prev, [i]: null };
    });
  };

  const files = [slots[0], slots[1], slots[2]]
    .filter((s): s is SlotState => !!s)
    .map((s) => s.file);
  const canSubmit = files.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(files);
      // 부모가 onClose 호출하도록 위임 — 추출 시작 후 모달 닫기 타이밍을 부모가 결정.
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
            사진은 최대 3장 — 목차가 이어지도록 순서대로.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[0, 1, 2].map((i) => {
            const slot = slots[i];
            return (
              <RegisterSlot
                key={i}
                label={`목차 ${i + 1}`}
                previewUrl={slot?.previewUrl ?? null}
                status={slot?.status ?? "idle"}
                onPick={(file) => setSlot(i, file)}
                onClear={slot ? () => clearSlot(i) : undefined}
              />
            );
          })}
        </div>

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
              : files.length === 0
                ? "사진을 추가해주세요"
                : `${files.length}장으로 추출 시작`}
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
