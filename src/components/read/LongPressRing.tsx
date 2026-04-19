"use client";

// T-23: Reading 종료 long-press 시각화. progress 0→1로 stroke-dashoffset 감소.
// 빨강 금지 — 회색 → 초록 그라데이션으로 "완료에 가까워짐"을 중립적으로 전달.
// 시간 숫자/텍스트 일절 없음. 링만 차오른다.

interface LongPressRingProps {
  progress: number; // 0~1
  // 검정 배경 위에 얹히는 링 — 위치는 부모가 결정
  size?: number;
}

export default function LongPressRing({
  progress,
  size = 48,
}: LongPressRingProps) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  // progress가 0이면 아예 안 보이게. 눌러야 비로소 나타난다.
  const opacity = progress > 0.02 ? 1 : 0;

  // 회색(#3A3A3A) → 초록(#00FF7A) 보간. 빨강·경고 색은 쓰지 않는다.
  const color = progress >= 1 ? "#00FF7A" : interpolate(progress);

  return (
    <svg
      width={size}
      height={size}
      style={{
        opacity,
        transition: "opacity 180ms ease",
        display: "block",
      }}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1F1F1F"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 60ms linear, stroke 180ms ease" }}
      />
    </svg>
  );
}

function interpolate(t: number): string {
  // #3A3A3A (58,58,58) → #00FF7A (0,255,122)
  const r = Math.round(58 + (0 - 58) * t);
  const g = Math.round(58 + (255 - 58) * t);
  const b = Math.round(58 + (122 - 58) * t);
  return `rgb(${r},${g},${b})`;
}
