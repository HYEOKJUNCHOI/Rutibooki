@AGENTS.md

# Rutibooki 코딩 컨벤션

## 스택
- **Next.js App Router** + **TypeScript**
- 파일 확장자:
  - 화면 컴포넌트 → `.tsx`
  - 로직·유틸·타입·훅 → `.ts`
- 스타일: **inline style** (Emotion 도입 X)
  - 추후 복잡도 올라가면 `*.style.ts`로 분리 검토
- 상태 관리: Zustand (진짜 전역으로 공유되는 상태에만)

## 네이밍 규칙
- 컴포넌트: `PascalCase` (예: `BookCoverSwipe`)
- 함수/변수: `camelCase` (예: `calculateProgress`)
- 상수: `UPPER_SNAKE_CASE` (예: `SWIPE_THRESHOLD`)
- API 함수 접두사: `fetch` / `create` / `update` / `delete`

## 코드 원칙
- **한 파일 300줄 넘으면 분리** (하위 컴포넌트 / 커스텀 훅)
- **주석은 "왜(Why)"만 한국어로** — "무엇(What)"은 이름으로 드러내기
- **TODO 주석**에는 작성자·날짜 필수
  - 예: `// TODO(혁준, 2026-04-18): 표지 fallback 제거`
- **코로케이션 우선** — 한 곳에서만 쓰는 타입/헬퍼는 같은 파일 안에 두고, 공유될 때만 `types/`·`utils/`로 올림
- **page.tsx는 조합만** — 비즈니스 로직은 훅/컴포넌트로 분리

## 폴더 구조
```
src/
├── app/          # Next.js 라우팅 (page.tsx는 조합 레이어)
├── types/        # 공유 타입 정의
├── data/         # 목업 / 상수 데이터
├── store/        # Zustand 스토어
├── hooks/        # 커스텀 훅 (useXxx)
├── utils/        # 순수 함수 유틸
└── components/
    ├── layout/   # PhoneFrame, Header 등
    └── book/     # 기능 단위 컴포넌트 그룹
```

## 참고
- 혁준님의 Lucid 프로젝트 표준(`.jsx` + Emotion)은 팀 프로젝트용이고,
  Rutibooki는 **개인 학습·실험 프로젝트**라 TypeScript + inline style 사용
- 전역 사용자 규칙(`~/.claude/CLAUDE.md`)도 함께 준수
