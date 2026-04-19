"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types/book";
import {
  formatPageRange,
  formatPartLabel,
  getActivePart,
  getActiveSection,
} from "@/utils/reading";
import { estimateMinutes } from "@/utils/estimatePace";

// T-21: Reading 진입 전 3초 페이드. "파트 N · start~endp · 보통 이 분량은 X분 정도 걸려요"
// Pre-reading에서만 시간을 노출하고, 이후 단계에선 숨긴다.

interface PreReadingPhaseProps {
  book: Book;
  startPage: number; // 세션 시작 페이지 (currentPage)
  pace?: number; // EMA pace, 3회 미만이면 undefined
  onDone: () => void;
  durationMs?: number;
}

export default function PreReadingPhase({
  book,
  startPage,
  pace,
  onDone,
  durationMs = 3000,
}: PreReadingPhaseProps) {
  const [opacity, setOpacity] = useState(0);

  // pace가 있으면 Book에 주입해 estimateMinutes가 EMA 쓰도록.
  const bookWithPace: Book =
    pace != null ? { ...book, avgMinPerPage: pace } : book;

  const part = getActivePart(book, startPage || 1);
  const section = getActiveSection(book, startPage || 1);
  const pagesToRead = Math.max(
    1,
    section.endPage - (startPage > 0 ? startPage : section.startPage - 1),
  );
  const { min, anchor } = estimateMinutes(bookWithPace, pagesToRead);
  const minutes = min ?? anchor;

  useEffect(() => {
    // 첫 프레임에 페이드 인 → 마지막 400ms 페이드 아웃 → 그 후 onDone.
    const fadeIn = requestAnimationFrame(() => setOpacity(1));
    const fadeOut = window.setTimeout(() => setOpacity(0), durationMs - 400);
    const done = window.setTimeout(onDone, durationMs);
    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(fadeOut);
      clearTimeout(done);
    };
  }, [durationMs, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transition: "opacity 500ms ease",
        zIndex: 50,
        padding: 32,
        textAlign: "center",
      }}
      role="status"
      aria-live="polite"
    >
      <p
        style={{
          fontSize: 15,
          color: "#8A8A8A",
          letterSpacing: "-0.3px",
          marginBottom: 8,
        }}
      >
        {formatPartLabel(part.index)}
      </p>
      <p
        style={{
          fontSize: 34,
          color: "#E8E8E8",
          fontWeight: 700,
          letterSpacing: "-1px",
          marginBottom: 28,
        }}
      >
        {formatPageRange(section.startPage, section.endPage)}
      </p>
      <p
        style={{
          fontSize: 13,
          color: "#5A5A5A",
          letterSpacing: "-0.3px",
        }}
      >
        보통 이 분량은{" "}
        <span style={{ color: "#8A8A8A", fontWeight: 600 }}>{minutes}분</span>{" "}
        정도 걸려요
      </p>
    </div>
  );
}
