import { EMA_ALPHA, EMA_MIN_SAMPLES } from "@/constants/reading";

// 지수이동평균 갱신. 3회 미만은 undefined 반환 → 예측 시간 숨김 상태 유지.
// α=0.3 — 최근 기록을 30%, 과거 누적 EMA를 70% 반영.
export function updatePaceEMA(opts: {
  prevPace: number | undefined;
  latestMinPerPage: number;
  sampleCount: number; // 이 로그를 포함한 누적 세션 수
}): number | undefined {
  const { prevPace, latestMinPerPage, sampleCount } = opts;
  if (sampleCount < EMA_MIN_SAMPLES) return undefined;
  if (prevPace == null) return latestMinPerPage;
  return EMA_ALPHA * latestMinPerPage + (1 - EMA_ALPHA) * prevPace;
}
