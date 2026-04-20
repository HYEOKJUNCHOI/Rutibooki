"use client";

/* eslint-disable @next/next/no-img-element */
// next/image 대신 <img> 직접 사용 — 표지 URL 은 외부 도메인 + 동적 검색 결과라
// remote patterns 등록 부담이 크고 CORS/placeholder 단순화 목적.

import { Book, BookPart } from "@/types/book";
import { calcProgress, getActivePart, getActiveSection } from "@/utils/reading";

// 여정 카드 v5 — 버스 노선 스타일.
// - 레일 = "도로": 두꺼운 어두운 스트로크 + 중앙 차선 점선으로 레이어링.
// - 곡선은 단일 sine 가 아니라 다주파 합성으로 유기적 굴곡 — 지하철 노선도(일정) 아닌 버스 노선(유기적).
// - 노드 = "정류장": 원 + 은은한 외부 halo 로 "여기 멈춤" 느낌.
// - 진행률 = 녹색 페인트 덧칠: 지나온 경로만 형광 초록으로 glow.
// - 커버가 시발 정류장, 완독이 종점. 파트들은 중간 정류장.

interface FullJourneyProps {
  book: Book;
  currentPage: number;
  coverUrl?: string | null;
}

// ── 레이아웃 상수 ───────────────────────────────────────
const SVG_W = 280; // 카드 내부 가용 폭. viewBox 기준.
const RAIL_CX = 46; // 레일 중심선 x — 커버·완독 노드가 이 선에 정렬.
const RAIL_AMP = 22; // 좌우 스윙 진폭.
const LABEL_X = 86; // 우측 라벨 컬럼 시작 x. (RAIL_CX + RAIL_AMP + 여유 18)
const COVER_W = 52;
const COVER_H = 74;
const COVER_Y = 0; // 커버 상단 y.
const COVER_BOTTOM_Y = COVER_Y + COVER_H;
const RAIL_START_Y = COVER_BOTTOM_Y + 4; // 커버 바로 아래에서 레일 시작.
const PART_ROW_H = 56; // 파트 행 기본 높이.
const CURRENT_EXTRA = 24; // 현재 파트 섹션 스트립 공간.
const GOAL_GAP = 34; // 마지막 파트 → 완독 여백.

