"use client";

import { useEffect, useState } from "react";

// T-29: 파트 경계를 넘은 세션 직후 등장. "한 문장 (선택)".
// 빈 값도 허용 — 회고 시 "비움의 기록"도 데이터. 설득/스킵 버튼 없음, 확인 하나만.

interface PartCompletionModalProps {
  partIndex: number;
  onConfirm: (text: string) => void;
}

export default function PartCompletionModal({
  partIndex,
  onConfirm,
}: PartCompletionModalProps) {
  const [opacity, setOpacity] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`파트 ${partIndex} 완료`}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 32,
        opacity,
        transition: "opacity 300ms ease",
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: "#5A5A5A",
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        파트 {partIndex} 완료
      </p>
      <p
        style={{
          fontSize: 17,
          color: "#E8E8E8",
          fontWeight: 600,
          letterSpacing: "-0.4px",
          marginBottom: 20,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        이 파트에서 남기고 싶은
        <br />
        한 문장 <span style={{ color: "#8A8A8A", fontWeight: 400 }}>(선택)</span>
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        aria-label="한 문장"
        style={{
          width: "100%",
          maxWidth: 320,
          background: "#0E0E0E",
          border: "1px solid #1F1F1F",
          borderRadius: 12,
          padding: "12px 14px",
          color: "#E8E8E8",
          fontSize: 14,
          lineHeight: 1.6,
          letterSpacing: "-0.3px",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          marginBottom: 20,
        }}
      />

      <button
        type="button"
        onClick={() => onConfirm(text.trim())}
        aria-label="확인"
        style={{
          width: "100%",
          maxWidth: 320,
          background: "#00FF7A",
          color: "#000",
          border: "none",
          borderRadius: 14,
          padding: "16px",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.3px",
        }}
      >
        확인
      </button>
    </div>
  );
}
