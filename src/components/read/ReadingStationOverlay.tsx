"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types/book";
import { getActivePart, getActiveSection } from "@/utils/reading";
import JourneyPath from "@/components/book/JourneyPath";

// T-22 터치 오버레이: 검정 화면 탭 시 잠깐 정류장을 보여주고 자동 사라짐.
// 읽는 중에는 "소제목(섹션)" 기준 여정 — 책 표지에서 보이는 "파트 여정" 보다 한 단계 잘게.
// 전체화면 배경은 fixed 이지만, 내용은 모바일 폭으로 제한(전체로 늘어지지 않도록).

interface ReadingStationOverlayProps {
  book: Book;
  currentPage: number;
  onAutoClose: () => void;
  autoCloseMs?: number;
}

export default function ReadingStationOverlay({
  book,
  currentPage,
  onAutoClose,
  autoCloseMs = 2500,
}: ReadingStationOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const part = getActivePart(book, currentPage || 1);
  const section = getActiveSection(book, currentPage || 1);

  // 현재 파트 안의 섹션만 정류장으로 — 한 파트 안의 진행을 보여주는 것이 맥락에 맞다.
  const sections = part.sections;
  const currentSectionIdx = Math.max(
    0,
    sections.findIndex(
      (s) => s.startPage === section.startPage && s.endPage === section.endPage,
    ),
  );

  useEffect(() => {
    const fadeIn = requestAnimationFrame(() => setOpacity(1));
    const fadeOut = window.setTimeout(
      () => setOpacity(0),
      autoCloseMs - 400,
    );
    const close = window.setTimeout(onAutoClose, autoCloseMs);
    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(fadeOut);
      clearTimeout(close);
    };
  }, [autoCloseMs, onAutoClose]);

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        // 모바일 폭 제한 — 데스크탑에서도 중앙에 좁게.
        width: "100%",
        maxWidth: 360,
        padding: "0 24px",
        opacity,
        transition: "opacity 400ms ease",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <p
        style={{
          fontSize: 11,
          color: "#9A9A9A",
          textAlign: "center",
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        {part.title}
      </p>
      <JourneyPath
        totalParts={sections.length}
        currentPart={currentSectionIdx + 1}
        labels={sections.map((s) => s.title)}
      />
    </div>
  );
}
