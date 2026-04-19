"use client";

import { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div
      style={{
        width: 375,
        // 800px로 올린 이유: 헤더48 + 표지240 + TodayCard106 + CurvyJourney234 + CTA57 + padding76 ≈ 761 → 여유 포함 800
        minHeight: 800,
        background: "#0A0A0A",
        borderRadius: 40,
        border: "1px solid #1F1F1F",
        padding: "48px 24px 28px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
