"use client";

import { useEffect, useState } from "react";
import { POST_READING_AUTO_HOME_MS } from "@/constants/reading";

// T-27: 고정 2줄, 3초 후 자동 홈.
// 변주/개인화 금지. 숫자·시간·격려 이모지 금지. 탭하면 즉시 홈.

interface DoneScreenProps {
  onHome: () => void;
}

export default function DoneScreen({ onHome }: DoneScreenProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const fadeIn = requestAnimationFrame(() => setOpacity(1));
    const home = window.setTimeout(onHome, POST_READING_AUTO_HOME_MS);
    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(home);
    };
  }, [onHome]);

  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="홈으로"
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: 32,
        textAlign: "center",
        opacity,
        transition: "opacity 600ms ease",
        border: "none",
        color: "inherit",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      <p
        style={{
          fontSize: 18,
          color: "#E8E8E8",
          fontWeight: 500,
          letterSpacing: "-0.4px",
          lineHeight: 1.7,
        }}
      >
        오늘도 책을 읽은 사람에 합류했어요.
        <br />
        <span style={{ color: "#8A8A8A" }}>조금이라도 괜찮아요.</span>
      </p>
    </button>
  );
}
