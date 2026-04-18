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
