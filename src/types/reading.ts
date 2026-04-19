// 런타임 읽기 상태 · 세션 로그 · 인용 타입.
// 책별 1개의 ReadingState, 세션마다 1개의 ReadingLog, 파트 경계마다 0~1개의 QuoteEntry.

export interface ReadingState {
  bookId: string;
  currentPage: number;
  // 오늘 읽고 있는 파트/섹션 인덱스 (pre-fill 계산용).
  activePartIndex: number;
  activeSectionIndex: number;
  lastOpenedAt: string; // ISO
  // "좋았던 책" — 추천용 서재 진입점. 완독 여부와 무관하게 토글.
  // (#18) 초기값 false/undefined. Firestore 는 users/{uid}/readingState/{bookId}.favorite 로 저장.
  favorite?: boolean;
}

export interface ReadingLog {
  id: string; // uuid
  bookId: string;
  date: string; // YYYY-MM-DD (로컬)
  startedAt: string; // ISO
  endedAt: string;
  startPage: number;
  endPage: number;
  // Reading 화면에 머문 실제 시간 — 히트맵 색 진하기 계산 재료. 사용자에겐 노출 금지.
  durationSec: number;
}

export interface QuoteEntry {
  bookId: string;
  partIndex: number;
  createdAt: string;
  // 빈 문자열 허용 — 회고 시 "비움의 기록"으로도 의미가 있음
  text: string;
}
