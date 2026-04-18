"use client";

// 독서 여정을 구불구불 점선 + 정류장 점으로 그리는 컴포넌트.
// 파트를 정류장 점으로, 파트 사이를 곡선 점선으로 연결.
// 현재 위치는 깜빡거리는 초록 점.

interface JourneyPathProps {
  totalParts: number;    // 전체 파트 수 (정류장 개수)
  currentPart: number;   // 현재 읽고 있는 파트 (1-based)
}

export default function JourneyPath({ totalParts, currentPart }: JourneyPathProps) {
  // 곡선 경로 — 상하로 파동치는 sine-wave 스타일. 파트 수에 맞춰 좌표 계산.
  const width = 320;
  const height = 80;
  const padding = 20;
  const usableWidth = width - padding * 2;
  const amplitude = 18;          // 곡선 진폭
  const midY = height / 2;

  // 각 파트의 (x, y) 위치 — 짝수는 위로, 홀수는 아래로 흔들림
  const points = Array.from({ length: totalParts }, (_, i) => {
    const x = padding + (usableWidth * i) / Math.max(totalParts - 1, 1);
    const y = midY + Math.sin((i / Math.max(totalParts - 1, 1)) * Math.PI * 2) * amplitude;
    return { x, y };
  });

  // SVG path — 부드러운 곡선 연결 (Catmull-Rom 근사 → Bezier)
  const pathD = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `Q ${cx} ${prev.y}, ${cx} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {/* 구불구불 점선 — 흐르는 애니메이션 */}
      <path
        d={pathD}
        fill="none"
        stroke="#2A2A2A"
        strokeWidth={1.5}
        strokeDasharray="3 4"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-14"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>

      {/* 이미 지난 경로는 초록으로 덮기 */}
      {currentPart > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke="#00FF7A"
          strokeWidth={1.8}
          strokeDasharray="3 4"
          strokeLinecap="round"
          strokeDashoffset={0}
          // 현재 파트까지만 보이도록 pathLength 기반 자르기
          pathLength={100}
          style={{
            strokeDasharray: `${((currentPart - 1) / (totalParts - 1)) * 100} 100`,
          }}
        />
      )}

      {/* 정류장 점 */}
      {points.map((p, i) => {
        const partNum = i + 1;
        const isPassed = partNum < currentPart;
        const isCurrent = partNum === currentPart;

        if (isCurrent) {
          return (
            <g key={i}>
              {/* 바깥 글로우 — 깜빡거림 */}
              <circle cx={p.x} cy={p.y} r={10} fill="#00FF7A" opacity={0.3}>
                <animate
                  attributeName="r"
                  values="8;14;8"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0.05;0.4"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* 중심 점 */}
              <circle cx={p.x} cy={p.y} r={5} fill="#00FF7A">
                <animate
                  attributeName="opacity"
                  values="1;0.6;1"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* 라벨 */}
              <text
                x={p.x}
                y={p.y + 22}
                textAnchor="middle"
                fontSize={9}
                fill="#00FF7A"
                fontWeight={700}
              >
                여기
              </text>
            </g>
          );
        }

        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={isPassed ? "#00B858" : "#1F1F1F"}
              stroke={isPassed ? "#00B858" : "#3A3A3A"}
              strokeWidth={1}
            />
            <text
              x={p.x}
              y={p.y + 18}
              textAnchor="middle"
              fontSize={8}
              fill={isPassed ? "#5A5A5A" : "#3A3A3A"}
            >
              {partNum}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
