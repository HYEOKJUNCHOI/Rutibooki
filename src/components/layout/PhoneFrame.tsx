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
        minHeight: 720,
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
