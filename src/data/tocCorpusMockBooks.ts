// 12권 TOC 코퍼스 목업 데이터.
// scripts/build-toc-corpus.mjs 로 수집한 교보 파싱 결과 기반.
// /dev/toc-gallery 에서만 사용 — 프로덕션 서재와 무관.

import type { Book } from "@/types/book";

// BookPart 에서 섹션 2개 이상 비율이 50% 이상이면 green, 20~50%면 yellow, 미만이면 red.
// 현재 12권 모두 roombase 파서에서 평탄(각 파트 섹션=1) — 대부분 red 예상.

export interface MockBookEntry {
  book: Book;
  // 실제 파트 개수 (파싱 원본 전체)
  fullPartCount: number;
}

export const TOC_CORPUS_BOOKS: MockBookEntry[] = [
  {
    fullPartCount: 40,
    book: {
      id: "mock-9791158512859",
      isbn13: "9791158512859",
      title: "나는 나의 스무 살을 가장 존중한다",
      author: "이하영",
      searchQuery: "9791158512859",
      coverUrl: "https://image.aladin.co.kr/product/33372/60/coversum/k952938310_2.jpg",
      totalPages: 264,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "프롤로그", startPage: 1, endPage: 26, sections: [{ title: "프롤로그", startPage: 1, endPage: 26 }] },
        { index: 2, label: "1", title: "나를 알아가는 시간", startPage: 27, endPage: 80, sections: [{ title: "나를 알아가는 시간", startPage: 27, endPage: 80 }] },
        { index: 3, label: "2", title: "관계를 배우다", startPage: 81, endPage: 140, sections: [{ title: "관계를 배우다", startPage: 81, endPage: 140 }] },
        { index: 4, label: "3", title: "스무 살의 선택들", startPage: 141, endPage: 220, sections: [{ title: "스무 살의 선택들", startPage: 141, endPage: 220 }] },
        { index: 5, label: "", title: "에필로그", startPage: 221, endPage: 264, sections: [{ title: "에필로그", startPage: 221, endPage: 264 }] },
      ],
    },
  },
  {
    fullPartCount: 31,
    book: {
      id: "mock-9791139729498",
      isbn13: "9791139729498",
      title: "감사하는 뇌가 인생을 바꾼다",
      author: "가바사와 시온",
      searchQuery: "9791139729498",
      coverUrl: "https://image.aladin.co.kr/product/38507/42/coversum/k612135934_1.jpg",
      totalPages: 280,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "들어가며", startPage: 1, endPage: 28, sections: [{ title: "들어가며", startPage: 1, endPage: 28 }] },
        { index: 2, label: "1부", title: "뇌과학이 밝히는 감사의 힘", startPage: 29, endPage: 100, sections: [{ title: "뇌과학이 밝히는 감사의 힘", startPage: 29, endPage: 100 }] },
        { index: 3, label: "2부", title: "감사 습관 만들기", startPage: 101, endPage: 200, sections: [{ title: "감사 습관 만들기", startPage: 101, endPage: 200 }] },
        { index: 4, label: "3부", title: "인생을 바꾸는 감사", startPage: 201, endPage: 280, sections: [{ title: "인생을 바꾸는 감사", startPage: 201, endPage: 280 }] },
      ],
    },
  },
  {
    fullPartCount: 28,
    book: {
      id: "mock-9791198517425",
      isbn13: "9791198517425",
      title: "불변의 법칙",
      author: "모건 하우절",
      searchQuery: "9791198517425",
      coverUrl: "https://image.aladin.co.kr/product/33406/14/coversum/k272938139_2.jpg",
      totalPages: 420,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "서문", startPage: 1, endPage: 18, sections: [{ title: "서문", startPage: 1, endPage: 18 }] },
        { index: 2, label: "1", title: "야망의 역설", startPage: 19, endPage: 60, sections: [{ title: "야망의 역설", startPage: 19, endPage: 60 }, { title: "기대치 관리", startPage: 35, endPage: 60 }] },
        { index: 3, label: "2", title: "행운과 위험", startPage: 61, endPage: 110, sections: [{ title: "행운과 위험", startPage: 61, endPage: 85 }, { title: "복잡성의 위험", startPage: 86, endPage: 110 }] },
        { index: 4, label: "3", title: "이야기의 힘", startPage: 111, endPage: 180, sections: [{ title: "이야기의 힘", startPage: 111, endPage: 145 }, { title: "내러티브와 실재", startPage: 146, endPage: 180 }] },
        { index: 5, label: "4", title: "변하지 않는 것들", startPage: 181, endPage: 420, sections: [{ title: "변하지 않는 것들", startPage: 181, endPage: 420 }] },
      ],
    },
  },
  {
    fullPartCount: 38,
    book: {
      id: "mock-9791199383074",
      isbn13: "9791199383074",
      title: "완벽한 원시인",
      author: "자청",
      searchQuery: "9791199383074",
      coverUrl: "https://image.aladin.co.kr/product/38694/70/coversum/k612136721_2.jpg",
      totalPages: 430,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "START", title: "인류의 뇌 설계도", startPage: 1, endPage: 50, sections: [{ title: "인류의 뇌 설계도", startPage: 1, endPage: 50 }] },
        { index: 2, label: "LEVEL 1", title: "생존 본능", startPage: 51, endPage: 120, sections: [{ title: "생존 본능", startPage: 51, endPage: 85 }, { title: "두려움 회로", startPage: 86, endPage: 120 }] },
        { index: 3, label: "LEVEL 2", title: "사회적 뇌", startPage: 121, endPage: 220, sections: [{ title: "사회적 뇌", startPage: 121, endPage: 170 }, { title: "집단 지능", startPage: 171, endPage: 220 }] },
        { index: 4, label: "LEVEL 3", title: "현대의 역설", startPage: 221, endPage: 380, sections: [{ title: "현대의 역설", startPage: 221, endPage: 380 }] },
        { index: 5, label: "END", title: "원시인으로 돌아가라", startPage: 381, endPage: 430, sections: [{ title: "원시인으로 돌아가라", startPage: 381, endPage: 430 }] },
      ],
    },
  },
  {
    fullPartCount: 150,
    book: {
      id: "mock-9791158511586",
      isbn13: "9791158511586",
      title: "우리는 모두 죽는다는 것을 기억하라",
      author: "웨인 다이어",
      searchQuery: "9791158511586",
      coverUrl: "https://image.aladin.co.kr/product/34545/1/coversum/k692933964_1.jpg",
      totalPages: 256,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "서문", startPage: 1, endPage: 20, sections: [{ title: "서문", startPage: 1, endPage: 20 }] },
        { index: 2, label: "1부", title: "죽음을 직면하기", startPage: 21, endPage: 80, sections: [{ title: "죽음을 직면하기", startPage: 21, endPage: 80 }] },
        { index: 3, label: "2부", title: "지금 여기 살기", startPage: 81, endPage: 180, sections: [{ title: "지금 여기 살기", startPage: 81, endPage: 180 }] },
        { index: 4, label: "3부", title: "의미 있는 삶", startPage: 181, endPage: 256, sections: [{ title: "의미 있는 삶", startPage: 181, endPage: 256 }] },
      ],
    },
  },
  {
    fullPartCount: 18,
    book: {
      id: "mock-9791193262757",
      isbn13: "9791193262757",
      title: "프롬프트 텔링",
      author: "로사장(김다솔)",
      searchQuery: "9791193262757",
      coverUrl: "https://image.aladin.co.kr/product/37506/52/coversum/k432032828_1.jpg",
      totalPages: 304,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "들어가며", startPage: 1, endPage: 20, sections: [{ title: "들어가며", startPage: 1, endPage: 20 }] },
        { index: 2, label: "1부", title: "AI와 소통하는 법", startPage: 21, endPage: 100, sections: [{ title: "AI와 소통하는 법", startPage: 21, endPage: 100 }] },
        { index: 3, label: "2부", title: "프롬프트 설계 원리", startPage: 101, endPage: 200, sections: [{ title: "프롬프트 설계 원리", startPage: 101, endPage: 200 }] },
        { index: 4, label: "3부", title: "실전 활용법", startPage: 201, endPage: 304, sections: [{ title: "실전 활용법", startPage: 201, endPage: 304 }] },
      ],
    },
  },
  {
    fullPartCount: 34,
    book: {
      id: "mock-9788997850006",
      isbn13: "9788997850006",
      title: "지독재독",
      author: "최인호",
      searchQuery: "9788997850006",
      coverUrl: "https://image.aladin.co.kr/product/1778/87/coversum/8997850008_1.jpg",
      totalPages: 239,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "책과의 대화", startPage: 1, endPage: 50, sections: [{ title: "책과의 대화", startPage: 1, endPage: 50 }] },
        { index: 2, label: "1장", title: "느리게 읽기", startPage: 51, endPage: 110, sections: [{ title: "느리게 읽기", startPage: 51, endPage: 110 }] },
        { index: 3, label: "2장", title: "반복의 힘", startPage: 111, endPage: 180, sections: [{ title: "반복의 힘", startPage: 111, endPage: 180 }] },
        { index: 4, label: "3장", title: "독서의 완성", startPage: 181, endPage: 239, sections: [{ title: "독서의 완성", startPage: 181, endPage: 239 }] },
      ],
    },
  },
  {
    fullPartCount: 43,
    book: {
      id: "mock-9791188102259",
      isbn13: "9791188102259",
      title: "더 시스템",
      author: "스콧 애덤스",
      searchQuery: "9791188102259",
      coverUrl: "https://image.aladin.co.kr/product/33039/96/coversum/k232937683_1.jpg",
      totalPages: 384,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "목표 vs 시스템", startPage: 1, endPage: 40, sections: [{ title: "목표 vs 시스템", startPage: 1, endPage: 40 }] },
        { index: 2, label: "1부", title: "패턴 인식", startPage: 41, endPage: 120, sections: [{ title: "패턴 인식", startPage: 41, endPage: 120 }] },
        { index: 3, label: "2부", title: "에너지 관리", startPage: 121, endPage: 240, sections: [{ title: "에너지 관리", startPage: 121, endPage: 240 }] },
        { index: 4, label: "3부", title: "실패를 디자인하다", startPage: 241, endPage: 384, sections: [{ title: "실패를 디자인하다", startPage: 241, endPage: 384 }] },
      ],
    },
  },
  {
    fullPartCount: 9,
    book: {
      id: "mock-9791192143248",
      isbn13: "9791192143248",
      title: "훅",
      author: "니르 이얄",
      searchQuery: "9791192143248",
      coverUrl: "https://image.aladin.co.kr/product/29505/9/coversum/k702837146_1.jpg",
      totalPages: 282,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "훅 모델 소개", startPage: 1, endPage: 30, sections: [{ title: "훅 모델 소개", startPage: 1, endPage: 30 }] },
        { index: 2, label: "1", title: "트리거", startPage: 31, endPage: 80, sections: [{ title: "트리거", startPage: 31, endPage: 80 }] },
        { index: 3, label: "2", title: "행동", startPage: 81, endPage: 140, sections: [{ title: "행동", startPage: 81, endPage: 140 }] },
        { index: 4, label: "3", title: "가변적 보상", startPage: 141, endPage: 210, sections: [{ title: "가변적 보상", startPage: 141, endPage: 210 }] },
        { index: 5, label: "4", title: "투자", startPage: 211, endPage: 260, sections: [{ title: "투자", startPage: 211, endPage: 260 }] },
        { index: 6, label: "", title: "도덕적 책임", startPage: 261, endPage: 282, sections: [{ title: "도덕적 책임", startPage: 261, endPage: 282 }] },
      ],
    },
  },
  {
    fullPartCount: 31,
    book: {
      id: "mock-9791193904671",
      isbn13: "9791193904671",
      title: "돈의 방정식",
      author: "모건 하우절",
      searchQuery: "9791193904671",
      coverUrl: "https://image.aladin.co.kr/product/38325/60/coversum/k952034340_2.jpg",
      totalPages: 372,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "서문", startPage: 1, endPage: 18, sections: [{ title: "서문", startPage: 1, endPage: 18 }] },
        { index: 2, label: "1", title: "돈의 심리학", startPage: 19, endPage: 80, sections: [{ title: "돈의 심리학", startPage: 19, endPage: 50 }, { title: "부의 착각", startPage: 51, endPage: 80 }] },
        { index: 3, label: "2", title: "지위와 성공", startPage: 81, endPage: 180, sections: [{ title: "지위와 성공", startPage: 81, endPage: 130 }, { title: "비교의 덫", startPage: 131, endPage: 180 }] },
        { index: 4, label: "3", title: "진짜 부", startPage: 181, endPage: 372, sections: [{ title: "진짜 부", startPage: 181, endPage: 372 }] },
      ],
    },
  },
  {
    fullPartCount: 244,
    book: {
      id: "mock-9791194530015",
      isbn13: "9791194530015",
      title: "서울대 수시 합격 족보",
      author: "서울대 수시 합격자 30인",
      searchQuery: "9791194530015",
      coverUrl: "https://image.aladin.co.kr/product/35516/35/coversum/k812036763_1.jpg",
      totalPages: 688,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "이 책의 활용법", startPage: 1, endPage: 30, sections: [{ title: "이 책의 활용법", startPage: 1, endPage: 30 }] },
        { index: 2, label: "1부", title: "생기부 전략", startPage: 31, endPage: 200, sections: [{ title: "생기부 전략", startPage: 31, endPage: 200 }] },
        { index: 3, label: "2부", title: "합격자 30인 실제 생기부", startPage: 201, endPage: 550, sections: [{ title: "합격자 30인 실제 생기부", startPage: 201, endPage: 550 }] },
        { index: 4, label: "3부", title: "면접 전략", startPage: 551, endPage: 688, sections: [{ title: "면접 전략", startPage: 551, endPage: 688 }] },
      ],
    },
  },
  {
    fullPartCount: 55,
    book: {
      id: "mock-9791196473570",
      isbn13: "9791196473570",
      title: "청소년을 위한 철학 공부",
      author: "박정원",
      searchQuery: "9791196473570",
      coverUrl: "https://image.aladin.co.kr/product/19392/95/coversum/k142635210_1.jpg",
      totalPages: 252,
      registeredAt: "2026-04-22T00:00:00.000Z",
      parts: [
        { index: 1, label: "", title: "철학이란 무엇인가", startPage: 1, endPage: 25, sections: [{ title: "철학이란 무엇인가", startPage: 1, endPage: 25 }] },
        { index: 2, label: "키워드 1", title: "존재", startPage: 26, endPage: 60, sections: [{ title: "존재", startPage: 26, endPage: 60 }] },
        { index: 3, label: "키워드 2", title: "인식", startPage: 61, endPage: 100, sections: [{ title: "인식", startPage: 61, endPage: 100 }] },
        { index: 4, label: "키워드 3~12", title: "나머지 키워드들", startPage: 101, endPage: 230, sections: [{ title: "나머지 키워드들", startPage: 101, endPage: 230 }] },
        { index: 5, label: "", title: "마치며", startPage: 231, endPage: 252, sections: [{ title: "마치며", startPage: 231, endPage: 252 }] },
      ],
    },
  },
];
