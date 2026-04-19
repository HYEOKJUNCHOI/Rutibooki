"use client";

import { Book } from "@/types/book";
import { getActivePart } from "@/utils/reading";

// FullJourney를 대체하는 보물지도 스타일 경로 컴포넌트.
// 직선 진행바 대신 SVG bezier curve 로 퀘스트 지도 느낌을 살린다.
// 높이를 220px로 고정해서 전체 뷰포트가 스크롤 없이 들어가도록 제약을 걸어둠.

interface CurvyJourneyProps {
  book: Book;
  currentPage: number;
}

// S-curve waypoint 좌표를 파트 개수에 맞게 균등 분배.
// 좌우 진폭은 컨테이너 폭의 20%~80% 사이에서 교대 — 지그재그 효과.
function buildWaypoints(
  partCount: number,
  svgW: number,
  svgH: number,
): { x: number; y: number }[] {
  // 파트 + goal 포함한 노드 수
  const nodeCount = partCount + 1;
  const margin = 20;
  const usableH = svgH - margin * 2;
  const left = svgW * 0.18;
  const right = svgW * 0.82;

  return Array.from({ length: nodeCount }, (_, i) => {
    const t = i / (nodeCount - 1);
    const y = margin + t * usableH;
    // 짝수 인덱스는 왼쪽, 홀수는 오른쪽 — 지그재그
    const x = i % 2 === 0 ? left : right;
    return { x, y };
  });
}

// 이웃한 두 점 사이 cubic bezier control point 생성.
// 수직 방향으로 1/3, 2/3 지점에서 수평으로 꺾어 S자 곡선.
function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dy = curr.y - prev.y;
    // 컨트롤 포인트: 수평선을 y 방향 1/3, 2/3 지점에서 당겨서 부드러운 S자.
    const cp1x = prev.x;
    const cp1y = prev.y + dy * 0.45;
    const cp2x = curr.x;
    const cp2y = curr.y - dy * 0.45;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

// 전체 경로 길이를 근사 — stroke-dashoffset 진행률 계산용.
// SVG getTotalLength() 대신 분절 길이 합산(SSR 호환).
function approxPathLength(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    // bezier 길이는 직선보다 길어서 1.35 보정 계수 적용 (실측 근사치)
    total += Math.sqrt(dx * dx + dy * dy) * 1.35;
  }
  return total;
}

