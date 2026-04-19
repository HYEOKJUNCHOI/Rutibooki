// Reading 플로우 전반에서 공유되는 매직 넘버.
// 숫자를 바꿔야 할 때 이 파일 한 곳만 수정.

// Reading 화면 2분 스냅샷 자동 저장 주기 — Wake Lock 실패 시 안전망
export const AUTOSAVE_INTERVAL_MS = 120_000;

// Long-press로 Reading 종료 / "오늘은 그만" 확정하는 시간 (1.5초는 길다고 판정됨)
export const LONG_PRESS_MS = 800;

// 읽는 속도 EMA 계수 — 최근 기록을 얼만큼 반영할지
export const EMA_ALPHA = 0.3;

// EMA 적용 최소 표본 — 미만이면 예측 시간 자체를 숨김
export const EMA_MIN_SAMPLES = 3;

// 완료 화면 3초 후 자동 홈 복귀
export const POST_READING_AUTO_HOME_MS = 3000;

// 첫 Reading 진입 1회 코치마크 persist 키
export const COACHMARK_KEY = "ruti.coachmark.reading.v1";

// 딴짓 복귀 오버레이 트리거 최소 이탈 시간 — 미만은 "우발적 터치"로 간주
export const ABSENCE_MIN_AWAY_MS = 3000;

// Pre-reading 기본 anchor 문구용 디폴트 분/페이지 (EMA 없을 때)
export const DEFAULT_MIN_PER_PAGE = 1.5;
