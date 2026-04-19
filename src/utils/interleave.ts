// (#9) 책 선택 모드 — 요일 반복 + 인터리빙.
// "오늘 어떤 책을 읽을지" 결정하는 순수 함수.
//
// 규칙:
// 1) ReadingState.weekdays 가 비어있거나 undefined 인 책은 "매일" 로 간주.
// 2) 오늘 요일(todayDow, 0=일~6=토) 에 매칭되는 책만 후보.
// 3) 후보가 있으면 lastOpenedAt 오래된 순(덜 최근에 읽은 책 우선) 으로 정렬.
// 4) 후보가 없으면(= 아무 책도 오늘 요일에 걸리지 않음) fallback 으로 매일 책 목록 반환.
//    매일 책도 없으면 전체 책을 lastOpenedAt 오래된 순으로 반환 — 서재가 빈 상태를 최소화.

import type { Book } from "@/types/book";
import type { ReadingState } from "@/types/reading";

export function isBookForToday(
  state: ReadingState | undefined,
  todayDow: number,
): boolean {
  const wd = state?.weekdays;
  // 빈 배열 / undefined → 매일.
  if (!wd || wd.length === 0) return true;
  return wd.includes(todayDow);
}

// lastOpenedAt 오래된 순 비교 — 미열람("")은 매우 오래된 것으로 간주해 최우선.
function byLeastRecent(
  a: Book,
  b: Book,
  states: Record<string, ReadingState>,
): number {
  const la = states[a.id]?.lastOpenedAt ?? "";
  const lb = states[b.id]?.lastOpenedAt ?? "";
  // 빈 문자열은 "오래된" 쪽으로 — 오름차순.
  return la.localeCompare(lb);
}

// 오늘 읽을 책 목록(우선순위 정렬). 홈에서 이 중 첫 책을 TodayCard 로 노출.
export function pickBooksForToday(
  books: Book[],
  states: Record<string, ReadingState>,
  todayDow: number,
): Book[] {
  const matched = books.filter((b) => isBookForToday(states[b.id], todayDow));
  if (matched.length > 0) {
    return [...matched].sort((a, b) => byLeastRecent(a, b, states));
  }
  // fallback: 매일 책만
  const daily = books.filter((b) => {
    const wd = states[b.id]?.weekdays;
    return !wd || wd.length === 0;
  });
  if (daily.length > 0) {
    return [...daily].sort((a, b) => byLeastRecent(a, b, states));
  }
  // 최후 fallback: 전체
  return [...books].sort((a, b) => byLeastRecent(a, b, states));
}
