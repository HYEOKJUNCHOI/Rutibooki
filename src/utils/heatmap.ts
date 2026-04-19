import { ReadingLog } from "@/types/reading";

export interface HeatCell {
  date: string; // YYYY-MM-DD
  // 0=없음, 1~4 진하기. 숫자(분 수)는 절대 노출하지 않는다.
  intensity: 0 | 1 | 2 | 3 | 4;
}

// 해당 월의 날짜별 합산 분 수를 0~4 intensity 로 양자화.
// yearMonth: "YYYY-MM"
export function buildMonthlyHeatmap(
  logs: ReadingLog[],
  yearMonth: string,
): HeatCell[] {
  const [yStr, mStr] = yearMonth.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1~12
  const daysInMonth = new Date(year, month, 0).getDate();

  // 날짜별 분 수 합산
  const minutesByDate: Record<string, number> = {};
  for (const log of logs) {
    if (!log.date.startsWith(yearMonth)) continue;
    const min = log.durationSec / 60;
    minutesByDate[log.date] = (minutesByDate[log.date] ?? 0) + min;
  }

  const cells: HeatCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${yearMonth}-${String(d).padStart(2, "0")}`;
    const minutes = minutesByDate[date] ?? 0;
    cells.push({ date, intensity: quantize(minutes) });
  }
  return cells;
}

// 분 단위를 5구간으로. 경계는 임의 — 실사용 누적되면 조정 가능.
function quantize(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 5) return 1;
  if (minutes < 15) return 2;
  if (minutes < 30) return 3;
  return 4;
}
