import { useReadingStore } from "@/store/readingStore";
import { Book } from "@/types/book";
import {
  calcDailyRange,
  getActivePart,
  getActiveSection,
} from "@/utils/reading";

// 자주 쓰는 파생값을 컴포넌트 간 재사용하기 위한 셀렉터 훅 모음.

// 책의 ReadingState를 구독.
export function useBookState(bookId: string) {
  return useReadingStore((s) => s.statesByBook[bookId]);
}

// 특정 책의 EMA pace (분/페이지). 3회 미만이면 undefined.
export function useBookPace(bookId: string) {
  return useReadingStore((s) => s.paceByBook[bookId]);
}

// 오늘 읽을 섹션 (pre-fill 기본값 = endPage).
export function useTodayTargetSection(book: Book) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;
  const section = getActiveSection(book, currentPage || 1);
  const part = getActivePart(book, currentPage || 1);
  const range = calcDailyRange(book, currentPage);
  return { section, part, range, currentPage };
}

// 히트맵용 날짜별 분 수 맵.
export function useLogsByDate(): Record<string, number> {
  return useReadingStore((s) => {
    const out: Record<string, number> = {};
    for (const log of s.logs) {
      out[log.date] = (out[log.date] ?? 0) + log.durationSec / 60;
    }
    return out;
  });
}

// 책의 누적 파트 진행도 (0~1). currentPage / totalPages 기반.
export function usePartProgress(book: Book) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;
  return {
    currentPartIndex: getActivePart(book, currentPage || 1).index,
    totalParts: book.parts.length,
    overallRatio: Math.min(1, Math.max(0, currentPage / book.totalPages)),
  };
}
