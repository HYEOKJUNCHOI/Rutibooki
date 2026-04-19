"use client";

import { useEffect, useMemo, useRef } from "react";
import { Book } from "@/types/book";
import { getActivePart } from "@/utils/reading";

// T-26: 정류장 스프링 이동 애니메이션.
// 단계(총 2~2.5s, crossed면 +1.8s 글로우):
//   0~0.3s   출발점 squash (scaleY 0.7)
//   0.3~1.2s 도착점까지 spring easing 이동 (오버슈팅)
//   1.2~1.8s 도착점 3번 pulse
//   1.8~2.0s 경로 초록 채움
//   2.0~3.8s (crossed) 라디얼 글로우 확산
//
// Framer Motion 금지 — inline style + CSS transition + keyframes만.
// <style jsx>는 Next.js에서 기본 지원 X이므로 <style dangerouslySetInnerHTML> 패턴.

interface StationTransitionAnimationProps {
  book: Book;
  fromPage: number;
  toPage: number;
  crossedPart: boolean;
  onDone: () => void;
}

// SVG 좌표는 JourneyPath와 같은 공간 기준으로 계산.
// 단, 여기선 "출발→도착 한 쌍만" 강조해서 보여준다 (전체 경로는 배경에 흐리게).
const WIDTH = 320;
const HEIGHT = 140;
const PADDING = 24;

export default function StationTransitionAnimation({
  book,
  fromPage,
  toPage,
  crossedPart,
  onDone,
}: StationTransitionAnimationProps) {
  const doneRef = useRef(false);

  const fromPart = getActivePart(book, fromPage || 1);
  const toPart = getActivePart(book, toPage || 1);
  const totalParts = book.parts.length;

  // 파트 좌표 (JourneyPath와 동일한 sine-wave 배치)
  const points = useMemo(
    () => computePoints(totalParts),
    [totalParts],
  );
  const fromPoint = points[Math.max(0, fromPart.index - 1)];
  const toPoint = points[Math.max(0, toPart.index - 1)];

  // 전체 소요 — crossed면 글로우 구간 연장.
  const totalMs = crossedPart ? 3800 : 2000;

  useEffect(() => {
    if (doneRef.current) return;
    const id = window.setTimeout(() => {
      doneRef.current = true;
      onDone();
    }, totalMs);

    // 파트 경계 넘었을 때만 진동 패턴 (지원 기기 한정).
    if (crossedPart) {
      try {
        (
          navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }
        ).vibrate?.([40, 30, 40]);
      } catch {
        // 미지원 시 무시.
      }
    }
    return () => clearTimeout(id);
  }, [totalMs, crossedPart, onDone]);

  // 지나간 파트(현재 toPart.index까지) — 이미 채워진 정류장 표시.
  const passedPathD = buildPath(points);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 55,
        padding: 24,
      }}
      aria-hidden
    >
      {/* keyframes는 스타일 태그로 1회만 주입 */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ maxWidth: 360, display: "block" }}
      >
        {/* 배경 경로 — 회색 점선. 흐르는 연출 없음(주의 분산 방지). */}
        <path
          d={passedPathD}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={1.5}
          strokeDasharray="3 4"
          strokeLinecap="round"
        />

        {/* 도착 파트까지의 경로를 초록으로 채움 — 1.8~2.0s 사이에 scale. */}
        <path
          d={passedPathD}
          fill="none"
          stroke="#00FF7A"
          strokeWidth={1.8}
          strokeDasharray="3 4"
          strokeLinecap="round"
          pathLength={100}
          style={{
            strokeDasharray: `${((toPart.index - 1) / Math.max(totalParts - 1, 1)) * 100} 100`,
            opacity: 0,
            animation: "ruti-path-fill 400ms ease-out 1600ms forwards",
          }}
        />

        {/* 지나간 정류장(도착 이전 파트까지) — 정적 초록 */}
        {points.map((p, i) => {
          const partNum = i + 1;
          if (partNum >= toPart.index) return null;
          return (
            <circle
              key={`passed-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#00B858"
              opacity={0.7}
            />
          );
        })}

        {/* 남은 정류장(도착 이후 파트) — 회색 */}
        {points.map((p, i) => {
          const partNum = i + 1;
          if (partNum <= toPart.index) return null;
          return (
            <circle
              key={`future-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#1F1F1F"
              stroke="#3A3A3A"
              strokeWidth={1}
            />
          );
        })}

        {/* 출발점 squash — 0~0.3s */}
        <circle
          cx={fromPoint.x}
          cy={fromPoint.y}
          r={5}
          fill="#00FF7A"
          style={{
            transformOrigin: `${fromPoint.x}px ${fromPoint.y}px`,
            animation: "ruti-station-squash 300ms ease-out forwards",
            opacity: fromPart.index === toPart.index ? 1 : 1,
          }}
        />

        {/* 이동하는 점(spring) + 도착 pulse + crossed 글로우는 <g>에 누적 애니메이션 */}
        <g
          style={{
            // 출발→도착 translate. transform-origin 필요 없음.
            animation: `ruti-station-move 900ms cubic-bezier(0.68,-0.55,0.27,1.55) 300ms both`,
            // 아래 --dx/--dy 는 CSS custom property로 전달
            ["--dx" as string]: `${toPoint.x - fromPoint.x}px`,
            ["--dy" as string]: `${toPoint.y - fromPoint.y}px`,
          }}
        >
          {/* 이동/펄스 중 본체 */}
          <circle
            cx={fromPoint.x}
            cy={fromPoint.y}
            r={5}
            fill="#00FF7A"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: "ruti-station-pulse 600ms ease-in-out 1200ms 1",
            }}
          />
          {/* crossed 전용 라디얼 글로우 — 2.0s 이후 확산 */}
          {crossedPart && (
            <circle
              cx={fromPoint.x}
              cy={fromPoint.y}
              r={6}
              fill="url(#ruti-glow)"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "ruti-station-glow 1800ms ease-out 2000ms forwards",
                opacity: 0,
              }}
            />
          )}
        </g>

        {/* radial gradient 정의 — glow용 */}
        <defs>
          <radialGradient id="ruti-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00FF7A" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#00FF7A" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00FF7A" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

function computePoints(totalParts: number) {
  const usableWidth = WIDTH - PADDING * 2;
  const midY = HEIGHT / 2;
  const amplitude = 24;
  return Array.from({ length: totalParts }, (_, i) => {
    const t = i / Math.max(totalParts - 1, 1);
    const x = PADDING + usableWidth * t;
    const y = midY + Math.sin(t * Math.PI * 2) * amplitude;
    return { x, y };
  });
}

function buildPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `Q ${cx} ${prev.y}, ${cx} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
    })
    .join(" ");
}

// 이동 거리는 --dx/--dy CSS var. scale은 펄스에서만.
const KEYFRAMES = `
@keyframes ruti-station-squash {
  0%   { transform: scaleY(1); }
  60%  { transform: scaleY(0.7); }
  100% { transform: scaleY(1); }
}
@keyframes ruti-station-move {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(var(--dx), var(--dy)); }
}
@keyframes ruti-station-pulse {
  0%, 100% { transform: scale(1); }
  16%      { transform: scale(1.3); }
  33%      { transform: scale(1); }
  50%      { transform: scale(1.3); }
  66%      { transform: scale(1); }
  83%      { transform: scale(1.3); }
}
@keyframes ruti-path-fill {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ruti-station-glow {
  0%   { opacity: 0; transform: scale(1); }
  30%  { opacity: 1; }
  100% { opacity: 0; transform: scale(5); }
}
`;
