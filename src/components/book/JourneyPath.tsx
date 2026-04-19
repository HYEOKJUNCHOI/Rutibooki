"use client";

// 독서 여정을 구불구불 점선 + 정류장 점으로 그리는 컴포넌트.
// 스테이션 라벨은 labels[i] 가 있으면 그대로, 없으면 숫자(i+1).
// 배경 #050505 위에서 읽히도록 회색 톤은 의도적으로 밝게 유지한다 — 너무 어두우면 사라짐.

interface JourneyPathProps {
  totalParts: number;    // 정류장 개수
  currentPart: number;   // 현재 정류장 (1-based)
  labels?: string[];     // 각 정류장 라벨(없으면 숫자)
}

// 라벨은 좁은 공간에 들어가므로 공통 프리픽스("파트 N · ", "N장 · ")를 벗기고
// 가운뎃점(·) 뒤의 실제 제목만 남긴다. 길이가 길면 잘라낸다.
function shortenLabel(raw: string, maxLen = 6): string {
  const parts = raw.split(" · ");
  const core = parts.length > 1 ? parts[parts.length - 1] : raw;
  return core.length > maxLen ? core.slice(0, maxLen) + "…" : core;
}

export default function JourneyPath({
  totalParts,
  currentPart,
  labels,
}: JourneyPathProps) {
  // 곡선 경로 — 상하로 파동치는 sine-wave 스타일.
  const width = 320;
  const height = 100;           // 하단 라벨 공간 확보 — 이전 80은 라벨 잘림.
  const padding = 20;
  const usableWidth = width - padding * 2;
  const amplitude = 16;
  const midY = 44;

  const points = Array.from({ length: totalParts }, (_, i) => {
    const x = padding + (usableWidth * i) / Math.max(totalParts - 1, 1);
    const y = midY + Math.sin((i / Math.max(totalParts - 1, 1)) * Math.PI * 2) * amplitude;
    return { x, y };
  });

  // SVG path — 부드러운 곡선 연결
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
        stroke="#3A3A3A"
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
          pathLength={100}
          style={{
            strokeDasharray: `${((currentPart - 1) / (totalParts - 1)) * 100} 100`,
          }}
        />
      )}

      {/* 정류장 점 + 라벨 */}
      {points.map((p, i) => {
        const partNum = i + 1;
        const isPassed = partNum < currentPart;
        const isCurrent = partNum === currentPart;
        const rawLabel = labels?.[i];
        const displayLabel = rawLabel
          ? shortenLabel(rawLabel)
          : String(partNum);

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
              {/* 라벨 — 현재 정류장은 라벨 있으면 "여기 · 제목", 없으면 "여기" */}
              <text
                x={p.x}
                y={p.y + 22}
                textAnchor="middle"
                fontSize={9}
                fill="#00FF7A"
                fontWeight={700}
              >
                {rawLabel ? `여기 · ${shortenLabel(rawLabel)}` : "여기"}
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
              fill={isPassed ? "#00B858" : "#2A2A2A"}
              stroke={isPassed ? "#00B858" : "#5A5A5A"}
              strokeWidth={1}
            />
            <text
              x={p.x}
              y={p.y + 18}
              textAnchor="middle"
              fontSize={8}
              fill={isPassed ? "#9A9A9A" : "#7A7A7A"}
            >
              {displayLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
