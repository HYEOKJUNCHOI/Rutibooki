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
  // 책 고유 호칭(예: "나침반 1", "Chapter 3"). 없으면 "PART 01" 로 자동 생성.
  label?: string;
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
  // 목표 완독일 (ISO). 사용자가 설정하지 않았으면 undefined → UI 는 "—" 표시.
  goalDate?: string;
  // Gemini Vision 이 표지에서 추론한 장르(자기계발/경영/에세이/소설 등).
  // 목업 책은 비어있고, 사용자 등록 책에만 채워짐.
  genre?: string;
  // 알라딘 분류 리프. 예: "인지심리학". 서재 칩/그룹핑에 사용.
  // categoryName 의 맨 끝 세그먼트만 저장 — 상위 경로는 필요해지면 재파싱.
  category?: string;
  // 출판사 — FullJourney 시작 노드의 보조 메타. extract-cover 에서 같이 추출됨.
  publisher?: string;
  // 백그라운드 등록 파이프라인 상태. undefined = ready(모든 필드 확정), "extracting" = 아직 분석 중,
  // "failed" = 파이프라인 실패 — 서재에서 재시도 UI 노출 예정.
  status?: "extracting" | "failed";
  // 추출 파이프라인 현재 단계 라벨. "표지" | "검색" | "목차" 등 짧게. 완료 시 삭제.
  extractionStep?: string;
  // 추출 시작 시각(ISO). 나중에 목차 재등록 때 registeredAt(=원 등록일)로 계산하면
  // 이미 지난 시간이 커서 진행바가 즉시 90%로 튐 — 별도 타임스탬프로 갈라놓음.
  extractionStartedAt?: string;
}
