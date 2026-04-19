import { Book } from "@/types/book";
import { DEFAULT_MIN_PER_PAGE } from "@/constants/reading";

// Pre-reading 문구 ("보통 이 분량은 N분 정도 걸려요") 전용 계산.
// 목표 시간 노출 금지 — anchor 로만 쓰인다.
export function estimateMinutes(
  book: Book,
  pagesToRead: number,
): { min: number | null; anchor: number } {
  const safePages = Math.max(1, pagesToRead);
  const anchor = Math.max(1, Math.round(safePages * DEFAULT_MIN_PER_PAGE));
  // 3회 미만이면 avgMinPerPage === undefined → min은 null. 사용처에서 anchor로 대체.
  if (book.avgMinPerPage == null) return { min: null, anchor };
  const min = Math.max(1, Math.round(safePages * book.avgMinPerPage));
  return { min, anchor };
}
