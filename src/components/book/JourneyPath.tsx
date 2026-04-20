"use client";

// 독서 여정 — 구불구불 sine-wave + 정류장. 파트 수에 따라 밀도 자동 전환.
// 배경 #050505 위에서 읽히도록 회색 톤은 의도적으로 밝게 유지한다 — 너무 어두우면 사라짐.
//
// 밀도 모드(density):
//   labeled  (≤ 6): 각 정류장 아래 라벨 표시. 첫/끝은 앵커 보정으로 클리핑 방지.
//   numbered (7–12): 라벨 제거, 작은 숫자. 현재 정류장만 제목 캡션.
//   ticks    (13+):  sine 진폭 축소, tick 밀도형. 텍스트는 외부 "PART N / M"에 위임.
//
// 한 화면에 한 눈에 보이는 것을 우선 — 가로 스크롤 지양.

interface JourneyPathProps {
  totalParts: number; // 정류장 개수
  currentPart: number; // 현재 정류장 (1-based)
  labels?: string[]; // 각 정류장 라벨(없으면 숫자)
}

// 공통 프리픽스("파트 N · ")를 벗겨 제목 코어만 남긴다.
function shortenLabel(raw: string, maxLen = 6): string {
  const parts = raw.split(" · ");
  const core = parts.length > 1 ? parts[parts.length - 1] : raw;
  return core.length > maxLen ? core.slice(0, maxLen) + "…" : core;
}

// 첫/끝 라벨이 SVG 밖으로 밀리지 않게 앵커를 전환. 중간은 middle 유지.
function anchorFor(i: number, last: number): "start" | "middle" | "end" {
  if (i === 0) return "start";
  if (i === last) return "end";
  return "middle";
}

