"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types/book";
import { getActivePart, formatPartLabel } from "@/utils/reading";
import JourneyPath from "@/components/book/JourneyPath";

// T-22 터치 오버레이: 검정 화면 탭 시 잠깐 정류장을 보여주고 자동 사라짐.
// 애니메이션 없이 조용히 — "읽는 중"임을 방해하지 않는 잠깐의 확인용.

interface ReadingStationOverlayProps {
  book: Book;
  currentPage: number;
  // 3초 후 스스로 닫힘. 부모는 setStationOpen(false)만 처리.
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
        left: 0,
        right: 0,
        transform: "translateY(-50%)",
        padding: "0 24px",
        opacity,
        transition: "opacity 400ms ease",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <p
        style={{
          fontSize: 12,
          color: "#5A5A5A",
          textAlign: "center",
          letterSpacing: "-0.3px",
          marginBottom: 12,
        }}
      >
        {formatPartLabel(part.index)}
      </p>
      <JourneyPath
        totalParts={book.parts.length}
        currentPart={part.index}
      />
    </div>
  );
}
