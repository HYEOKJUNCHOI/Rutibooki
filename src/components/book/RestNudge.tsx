"use client";

import { useEffect, useState } from "react";

interface RestNudgeProps {
  nudge: string;
  onClose: () => void;
}

export default function RestNudge({ nudge, onClose }: RestNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 마운트 직후 slideUp 애니메이션 트리거
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  return (
    <>
      {/* 딤 배경 */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 10,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          borderRadius: 40,
        }}
      />
      {/* 오버레이 패널 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 11,
          background: "#111",
          borderTop: "1px solid #1F1F1F",
          borderRadius: "0 0 40px 40px",
          padding: "28px 24px 36px",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      >
        {/* 핸들 바 */}
        <div
          style={{
            width: 36,
            height: 3,
            background: "#2A2A2A",
            borderRadius: 2,
            margin: "0 auto 20px",
          }}
        />

        {/* 훅멘트 */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#E8E8E8",
            lineHeight: 1.7,
            letterSpacing: "-0.3px",
            marginBottom: 24,
            whiteSpace: "pre-line",
          }}
        >
          {nudge}
        </p>

        {/* 버튼 두 개 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleClose}
            style={{
              width: "100%",
              background: "#00FF7A",
              color: "#000",
              border: "none",
              borderRadius: 12,
              padding: "15px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.3px",
            }}
          >
            좋아요, 읽을게요
          </button>
          <button
            onClick={handleClose}
            style={{
              width: "100%",
              background: "transparent",
              color: "#5A5A5A",
              border: "1px solid #2A2A2A",
              borderRadius: 12,
              padding: "15px",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.3px",
            }}
          >
            오늘은 쉴게요
          </button>
        </div>
      </div>
    </>
  );
}
