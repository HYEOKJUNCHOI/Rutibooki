"use client";

import { useCallback, useRef, useState } from "react";
import { Book } from "@/types/book";
import { QuoteEntry, ReadingLog } from "@/types/reading";
import { crossesPartBoundary, getActivePart } from "@/utils/reading";

// Reading 플로우 phase 머신. /read/page.tsx에서 읽기 쉽게 분리.
// 전환 규칙:
//   pre → reading (3초 페이드 완료)
//   reading → post (사용자 long-press)
//   post → [partModal | transition] (확인 + 파트 경계 판정)
//   partModal → transition (확인)
//   transition → done (애니메이션 완료)
//   done → (외부에서 router.replace로 홈)

export type Phase =
  | "pre"
  | "reading"
  | "post"
  | "part-modal"
  | "transition"
  | "done";

interface UseReadingPhaseOpts {
  book: Book;
  startPage: number;
  commitLog: (log: ReadingLog) => void;
  addQuote: (entry: QuoteEntry) => void;
}

export function useReadingPhase({
  book,
  startPage,
  commitLog,
  addQuote,
}: UseReadingPhaseOpts) {
  const [phase, setPhase] = useState<Phase>("pre");
  const [endPage, setEndPage] = useState<number>(startPage);
  const [crossedPart, setCrossedPart] = useState(false);

  // Date.now()·new Date()는 순수 함수가 아니므로 useRef 초기화에서 제외.
  // reading phase 진입 시(goReading)에 비로소 값을 넣는다.
  const startedAtRef = useRef<string | null>(null);
  const startMsRef = useRef<number | null>(null);

  const goReading = useCallback(() => {
    // reading 실제 시작 시점으로 타이머 리셋 — pre의 3초는 durationSec에 포함하지 않는다.
    startedAtRef.current = new Date().toISOString();
    startMsRef.current = Date.now();
    setPhase("reading");
  }, []);

  const goPost = useCallback(() => setPhase("post"), []);

  const confirmEndPage = useCallback(
    (value: number) => {
      setEndPage(value);
      const crossed = crossesPartBoundary(book, startPage, value);
      setCrossedPart(crossed);

      const endedAt = new Date().toISOString();
      const nowMs = Date.now();
      const startMs = startMsRef.current ?? nowMs;
      const startedAt = startedAtRef.current ?? endedAt;
      const durationSec = Math.max(1, Math.round((nowMs - startMs) / 1000));
      const log: ReadingLog = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `log-${nowMs}`,
        bookId: book.id,
        date: localDate(new Date()),
        startedAt,
        endedAt,
        startPage,
        endPage: value,
        durationSec,
      };
      commitLog(log);

      setPhase(crossed ? "part-modal" : "transition");
    },
    [book, startPage, commitLog],
  );

  const confirmQuote = useCallback(
    (text: string) => {
      const targetPart = getActivePart(book, startPage).index;
      addQuote({
        bookId: book.id,
        partIndex: targetPart,
        createdAt: new Date().toISOString(),
        text,
      });
      setPhase("transition");
    },
    [book, startPage, addQuote],
  );

  const finishTransition = useCallback(() => setPhase("done"), []);

  return {
    phase,
    endPage,
    crossedPart,
    goReading,
    goPost,
    confirmEndPage,
    confirmQuote,
    finishTransition,
  };
}

function localDate(d: Date): string {
  // 로컬 타임존 기준 YYYY-MM-DD. 히트맵 키와 통일.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
