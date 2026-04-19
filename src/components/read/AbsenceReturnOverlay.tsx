"use client";

import { useEffect, useState } from "react";
import { Book } from "@/types/book";
import { useLongPress } from "@/hooks/useLongPress";
import { getActivePart, getActiveSection } from "@/utils/reading";
import JourneyPath from "@/components/book/JourneyPath";
import LongPressRing from "./LongPressRing";

// T-30: 딴짓 후 복귀 시 Reading 위에 겹치는 오버레이.
// - [계속 읽기] 초록 — 즉시 탭 (부담 없이 복귀)
// - [오늘은 그만] 빨강 테두리 — long-press 0.8초 (심리적 약한 브레이크)
// 비난 금지, 자동 닫힘 없음. 사용자가 고를 때까지 조용히 기다린다.

interface AbsenceReturnOverlayProps {
  book: Book;
  currentPage: number;
  onContinue: () => void;
  onStopToday: () => void;
}

export default function AbsenceReturnOverlay({
  book,
  currentPage,
  onContinue,
  onStopToday,
}: AbsenceReturnOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const part = getActivePart(book, currentPage || 1);
  const section = getActiveSection(book, currentPage || 1);
  const sections = part.sections;
  // 현재 파트 안의 섹션 진행 — 읽는 중에는 소제목 기준이 더 와닿는다.
  const currentSectionIdx = Math.max(
    0,
    sections.findIndex(
      (s) => s.startPage === section.startPage && s.endPage === section.endPage,
    ),
  );
  const stopLong = useLongPress(onStopToday, { haptic: true });

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="딴짓 복귀"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,5,5,0.96)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 75,
        padding: 32,
        opacity,
        transition: "opacity 300ms ease",
      }}
    >
      {/* 정류장 — 현재 위치만 조용히 pulse(JourneyPath 자체 처리). 추가 애니메이션 없음. */}
      <div style={{ width: "100%", maxWidth: 320, marginBottom: 20 }}>
        <p
          style={{
            fontSize: 12,
            color: "#9A9A9A",
            textAlign: "center",
            letterSpacing: "-0.3px",
            marginBottom: 8,
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

      <p
        style={{
          fontSize: 18,
          color: "#E8E8E8",
          fontWeight: 600,
          letterSpacing: "-0.4px",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        잠깐 다녀오셨네요 📖
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          width: "100%",
          maxWidth: 320,
        }}
      >
        <button
          type="button"
          onClick={onContinue}
          aria-label="계속 읽기"
          style={{
            flex: 1,
            background: "#00FF7A",
            color: "#000",
            border: "none",
            borderRadius: 14,
            padding: "16px 12px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.3px",
          }}
        >
          계속 읽기
        </button>

        <button
          type="button"
          onMouseDown={stopLong.handlers.onMouseDown}
          onMouseUp={stopLong.handlers.onMouseUp}
          onMouseLeave={stopLong.handlers.onMouseLeave}
          onTouchStart={stopLong.handlers.onTouchStart}
          onTouchEnd={stopLong.handlers.onTouchEnd}
          onTouchCancel={stopLong.handlers.onTouchCancel}
          aria-label="오늘은 그만 (길게 누르기)"
          style={{
            flex: 1,
            position: "relative",
            background: "#0E0E0E",
            color: "#E8E8E8",
            border: "1px solid #FF4A4A",
            borderRadius: 14,
            padding: "16px 12px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.3px",
            overflow: "hidden",
            // long-press 진행도를 배경 fill로 보여줌 — 빨강 대신 초록(완료 신호)
            backgroundImage: `linear-gradient(to right, rgba(0,255,122,0.18) ${
              stopLong.progress * 100
            }%, transparent ${stopLong.progress * 100}%)`,
          }}
        >
          오늘은 그만
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <LongPressRing progress={stopLong.progress} size={22} />
          </span>
        </button>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "#3A3A3A",
          letterSpacing: "-0.3px",
          marginTop: 14,
        }}
      >
        그만둘 땐 길게 눌러 주세요
      </p>
    </div>
  );
}