export default function JourneyPath({
  totalParts,
  currentPart,
  labels,
}: JourneyPathProps) {
  // 밀도 모드 — 파트 수로 결정. 13개 이상은 sine 의미가 사라져 tick 밀도로 전환.
  const density: "labeled" | "numbered" | "ticks" =
    totalParts <= 6 ? "labeled" : totalParts <= 12 ? "numbered" : "ticks";

  const width = 320;
  // height 는 라벨 공간 포함. ticks 모드는 가장 컴팩트.
  const height = density === "labeled" ? 100 : density === "numbered" ? 72 : 48;
  // padding 은 첫/끝 라벨이 가장자리에 닿지 않도록 여유 확보.
  const padding = density === "labeled" ? 28 : 18;
  const usableWidth = width - padding * 2;
  // 진폭 — ticks 모드는 평평(0), numbered 는 중간, labeled 는 넉넉히.
  const amplitude =
    density === "ticks" ? 0 : density === "numbered" ? 10 : 16;
  const midY = density === "labeled" ? 42 : density === "numbered" ? 30 : 22;

  // sine 한 바퀴를 정확히 그리지 말고, 파트 많을수록 파형이 뭉개지지 않게 주기 조정.
  // 파트 ≤ 6: 1주기 전체(2π), 많아질수록 주기 수 줄여 직선에 수렴.
  const waveCycles = totalParts <= 6 ? 1 : totalParts <= 12 ? 0.5 : 0;

  const points = Array.from({ length: totalParts }, (_, i) => {
    const x = padding + (usableWidth * i) / Math.max(totalParts - 1, 1);
    const t = i / Math.max(totalParts - 1, 1);
    const y = midY + Math.sin(t * Math.PI * 2 * waveCycles) * amplitude;
    return { x, y };
  });

  // SVG path — 부드러운 곡선 연결. ticks 모드는 직선.
  const pathD =
    density === "ticks"
      ? `M ${padding} ${midY} L ${width - padding} ${midY}`
      : points
          .map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const cx = (prev.x + p.x) / 2;
            return `Q ${cx} ${prev.y}, ${cx} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
          })
          .join(" ");

  // 현재 정류장 라벨(캡션) — numbered/ticks 모드에서 상단 중앙에 작게 보여줌.
  const currentLabel =
    labels && labels[currentPart - 1]
      ? shortenLabel(labels[currentPart - 1], density === "ticks" ? 10 : 8)
      : "";

  const lastIdx = totalParts - 1;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
      role="img"
      aria-label={`독서 여정: ${totalParts}개 중 ${currentPart}번째 정류장`}
    >
      {/* 구불구불 점선 — 흐르는 애니메이션. ticks 에선 정적 라인. */}
      <path
        d={pathD}
        fill="none"
        stroke="#3A3A3A"
        strokeWidth={1.5}
        strokeDasharray={density === "ticks" ? "2 3" : "3 4"}
        strokeLinecap="round"
      >
        {density !== "ticks" && (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-14"
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      </path>

      {/* 이미 지난 경로는 초록으로 덮기 — 진행률 비례 */}
      {currentPart > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke="#00FF7A"
          strokeWidth={density === "ticks" ? 1.6 : 1.8}
          strokeDasharray={density === "ticks" ? "2 3" : "3 4"}
          strokeLinecap="round"
          pathLength={100}
          style={{
            strokeDasharray: `${((currentPart - 1) / Math.max(totalParts - 1, 1)) * 100} 100`,
          }}
        />
      )}

      {/* 현재 정류장 캡션 — numbered/ticks 모드에서만. labeled 모드는 각 dot 아래 라벨이 대신함. */}
      {currentLabel && density !== "labeled" && (
        <text
          x={width / 2}
          y={12}
          textAnchor="middle"
          fontSize={10}
          fill="#00FF7A"
          fontWeight={700}
          letterSpacing="-0.2"
        >
          {currentLabel}
        </text>
      )}

      {/* 정류장 점 + 라벨 */}
      {points.map((p, i) => {
        const partNum = i + 1;
        const isPassed = partNum < currentPart;
        const isCurrent = partNum === currentPart;

        // dot 크기 — 모드별로 조정. 현재는 항상 살짝 큼.
        const baseR =
          density === "labeled" ? 3.5 : density === "numbered" ? 2.8 : 2;
        const currentR = density === "ticks" ? 3.2 : 5;

        if (isCurrent) {
          return (
            <g key={i}>
              {/* 바깥 글로우 — 깜빡거림. ticks 모드는 절제. */}
              <circle
                cx={p.x}
                cy={p.y}
                r={density === "ticks" ? 6 : 10}
                fill="#00FF7A"
                opacity={0.3}
              >
                <animate
                  attributeName="r"
                  values={
                    density === "ticks" ? "5;8;5" : "8;14;8"
                  }
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
              <circle cx={p.x} cy={p.y} r={currentR} fill="#00FF7A">
                <animate
                  attributeName="opacity"
                  values="1;0.6;1"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* labeled 모드만 dot 아래 "여기 · 제목" 라벨 */}
              {density === "labeled" && (
                <text
                  x={p.x}
                  y={p.y + 22}
                  textAnchor={anchorFor(i, lastIdx)}
                  fontSize={9}
                  fill="#00FF7A"
                  fontWeight={700}
                >
                  {labels?.[i]
                    ? `여기 · ${shortenLabel(labels[i])}`
                    : "여기"}
                </text>
              )}
            </g>
          );
        }

        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={baseR}
              fill={isPassed ? "#00B858" : "#2A2A2A"}
              stroke={isPassed ? "#00B858" : "#5A5A5A"}
              strokeWidth={1}
            />
            {density === "labeled" && (
              <text
                x={p.x}
                y={p.y + 18}
                textAnchor={anchorFor(i, lastIdx)}
                fontSize={8}
                fill={isPassed ? "#9A9A9A" : "#7A7A7A"}
              >
                {labels?.[i] ? shortenLabel(labels[i]) : String(partNum)}
              </text>
            )}
            {/* numbered 모드 — 라벨 대신 아주 작은 숫자. 과거는 dim, 미래는 더 dim. */}
            {density === "numbered" && (
              <text
                x={p.x}
                y={p.y + 14}
                textAnchor={anchorFor(i, lastIdx)}
                fontSize={7}
                fill={isPassed ? "#7A7A7A" : "#4A4A4A"}
                fontWeight={600}
              >
                {partNum}
              </text>
            )}
            {/* ticks 모드 — 텍스트 없음. dot 만으로 밀도 표시. */}
          </g>
        );
      })}
    </svg>
  );
}
