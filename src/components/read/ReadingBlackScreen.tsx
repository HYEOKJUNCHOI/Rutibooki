"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Book } from "@/types/book";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useLongPress } from "@/hooks/useLongPress";
import { AUTOSAVE_INTERVAL_MS } from "@/constants/reading";
import { useReadingStore } from "@/store/readingStore";
import LongPressRing from "./LongPressRing";
import CoachMark from "./CoachMark";
import ReadingStationOverlay from "./ReadingStationOverlay";

// T-22: 완전 검정 Reading 화면. Wake Lock + 터치 시 정류장 + long-press 종료.
// 시간·페이지·진행도 일절 노출 금지. 오직 책 읽는 사람과 검정 화면만.

interface ReadingBlackScreenProps {
  book: Book;
  startPage: number;
  startedAt: string; // ISO
  onFinish: () => void;
}

export default function ReadingBlackScreen({
  book,
  startPage,
  startedAt,
  onFinish,
}: ReadingBlackScreenProps) {
  useWakeLock(true);

  const coachmarkShown = useReadingStore((s) => s.coachmarkShown);
  const markCoachmarkShown = useReadingStore((s) => s.markCoachmarkShown);
  const saveDraft = useReadingStore((s) => s.saveDraft);

  const [stationOpen, setStationOpen] = useState(false);
  const [coachVisible, setCoachVisible] = useState(!coachmarkShown);
  // Date.now()는 render 중 impure — effect 안에서 초기화.
  const startMsRef = useRef<number | null>(null);

  // Long-press 완료 → onFinish. 터치 토글은 tap으로만 처리(아래 onClick).
  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  const long = useLongPress(handleFinish, { haptic: true });

  // 2분 자동 스냅샷 — Wake Lock 실패 케이스 안전망.
  // 실제 commitLog는 PostReadingInput에서. 여기선 "어디까지 읽었다고 추정되는지"만 저장.
  useEffect(() => {
    startMsRef.current = Date.now();
    const id = window.setInterval(() => {
      const base = startMsRef.current ?? Date.now();
      const elapsedSec = Math.round((Date.now() - base) / 1000);
      saveDraft({ bookId: book.id, startedAt, startPage, elapsedSec });
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [book.id, startedAt, startPage, saveDraft]);

  // 탭 = 정류장 토글. long-press 중에는 토글되지 않도록 progress 체크.
  // (long-press는 pointerdown부터 시작되므로, mouseup에서 progress가 클 땐 발화됐거나 취소 직후)
  const handleClick = () => {
    // long-press가 실제 완료된 뒤에는 handleFinish가 이미 호출되어 언마운트됨.
    // 여기서는 짧은 탭만 통과.
    if (long.progress > 0.1) return;
    setStationOpen((v) => !v);
  };

  return (
    <div
      onClick={handleClick}
      onMouseDown={long.handlers.onMouseDown}
      onMouseUp={long.handlers.onMouseUp}
      onMouseLeave={long.handlers.onMouseLeave}
      onTouchStart={long.handlers.onTouchStart}
      onTouchEnd={long.handlers.onTouchEnd}
      onTouchCancel={long.handlers.onTouchCancel}
      role="button"
      aria-label="읽는 중. 길게 눌러 종료."
      tabIndex={0}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 60,
        // 잘못 선택되어 텍스트 하이라이트 뜨는 것 방지
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
        cursor: "default",
      }}
    >
      {stationOpen && (
        <ReadingStationOverlay
          book={book}
          currentPage={startPage}
          onAutoClose={() => setStationOpen(false)}
        />
      )}

      {/* 코치마크 — 첫 세션 1회만 */}
      {coachVisible && (
        <CoachMark
          text="화면이 어두워져요. 다 읽으면 꾸욱 눌러 종료."
          onDismiss={() => {
            setCoachVisible(false);
            markCoachmarkShown();
          }}
        />
      )}

      {/* Long-press 링 — 화면 중앙 하단. 시간 숫자 없이 원만. */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      >
        <LongPressRing progress={long.progress} />
      </div>
    </div>
  );
}
