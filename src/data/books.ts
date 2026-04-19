import { Book } from "@/types/book";

// 목업 데이터. MVP는 "한 권 모드" — books[0] 만 실질 진입, 나머지는 V2 서재용 예시.
// parts는 실제 목차 확보 전까지 균등 분할 플레이스홀더.

export const books: Book[] = [
  // === books[0]: MVP 메인 책 (실파트 예시) ===
  {
    id: "primitive",
    title: "완벽한 원시인",
    author: "자청",
    searchQuery: "완벽한 원시인 자청",
    totalPages: 312,
    registeredAt: "2026-04-10",
    parts: [
      {
        index: 1,
        title: "파트 1 · 원시의 기억",
        startPage: 1,
        endPage: 52,
        sections: [
          { title: "1장 · 사피엔스의 밤", startPage: 1, endPage: 28 },
          { title: "2장 · 불의 기원", startPage: 29, endPage: 52 },
        ],
      },
      {
        index: 2,
        title: "파트 2 · 몸이 먼저다",
        startPage: 53,
        endPage: 108,
        sections: [
          { title: "3장 · 걷는 동물", startPage: 53, endPage: 78 },
          { title: "4장 · 농경이 낳은 불안", startPage: 79, endPage: 108 },
        ],
      },
      {
        index: 3,
        title: "파트 3 · 단절의 시대",
        startPage: 109,
        endPage: 164,
        sections: [
          { title: "5장 · 도시의 침입", startPage: 109, endPage: 136 },
          { title: "6장 · 연결의 과잉", startPage: 137, endPage: 164 },
        ],
      },
      {
        index: 4,
        title: "파트 4 · 작은 복원",
        startPage: 165,
        endPage: 220,
        sections: [
          { title: "7장 · 햇빛과 수면", startPage: 165, endPage: 192 },
          { title: "8장 · 음식과 관계", startPage: 193, endPage: 220 },
        ],
      },
      {
        index: 5,
        title: "파트 5 · 다시 원시인",
        startPage: 221,
        endPage: 312,
        sections: [
          { title: "9장 · 도구의 선택", startPage: 221, endPage: 266 },
          { title: "10장 · 충분한 하루", startPage: 267, endPage: 312 },
        ],
      },
    ],
  },

  // === V2 서재용 예시 (MVP 스코프 밖 — 등록/서재 기능 붙을 때 재사용) ===
  {
    id: "immutable",
    title: "불변의 법칙",
    author: "Morgan Housel",
    searchQuery: "불변의 법칙 모건 하우절",
    totalPages: 231,
    registeredAt: "2026-04-10",
    parts: placeholderParts(231, 5),
  },
  {
    id: "money-equation",
    title: "돈의 방정식",
    author: "Morgan Housel",
    searchQuery: "돈의 방정식 모건 하우절",
    totalPages: 198,
    registeredAt: "2026-04-10",
    parts: placeholderParts(198, 4),
  },
  {
    id: "money-talk",
    title: "혹시, 돈 얘기해도 될까요?",
    author: "주언규",
    searchQuery: "혹시 돈 얘기해도 될까요 주언규",
    totalPages: 256,
    registeredAt: "2026-04-10",
    parts: placeholderParts(256, 6),
  },
  {
    id: "hooked",
    title: "훅",
    author: "니르 이얄",
    searchQuery: "훅 니르 이얄 습관",
    totalPages: 288,
    registeredAt: "2026-04-10",
    parts: placeholderParts(288, 5),
  },
  {
    id: "system",
    title: "더 시스템",
    author: "Scott Adams",
    searchQuery: "더 시스템 스콧애덤스",
    totalPages: 368,
    registeredAt: "2026-04-10",
    parts: placeholderParts(368, 7),
  },
  {
    id: "gratitude",
    title: "감사하는 뇌가 인생을 바꾼다",
    author: "가바사와 시온",
    searchQuery: "감사하는 뇌가 인생을 바꾼다",
    totalPages: 224,
    registeredAt: "2026-04-10",
    parts: placeholderParts(224, 5),
  },
];

// 실제 목차 확보 전까지 쓰는 균등 분할. 파트당 섹션 2개.
// 실 데이터가 들어오면 이 함수로 만들어진 값은 T-36 검수 화면에서 덮어써짐.
function placeholderParts(totalPages: number, partCount: number) {
  const per = Math.ceil(totalPages / partCount);
  const parts = [];
  for (let i = 0; i < partCount; i++) {
    const start = i * per + 1;
    const end = Math.min((i + 1) * per, totalPages);
    const mid = Math.floor((start + end) / 2);
    parts.push({
      index: i + 1,
      title: `파트 ${i + 1}`,
      startPage: start,
      endPage: end,
      sections: [
        { title: `${i * 2 + 1}장`, startPage: start, endPage: mid },
        { title: `${i * 2 + 2}장`, startPage: mid + 1, endPage: end },
      ],
    });
  }
  return parts;
}