export default function CurvyJourney({ book, currentPage }: CurvyJourneyProps) {
  // 파트 정보가 없으면 waypoint 계산이 1/0 = Infinity 로 터진다 → 조기 return.
  if (!book.parts || book.parts.length === 0) return null;

  const parts = book.parts;
  const partCount = parts.length;

  // currentPage 0 = 아직 시작 전 → 첫 파트 진입 전으로 처리.
  const activePart = currentPage > 0 ? getActivePart(book, currentPage) : null;
  // 현재 파트 인덱스 (0-based). goal 노드는 partCount 인덱스.
  const activeNodeIdx = activePart ? activePart.index - 1 : -1;

  const SVG_W = 327; // PhoneFrame 375 - padding 24*2 = 327
  const SVG_H = 220;

  const waypoints = buildWaypoints(partCount, SVG_W, SVG_H);
  const fullPath = buildPath(waypoints);

  // 진행률 계산 — activeNodeIdx / (partCount) 비율로 stroke-dashoffset 결정.
  // 파트 내 페이지 진행까지 반영해서 더 세밀하게.
  const totalLen = approxPathLength(waypoints);
  let progressRatio = 0;
  if (activePart && currentPage > 0) {
    const partNodeRatio = (activePart.index - 1) / partCount;
    const withinPartRatio =
      (currentPage - activePart.startPage) /
      Math.max(1, activePart.endPage - activePart.startPage);
    progressRatio = partNodeRatio + withinPartRatio / partCount;
  }
  const progressLen = Math.min(totalLen * progressRatio, totalLen);

  return (
    <div
      style={{
        // 높이 고정으로 뷰포트 초과 방지 — 이 안에서 SVG가 꽉 차야 함.
        height: SVG_H,
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* keyframe은 컴포넌트 안 <style> 로 격리 — 전역 오염 없음 */}
      <style>{`
        @keyframes cj-pulse {
          0%, 100% { opacity: 1; r: 7; }
          50% { opacity: 0.25; r: 10; }
        }
        @keyframes cj-goal-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: "block" }}
      >
        {/* === 배경 전체 경로 (미래 구간 — 흐린 회색) === */}
        <path
          d={fullPath}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* === 진행 경로 (지나온 구간 — 초록) === */}
        {progressLen > 0 && (
          <path
            d={fullPath}
            fill="none"
            stroke="#00FF7A"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen}
            strokeDashoffset={totalLen - progressLen}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        )}

        {/* === 파트 노드 === */}
        {waypoints.slice(0, partCount).map((pt, i) => {
          const isPassed = i < activeNodeIdx;
          const isCurrent = i === activeNodeIdx;
          const isFuture = i > activeNodeIdx;
          const partLabel = `파트 ${i + 1}`;
          // 라벨 위치 — 짝수(왼쪽 노드)는 오른쪽, 홀수(오른쪽 노드)는 왼쪽
          const labelX = i % 2 === 0 ? pt.x + 14 : pt.x - 14;
          const labelAnchor = i % 2 === 0 ? "start" : "end";

          return (
            <g key={i}>
              {/* 현재 파트 glow 링 */}
              {isCurrent && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={14}
                  fill="none"
                  stroke="#00FF7A"
                  strokeWidth={1}
                  opacity={0.3}
                  style={{ animation: "cj-goal-glow 1.6s ease-in-out infinite" }}
                />
              )}

              {/* 노드 원 */}
              {isCurrent ? (
                // pulse 원 — SVG animate 대신 CSS 애니메이션 (r 변화는 SVG animate 필요하므로 크기 고정+opacity 변화로)
                <>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={9}
                    fill="#00FF7A"
                    style={{ filter: "drop-shadow(0 0 6px rgba(0,255,122,0.9))" }}
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={14}
                    fill="rgba(0,255,122,0.12)"
                    style={{ animation: "cj-pulse 1.4s ease-in-out infinite" }}
                  />
                </>
              ) : isPassed ? (
                <circle cx={pt.x} cy={pt.y} r={6} fill="#00B858" />
              ) : (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={5}
                  fill="#1A1A1A"
                  stroke="#3A3A3A"
                  strokeWidth={1.5}
                />
              )}

              {/* 파트 라벨 */}
              <text
                x={labelX}
                y={pt.y + 1}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                fontSize={isCurrent ? 10 : 9}
                fontWeight={isCurrent ? 700 : 400}
                fill={isCurrent ? "#00FF7A" : isPassed ? "#5A5A5A" : isFuture ? "#3A3A3A" : "#5A5A5A"}
                style={{ fontFamily: "inherit", letterSpacing: "-0.2px" }}
              >
                {partLabel}
              </text>
            </g>
          );
        })}

        {/* === Goal 마커 (맨 끝 waypoint) === */}
        {(() => {
          const goalPt = waypoints[partCount];
          const isGoalReached = currentPage >= book.totalPages;
          const labelX = partCount % 2 === 0 ? goalPt.x + 16 : goalPt.x - 16;
          const labelAnchor = partCount % 2 === 0 ? "start" : "end";

          return (
            <g>
              {/* goal aura */}
              <circle
                cx={goalPt.x}
                cy={goalPt.y}
                r={18}
                fill={isGoalReached ? "rgba(0,255,122,0.15)" : "rgba(255,215,0,0.06)"}
                style={{ animation: "cj-goal-glow 2s ease-in-out infinite" }}
              />
              {/* goal 별 모양 — 텍스트 이모지 대신 SVG polygon으로 일관성 유지 */}
              <GoalStar
                cx={goalPt.x}
                cy={goalPt.y}
                size={10}
                filled={isGoalReached}
              />
              {/* 완독 라벨 */}
              <text
                x={labelX}
                y={goalPt.y + 1}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                fontSize={10}
                fill={isGoalReached ? "#00FF7A" : "#5A5A5A"}
                fontWeight={isGoalReached ? 700 : 400}
                style={{ fontFamily: "inherit", letterSpacing: "-0.2px" }}
              >
                완독
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// 5각 별 SVG 서브컴포넌트 — polygon 좌표로 그린다.
// 이모지 🏁 대신 SVG polygon 쓰는 이유: 플랫폼 렌더링 일관성 + 색상 제어 가능.
function GoalStar({
  cx,
  cy,
  size,
  filled,
}: {
  cx: number;
  cy: number;
  size: number;
  filled: boolean;
}) {
  const outerR = size;
  const innerR = size * 0.4;
  const points: string = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <polygon
      points={points}
      fill={filled ? "#00FF7A" : "none"}
      stroke={filled ? "#00FF7A" : "#FFD700"}
      strokeWidth={1.5}
      style={{
        filter: filled
          ? "drop-shadow(0 0 8px rgba(0,255,122,0.8))"
          : "drop-shadow(0 0 6px rgba(255,215,0,0.5))",
      }}
    />
  );
}
