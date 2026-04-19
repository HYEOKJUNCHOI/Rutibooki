// 파트·섹션 구조를 담는 Book 타입.
// 기존의 chapter/minutes/currentPage/nudge 는 ReadingState/ReadingLog/nudges 데이터로 이전됨.

export interface BookSection {
  // 파트 안의 소 단위 ("장"). pre-fill의 기본값은 오늘 section 끝 페이지.
  title: string;
  startPage: number;
  endPage: number;
}

export interface BookPart {
  // Maryanne Wolf가 말한 "episodic boundary" — 파트 경계에서 인용 모달 트리거.
  index: number; // 1-based
  title: string;
  startPage: number;
  endPage: number;
  sections: BookSection[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  searchQuery: string;
  // 네이버 API 결과를 사전 캐시할 수 있도록 허용 (등록 시 자동 채움)
  coverUrl?: string;
  totalPages: number;
  parts: BookPart[];
  // EMA 결과 — 3회 미만이면 undefined (예측 시간 숨김)
  avgMinPerPage?: number;
  // 등록일 (ISO)
  registeredAt: string;
}
