# 루티부키 (Rutibooki)

> 매일 조금씩, 책과 가까워지는 독서 리추얼 앱

## 컨셉
- 매일 AI가 챕터 단위로 독서 분량 큐레이션
- 넛지 기반 알림 (죄책감 없는, 사회적 신호)
- 12분 완결 구조 — 끝이 보이는 독서
- Dark Matrix UI · Reading Ritual Companion

## 개발 시작일
2026-04-17

## 배포 체크리스트
- `.env.example` 을 참고해 `.env.local` 채우기 (Firebase, Naver, 선택 LLM 키)
- Firebase 콘솔 → Firestore → Rules 탭에 `firestore.rules` 내용 그대로 붙여넣고 저장
- Firebase 콘솔 → Authentication → Sign-in method 에서 Google 공급자 활성화
- Vercel 환경변수에 `.env.example` 의 모든 키 등록 (NEXT_PUBLIC_* 포함)
