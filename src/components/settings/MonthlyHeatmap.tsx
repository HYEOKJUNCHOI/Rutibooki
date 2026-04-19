"use client";

import { useMemo, useState } from "react";
import { buildMonthlyHeatmap, HeatCell } from "@/utils/heatmap";
import { useReadingStore } from "@/store/readingStore";

// T-40: GitHub 잔디 스타일 월간 히트맵. 숫자 노출 금지, intensity 색만.

const INTENSITY_COLORS = [
  "#141414", // 0 — 없음
  "#00332a", // 1
  "#00664d", // 2
  "#00b377", // 3
  "#00FF7A", // 4
];

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 해당 월 1일의 요일(ISO: 월=0 … 일=6)
function firstDayOffset(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1).getDay(); // 일=0 … 토=6
  return (d + 6) % 7;
}

// 월 이동.
function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ymKey(d);
}

interface Props {
  // 홈 띠지용 컴팩트 모드. 월 네비/요일/범례 모두 생략하고, 오늘 날짜만 왼쪽 아래에 작게 표시.
  compact?: boolean;
}

export default function MonthlyHeatmap({ compact = false }: Props) {
  // 현재 월 기본값 계산은 Date.now() → 마운트 후에만. useState 초기값은 첫 렌더에서 실행되지만
  // 이 컴포넌트는 "use client" 이고 설정 페이지에서만 렌더되므로 서버에서는 실행되지 않음.
  const [cursor, setCursor] = useState<string>(() => ymKey(new Date()));

  const logs = useReadingStore((s) => s.logs);
  const cells: HeatCell[] = useMemo(
    () => buildMonthlyHeatmap(logs, cursor),
    [logs, cursor],
  );

  const offset = useMemo(() => firstDayOffset(cursor), [cursor]);

  const hasAny = cells.some((c) => c.intensity > 0);

  if (compact) {
    // 홈용 얇은 띠 — 한 줄 가로 배치. 왼쪽 아래 오늘 날짜(YYYY.MM.DD, 10px, #5A5A5A).
    const today = new Date();
    const todayStr = `${today.getFullYear()}.${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    return (
      <div
        style={{
          position: "relative",
          padding: "10px 12px 16px",
          background: "#0C0C0C",
          border: "1px solid #1A1A1A",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cells.length || 1}, 1fr)`,
            gap: 3,
            height: 22,
          }}
        >
          {cells.map((cell) => (
            <div
              key={cell.date}
              style={{
                background: INTENSITY_COLORS[cell.intensity],
                borderRadius: 2,
              }}
            />
          ))}
        </div>
        <span
          style={{
            position: "absolute",
            left: 12,
            bottom: 4,
            fontSize: 10,
            color: "#5A5A5A",
            letterSpacing: 0.3,
          }}
        >
          {todayStr}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 월 네비게이션 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setCursor((c) => addMonth(c, -1))}
          style={navBtnStyle}
          aria-label="이전 달"
        >
          ‹
        </button>
        <span
          style={{
            color: "#E8E8E8",
            fontSize: 13,
            letterSpacing: "-0.3px",
            fontWeight: 600,
          }}
        >
          {cursor.replace("-", ". ")}
        </span>
        <button
          onClick={() => setCursor((c) => addMonth(c, 1))}
          style={navBtnStyle}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* 요일 레이블 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {DAY_LABELS.map((d) => (
          <span
            key={d}
            style={{
              fontSize: 10,
              color: "#4A4A4A",
              textAlign: "center",
              letterSpacing: 0.3,
            }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* 셀 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} style={{ aspectRatio: "1 / 1" }} />
        ))}
        {cells.map((cell) => (
          <div
            key={cell.date}
            title="이 날 읽음"
            style={{
              aspectRatio: "1 / 1",
              background: INTENSITY_COLORS[cell.intensity],
              borderRadius: 3,
            }}
          />
        ))}
      </div>

      {/* 범례 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "#5A5A5A" }}>적음</span>
        {INTENSITY_COLORS.map((c, i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              background: c,
              borderRadius: 2,
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: "#5A5A5A" }}>많음</span>
      </div>

      {/* T-41: 빈 상태 placeholder — 재촉 문구 금지. */}
      {!hasAny && (
        <p
          style={{
            fontSize: 12,
            color: "#5A5A5A",
            textAlign: "center",
            marginTop: 10,
            letterSpacing: "-0.2px",
          }}
        >
          아직 지도는 비어있어요
        </p>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#9A9A9A",
  border: "1px solid #2A2A2A",
  borderRadius: 6,
  padding: "2px 10px",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};