export default function FullJourney({
  book,
  currentPage,
  coverUrl,
}: FullJourneyProps) {
  if (!book.parts || book.parts.length === 0) return null;

  const overall = calcProgress(currentPage, book.totalPages);
  const safePage = Math.max(1, currentPage);
  const activeSection = getActiveSection(book, safePage);
  const activePart = getActivePart(book, safePage);
  const currentPartIdx = book.parts.findIndex(
    (p) => p.index === activePart.index,
  );
  const activeSectionKey = `${activeSection.startPage}-${activeSection.endPage}`;
  const isFinished = overall >= 100;

  // 각 파트 노드의 y — 현재 파트는 섹션 스트립 공간 확보.
  const partYs: number[] = [];
  let cursor = RAIL_START_Y + PART_ROW_H / 2; // 첫 파트 중심 위치
  for (let i = 0; i < book.parts.length; i++) {
    partYs.push(cursor);
    const rowH =
      PART_ROW_H + (i === currentPartIdx ? CURRENT_EXTRA : 0);
    // 다음 파트까지 거리 — 이번 행의 남은 절반 + 다음 행의 절반.
    cursor += rowH / 2 + PART_ROW_H / 2;
  }
  const goalY = partYs[partYs.length - 1] + PART_ROW_H / 2 + GOAL_GAP;
  const svgHeight = goalY + 12;

  // 파트 노드 x — 다주파 합성으로 유기적 굴곡. 단일 sin 은 대칭이라 "지하철 노선도" 느낌.
  // 저주파 2π + 고주파 5π*0.3 결합 → 대칭성 깨고 동네 골목 도는 버스 노선 감성.
  const partXs: number[] = book.parts.map((_, i) => {
    if (book.parts.length === 1) return RAIL_CX;
    const t = i / (book.parts.length - 1);
    const base = Math.sin(t * Math.PI * 1.8) * RAIL_AMP;
    const wobble = Math.sin(t * Math.PI * 5.1 + 0.4) * (RAIL_AMP * 0.28);
    return RAIL_CX + base + wobble;
  });

  // SVG path — 커버 바닥 → 각 파트 노드 → 완독. Smooth cubic bezier.
  const points: Array<{ x: number; y: number }> = [
    { x: RAIL_CX, y: COVER_BOTTOM_Y + 2 },
    ...partXs.map((x, i) => ({ x, y: partYs[i] })),
    { x: RAIL_CX, y: goalY },
  ];

  // 부드러운 S자 — 각 구간을 수직 중점을 제어점으로 하는 cubic bezier 로 연결.
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    pathD += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #0D0D0D 0%, #080808 100%)",
        border: "1px solid #1A1A1A",
        borderRadius: 14,
        padding: "14px 18px 16px",
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      {/* 매거진 헤드라인 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#7A7A7A",
            letterSpacing: 2.4,
          }}
        >
          JOURNEY
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: "#E8E8E8",
            letterSpacing: "-0.8px",
            lineHeight: 1,
          }}
        >
          {overall}
          <span
            style={{
              fontSize: 10,
              color: "#5A5A5A",
              marginLeft: 2,
              fontWeight: 500,
            }}
          >
            %
          </span>
        </span>
      </div>

      {/* 여정 캔버스 — SVG 배경 + 절대 배치된 커버/노드/라벨 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: svgHeight,
        }}
      >
        {/* 커브 레일 — SVG 로 그려 뒤에 깔고, 노드·라벨은 div 로 앞에 올림 */}
        <svg
          viewBox={`0 0 ${SVG_W} ${svgHeight}`}
          width="100%"
          height={svgHeight}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
          preserveAspectRatio="xMinYMin meet"
          aria-hidden
        >
          {/* ── 버스 노선: 레이어 4겹 ──
              1) 도로 가장자리(바깥 테두리) — 폭 6, 아주 어두운 톤으로 도로 윤곽.
              2) 도로 본체 — 폭 4, 약간 밝은 톤으로 노면.
              3) 중앙 차선 점선 — 노면 위 점선.
              4) 진행률 초록 페인트 — 지나온 구간만 덧칠 + glow. */}
          <path
            d={pathD}
            fill="none"
            stroke="#222"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#141414"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#3A3A3A"
            strokeWidth={0.8}
            strokeDasharray="5 6"
            strokeLinecap="round"
          />
          {overall > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke="#00FF7A"
              strokeWidth={3}
              strokeDasharray={`${overall} 100`}
              strokeLinecap="round"
              pathLength={100}
              style={{
                filter: "drop-shadow(0 0 4px rgba(0,255,122,0.65))",
                transition: "stroke-dasharray 600ms ease",
              }}
            />
          )}
        </svg>

        {/* 커버 + 메타 블록 */}
        <div
          style={{
            position: "absolute",
            left: `${(RAIL_CX / SVG_W) * 100}%`,
            top: COVER_Y,
            transform: "translateX(-50%)",
            width: COVER_W,
            height: COVER_H,
            borderRadius: 4,
            overflow: "hidden",
            background: "#151515",
            border: "1px solid #2A2A2A",
            boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: "#5A5A5A",
              }}
            >
              {book.title.slice(0, 1)}
            </div>
          )}
        </div>

        {/* 커버 우측 — 책 메타(START 라벨 + 제목 + 저자/출판사) */}
        <div
          style={{
            position: "absolute",
            left: `${(LABEL_X / SVG_W) * 100}%`,
            top: COVER_Y + 4,
            right: 0,
            paddingRight: 4,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#5A5A5A",
              letterSpacing: 1.8,
              marginBottom: 4,
            }}
          >
            START
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#E8E8E8",
              letterSpacing: "-0.3px",
              lineHeight: 1.25,
              marginBottom: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {book.title}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#7A7A7A",
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {book.author}
            {book.publisher ? ` · ${book.publisher}` : ""}
          </div>
        </div>

        {/* 파트 노드 + 라벨 */}
        {book.parts.map((part, idx) => {
          const isPast = idx < currentPartIdx;
          const isCurrent = idx === currentPartIdx;
          const partLen = Math.max(1, part.endPage - part.startPage + 1);
          const partProgress = isCurrent
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    ((currentPage - part.startPage + 1) / partLen) * 100,
                  ),
                ),
              )
            : 0;

          return (
            <PartRow
              key={part.index}
              part={part}
              isPast={isPast}
              isCurrent={isCurrent}
              partProgress={partProgress}
              activeSectionKey={activeSectionKey}
              currentPage={currentPage}
              nodeXPct={(partXs[idx] / SVG_W) * 100}
              nodeY={partYs[idx]}
              labelXPct={(LABEL_X / SVG_W) * 100}
            />
          );
        })}

        {/* 완독 — 종점. 도로 끝의 마지막 정류장. */}
        <div
          style={{
            position: "absolute",
            left: `${(RAIL_CX / SVG_W) * 100}%`,
            top: goalY,
            transform: "translate(-50%, -50%)",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isFinished ? "#00FF7A" : "#0D0D0D",
            border: `2px solid ${isFinished ? "#00FF7A" : "#3A3A3A"}`,
            boxShadow: isFinished
              ? "0 0 0 4px rgba(0,255,122,0.2), 0 0 14px rgba(0,255,122,0.65)"
              : "0 0 0 3px rgba(58,58,58,0.18), 0 2px 4px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: isFinished ? "#000" : "#3A3A3A",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: `${(LABEL_X / SVG_W) * 100}%`,
            top: goalY - 6,
            fontSize: 10,
            fontWeight: 700,
            color: isFinished ? "#00FF7A" : "#7A7A7A",
            letterSpacing: 2,
          }}
        >
          완독
        </div>
      </div>

      <style>{`
        @keyframes fj-breath {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,122,0.25), 0 0 14px rgba(0,255,122,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(0,255,122,0), 0 0 20px rgba(0,255,122,0.6); }
        }
        @keyframes fj-section-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 파트 행 — 노드(좌우 스윙) + 라벨(우측 고정 컬럼)
// ─────────────────────────────────────────────────────────
interface PartRowProps {
  part: BookPart;
  isPast: boolean;
  isCurrent: boolean;
  partProgress: number;
  activeSectionKey: string;
  currentPage: number;
  nodeXPct: number; // % of container width
  nodeY: number; // px in SVG coords
  labelXPct: number; // % of container width
}

function PartRow({
  part,
  isPast,
  isCurrent,
  partProgress,
  activeSectionKey,
  currentPage,
  nodeXPct,
  nodeY,
  labelXPct,
}: PartRowProps) {
  return (
    <>
      {/* 노드 */}
      {isCurrent ? (
        <div
          style={{
            position: "absolute",
            left: `${nodeXPct}%`,
            top: nodeY,
            transform: "translate(-50%, -50%)",
          }}
        >
          <ProgressRingNode progress={partProgress} />
        </div>
      ) : (
        // 버스 정류장 — 원 + 은은한 외부 halo 링(도로 위에 "여기 멈춤" 느낌).
        <div
          style={{
            position: "absolute",
            left: `${nodeXPct}%`,
            top: nodeY,
            transform: "translate(-50%, -50%)",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isPast ? "#1F4D33" : "#0D0D0D",
            border: `2px solid ${isPast ? "#00B858" : "#3A3A3A"}`,
            boxShadow: isPast
              ? "0 0 0 3px rgba(0,184,88,0.12), 0 2px 4px rgba(0,0,0,0.6)"
              : "0 0 0 3px rgba(58,58,58,0.18), 0 2px 4px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPast && (
            <svg width="9" height="9" viewBox="0 0 8 8" aria-hidden>
              <path
                d="M1.5 4.2 L3.3 6 L6.5 2.2"
                stroke="#00FF7A"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
        </div>
      )}

      {/* 라벨 블록 — 우측 고정 컬럼. 노드 y 에 맞춰 수직 정렬. */}
      <div
        style={{
          position: "absolute",
          left: `${labelXPct}%`,
          top: nodeY,
          transform: "translateY(-50%)",
          right: 0,
          paddingRight: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: isCurrent ? "#00FF7A" : isPast ? "#00B858" : "#4A4A4A",
              letterSpacing: 1.5,
              flexShrink: 0,
            }}
          >
            PART {String(part.index).padStart(2, "0")}
          </span>
          <span
            style={{
              fontSize: isCurrent ? 12 : 11,
              fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? "#E8E8E8" : isPast ? "#9A9A9A" : "#5A5A5A",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {part.title}
          </span>
        </div>

        {/* 현재 파트만 섹션 스트립 */}
        {isCurrent && part.sections.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              marginTop: 7,
              paddingRight: 10,
            }}
          >
            {part.sections.map((s, i) => {
              const key = `${s.startPage}-${s.endPage}`;
              const isSecCurrent = key === activeSectionKey;
              const isSecPast = currentPage > s.endPage && !isSecCurrent;
              const isLast = i === part.sections.length - 1;
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: isLast ? "0 0 auto" : 1,
                  }}
                >
                  <div
                    style={{
                      width: isSecCurrent ? 7 : 5,
                      height: isSecCurrent ? 7 : 5,
                      borderRadius: "50%",
                      background: isSecCurrent
                        ? "#00FF7A"
                        : isSecPast
                          ? "#00B858"
                          : "#2A2A2A",
                      boxShadow: isSecCurrent
                        ? "0 0 8px rgba(0,255,122,0.7)"
                        : "none",
                      animation: isSecCurrent
                        ? "fj-section-pulse 1.4s ease-in-out infinite"
                        : undefined,
                      flex: "0 0 auto",
                    }}
                  />
                  {!isLast && (
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background:
                          isSecPast || isSecCurrent ? "#00B858" : "#2A2A2A",
                        margin: "0 3px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 프로그레스 링 노드 — 현재 파트 전용. stroke-dashoffset 로 진행률.
// ─────────────────────────────────────────────────────────
function ProgressRingNode({ progress }: { progress: number }) {
  const size = 24;
  const stroke = 2.2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#0D0D0D",
        animation: "fj-breath 2.2s ease-in-out infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2A2A2A"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#00FF7A"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <span
        style={{
          fontSize: 8,
          fontWeight: 800,
          color: "#E8E8E8",
          letterSpacing: "-0.3px",
          position: "relative",
          lineHeight: 1,
        }}
      >
        {progress}
      </span>
    </div>
  );
}
