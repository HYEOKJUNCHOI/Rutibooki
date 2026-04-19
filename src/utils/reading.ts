import { Book, BookPart, BookSection } from "@/types/book";

const days = ["일", "월", "화", "수", "목", "금", "토"];

export function calcProgress(currentPage: number, totalPages: number): number {
  return Math.round((currentPage / totalPages) * 100);
}

export function formatDate(date: Date): string {
  const dayStr = days[date.getDay()];
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${dayStr} · ${month} · ${day}`;
}

// 요일 제외 — "04 · 18" 형태. 헤더에서 요일 라벨을 따로 강조할 때 사용.
export function formatDateShort(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month} · ${day}`;
}

export function getDayLabel(idx: number): string {
  return days[idx];
}

// === T-08, T-14: 페이지/파트 포맷 & 경계 판정 ===

// "12~28p" 형태. Pre-reading 및 오늘 분량 카드에서 공용.
export function formatPageRange(start: number, end: number): string {
  return `${start}~${end}p`;
}

// "파트 4" 형태. 파트 구분 라벨.
export function formatPartLabel(partIndex: number): string {
  return `파트 ${partIndex}`;
}

// 현재 페이지가 속한 파트를 반환. 범위 밖이면 마지막 파트로 폴백.
export function getActivePart(book: Book, currentPage: number): BookPart {
  const found = book.parts.find(
    (p) => currentPage >= p.startPage && currentPage <= p.endPage,
  );
  if (found) return found;
  // 0페이지(아직 시작 전)거나 마지막 초과 — 가장 가까운 파트로.
  if (currentPage < book.parts[0].startPage) return book.parts[0];
  return book.parts[book.parts.length - 1];
}

// 현재 페이지가 속한 섹션을 반환. pre-fill 기본값 계산에 씀.
export function getActiveSection(book: Book, currentPage: number): BookSection {
  const part = getActivePart(book, currentPage);
  const found = part.sections.find(
    (s) => currentPage >= s.startPage && currentPage <= s.endPage,
  );
  if (found) return found;
  if (currentPage < part.sections[0].startPage) return part.sections[0];
  return part.sections[part.sections.length - 1];
}

// 파트 경계를 넘었는가? PartCompletionModal 트리거 판정용.
// 기준: fromPage가 속한 파트의 index와 toPage가 속한 파트의 index가 다르면 true.
export function crossesPartBoundary(
  book: Book,
  fromPage: number,
  toPage: number,
): boolean {
  if (toPage <= fromPage) return false;
  const fromPart = getActivePart(book, fromPage);
  const toPart = getActivePart(book, toPage);
  return fromPart.index !== toPart.index;
}

// 오늘 읽을 기본 범위 = 현재 페이지가 속한 섹션의 [start, end].
// 유저가 아직 시작 전이라면 첫 섹션.
export function calcDailyRange(
  book: Book,
  currentPage: number,
): { start: number; end: number } {
  // 아직 첫 페이지 진입 전(currentPage === 0) — 첫 섹션을 오늘치로.
  if (currentPage <= 0) {
    const first = book.parts[0].sections[0];
    return { start: first.startPage, end: first.endPage };
  }
  const section = getActiveSection(book, currentPage);
  // 이미 해당 섹션 끝까지 읽은 상태 → 다음 섹션으로 넘겨줌.
  if (currentPage >= section.endPage) {
    const next = findNextSection(book, section);
    if (next) return { start: currentPage + 1, end: next.endPage };
    return { start: currentPage, end: book.totalPages };
  }
  return { start: currentPage + 1 > section.endPage ? section.startPage : currentPage + 1, end: section.endPage };
}

function findNextSection(book: Book, current: BookSection): BookSection | null {
  const flat = book.parts.flatMap((p) => p.sections);
  const idx = flat.findIndex(
    (s) => s.startPage === current.startPage && s.endPage === current.endPage,
  );
  if (idx === -1 || idx === flat.length - 1) return null;
  return flat[idx + 1];
}
