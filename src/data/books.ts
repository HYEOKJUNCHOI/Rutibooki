import { Book } from "@/types/book";

// 목업 데이터. MVP는 "한 권 모드" — books[0] 만 실질 진입, 나머지는 V2 서재용 예시.
// parts는 실제 목차 확보 전까지 균등 분할 플레이스홀더.

export const books: Book[] = [
  // === books[0]: MVP 메인 책 (실파트 예시) ===
  // 실제 목차 기준 — START / LEVEL 0~4 / ERROR / END 의 8 파트 구조.
  // 프롤로그(8)·들어가며(16) 는 파트 1 범위에 흡수, 에필로그(444)·참고자료(452) 는 END 에 흡수.
  {
    id: "primitive",
    title: "완벽한 원시인",
    author: "자청",
    publisher: "웅진지식하우스",
    searchQuery: "완벽한 원시인 자청",
    totalPages: 460,
    registeredAt: "2026-04-10",
    parts: [
      {
        index: 1,
        title: "START · 진단 — 우리는 왜 고장 났는가",
        startPage: 1,
        endPage: 100,
        sections: [
          { title: "프롤로그 · 동굴에서 누른 첫 번째 버튼", startPage: 1, endPage: 26 },
          { title: "당신의 출발점, 두 개의 아침", startPage: 27, endPage: 40 },
          { title: "0.012초의 벽", startPage: 41, endPage: 50 },
          { title: "움직임의 배신", startPage: 51, endPage: 62 },
          { title: "도파민 파산", startPage: 63, endPage: 78 },
          { title: "음식의 배신", startPage: 79, endPage: 100 },
        ],
      },
      {
        index: 2,
        title: "LEVEL 0 · 생존 — 고장 난 엔진을 다시 켜는 법",
        startPage: 101,
        endPage: 139,
        sections: [
          { title: "BUTTON 1 · 밤늦게 찾아오는 청소부, 수면", startPage: 101, endPage: 116 },
          { title: "BUTTON 2 · 가장 값싼 최고급 연료, 물", startPage: 117, endPage: 126 },
          { title: "BUTTON 3 · 5초의 마법, 호흡", startPage: 127, endPage: 139 },
        ],
      },
      {
        index: 3,
        title: "LEVEL 1 · 항상성 — 뇌가 다시 움직이기 시작했다",
        startPage: 140,
        endPage: 197,
        sections: [
          { title: "BUTTON 4 · 생체 시계의 지배자, 햇빛", startPage: 140, endPage: 152 },
          { title: "BUTTON 5 · 원시인 모드의 핵심, 걷기", startPage: 153, endPage: 167 },
          { title: "BUTTON 6 · 영양의 본질", startPage: 168, endPage: 197 },
        ],
      },
      {
        index: 4,
        title: "LEVEL 2 · 성장 — 원시인의 야생성을 되찾는 법",
        startPage: 198,
        endPage: 240,
        sections: [
          { title: "BUTTON 7 · 의도된 불편함", startPage: 198, endPage: 209 },
          { title: "BUTTON 8 · 근력 운동", startPage: 210, endPage: 222 },
          { title: "BUTTON 9 · 고강도 운동", startPage: 223, endPage: 240 },
        ],
      },
      {
        index: 5,
        title: "LEVEL 3 · 연결 — 원시인은 혼자가 아니었다",
        startPage: 241,
        endPage: 283,
        sections: [
          { title: "BUTTON 10 · 부족의 탄생", startPage: 241, endPage: 250 },
          { title: "BUTTON 11 · 연결의 화학작용, 대면", startPage: 251, endPage: 260 },
          { title: "BUTTON 12 · 너무나 이기적인, 기여", startPage: 261, endPage: 269 },
          { title: "BUTTON 13 · 섹스", startPage: 270, endPage: 283 },
        ],
      },
      {
        index: 6,
        title: "LEVEL 4 · 초월 — 정렬된 뇌는 몰입으로 도약한다",
        startPage: 284,
        endPage: 321,
        sections: [
          { title: "BUTTON 14 · 탈집중", startPage: 284, endPage: 295 },
          { title: "BUTTON 15 · 최고의 보상, 몰입", startPage: 296, endPage: 321 },
        ],
      },
      {
        index: 7,
        title: "ERROR · 구멍 — 현대인은 독이 깨진지도 모르고 물을 붓는다",
        startPage: 322,
        endPage: 390,
        sections: [
          { title: "화학적 구멍", startPage: 322, endPage: 336 },
          { title: "디지털 구멍", startPage: 337, endPage: 349 },
          { title: "행동적 구멍", startPage: 350, endPage: 365 },
          { title: "인지적 구멍", startPage: 366, endPage: 374 },
          { title: "응급 처치", startPage: 375, endPage: 390 },
        ],
      },
      {
        index: 8,
        title: "END · 궁극의 질문 — 고차원 사고를 갖게 된 돌연변이 원시인",
        startPage: 391,
        endPage: 460,
        sections: [
          { title: "당신의 기원", startPage: 391, endPage: 412 },
          { title: "생각하는 종의 출현", startPage: 413, endPage: 423 },
          { title: "개체의 시대", startPage: 424, endPage: 443 },
          { title: "에필로그 · 멸종 위기종", startPage: 444, endPage: 451 },
          { title: "참고 자료", startPage: 452, endPage: 460 },
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
