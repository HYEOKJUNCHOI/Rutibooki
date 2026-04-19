"use client";

import { useEffect, useState } from "react";

// T-24: 첫 Reading 진입 1회 코치마크.
// 3초 후 자동 페이드 아웃 — markCoachmarkShown()은 페이드 완료 후 호출해
// "깜빡 지나친 사용자"에게 다음 세션에서 다시 보여줄 여지를 남기지 않는다.

interface CoachMarkProps {
  text: string;
  onDismiss: () => void;
  visibleMs?: number;
}

export default function CoachMark({
  text,
  onDismiss,
  visibleMs = 3000,
}: CoachMarkProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // mount 직후 한 프레임 뒤에 페이드 인 (transition 발화)
    const fadeInId = requestAnimationFrame(() => setOpacity(1));
    const fadeOutId = window.setTimeout(() => setOpacity(0), visibleMs - 400);
    const dismissId = window.setTimeout(onDismiss, visibleMs);
    return () => {
      cancelAnimationFrame(fadeInId);
      clearTimeout(fadeOutId);
      clearTimeout(dismissId);
    };
  }, [visibleMs, onDismiss]);

  return (
    <div
      style={{
        position: "absolute",
        top: "32%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(20,20,20,0.86)",
        border: "1px solid #1F1F1F",
        borderRadius: 10,
        padding: "12px 16px",
        color: "#E8E8E8",
        fontSize: 13,
        letterSpacing: "-0.3px",
        textAlign: "center",
        maxWidth: 260,
        lineHeight: 1.5,
        opacity,
        transition: "opacity 400ms ease",
        pointerEvents: "none",
      }}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
