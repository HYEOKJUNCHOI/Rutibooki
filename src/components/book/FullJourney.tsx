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
// 책(커버) → PART 1 간격을 기준 단위로, 모든 정류장 사이를 균등 간격으로 배치.
// 현재 파트의 섹션 스트립은 별도 행 높이를 먹지 않고 라벨 블록 안에서 오버플로우 — 레이아웃 리듬 보존.
const STEP_Y = 64; // 정류장(커버 포함) 간 도로 길이.

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

  // 각 파트 노드의 y — 커버→PART1 은 짧게(STEP_Y/2), 이후 정류장은 STEP_Y 균등.
  // 시작점이 너무 멀어보여 답답한 인상을 주던 문제를 절반으로 좁혀 해결.
  const partYs: number[] = [];
  const FIRST_STEP_Y = STEP_Y / 2;
  for (let i = 0; i < book.parts.length; i++) {
    partYs.push(COVER_BOTTOM_Y + FIRST_STEP_Y + i * STEP_Y);
  }
  // 마지막 PART → 완독은 기본 간격의 약 80% — 절반은 너무 붙고, 풀은 너무 텅 빔.
  const goalY = partYs[partYs.length - 1] + STEP_Y * 0.7;
  // 현재 파트의 섹션 스트립이 라벨 블록 아래로 내려오므로 svgHeight 는 여유를 둠.
  const svgHeight = goalY + (currentPartIdx >= 0 ? 24 : 12);

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
      {/* 여정 캔버스 — SVG 배경 + 절대 배치된 커버/노드/라벨.
          진행률(%)은 캔버스 내부에서 START/제목 두 줄과 같은 열 높이에 우측 정렬. */}
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

        {/* 진행률 — START + 제목 두 줄 묶음의 우측 끝에 세로 중앙 정렬.
            색은 진행 중임을 강조하는 브랜드 그린. */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: COVER_Y + 4,
            height: 38, // START(라벨) + 제목 한 줄 대략 합 — 두 줄 가운데 정렬 기준.
            display: "flex",
            alignItems: "center",
            paddingRight: 4,
          }}
        >
          {overall === 0 ? (
            // 0% 는 "아직 0" 이 아니라 "이제 시작" 의 상태 — 숫자 대신 CTA 성 문구.
            // 앱 버튼 "책 펼쳤어요" 와 톤 통일 위해 "펼쳐보기".
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#00FF7A",
                letterSpacing: "-0.3px",
                lineHeight: 1,
                textShadow: "0 0 10px rgba(0,255,122,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              펼쳐보기
            </span>
          ) : (
            <span
              style={{
                fontSize: 32,
                fontWeight: 400,
                color: "#00FF7A",
                letterSpacing: "-0.8px",
                lineHeight: 1,
                textShadow: "0 0 10px rgba(0,255,122,0.35)",
              }}
            >
              {overall}
              <span
                style={{
                  fontSize: 13,
                  color: "#00B858",
                  marginLeft: 2,
                  fontWeight: 500,
                }}
              >
                %
              </span>
            </span>
          )}
        </div>

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

        {/* 커버 우측 — 책 메타(START 라벨 + 제목 + 저자/출판사).
            우측 % 와 겹치지 않도록 paddingRight 확보. */}
        <div
          style={{
            position: "absolute",
            left: `${(LABEL_X / SVG_W) * 100}%`,
            top: COVER_Y + 4,
            right: 0,
            paddingRight: 72,
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
        {/* 제목은 " — " (em dash) 기준으로 분할:
            윗줄 = 태그(LEVEL 0 · 생존), 아랫줄 = 본문 타이틀(고장 난 엔진을 다시 켜는 법).
            태그가 없으면 전체를 본문으로 간주. */}
        {(() => {
          const [tag, ...rest] = part.title.split(" — ");
          const bodyTitle = rest.join(" — ").trim();
          const hasSplit = bodyTitle.length > 0;
          return (
            <div>
              {/* 윗줄 — PART 인덱스 + 태그(subtitle) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: hasSplit ? 3 : 0,
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: isCurrent
                      ? "#00FF7A"
                      : isPast
                        ? "#00B858"
                        : "#4A4A4A",
                    letterSpacing: 1.5,
                    flexShrink: 0,
                  }}
                >
                  PART {String(part.index).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isCurrent
                      ? "#9AE0B9"
                      : isPast
                        ? "#7A9A8A"
                        : "#5A5A5A",
                    letterSpacing: "-0.2px",
                    lineHeight: 1.25,
                    // 태그가 길 수 있으나 1줄 유지 — 긴 본문은 아래줄로 내려감.
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {tag}
                </span>
              </div>
              {/* 아랫줄 — 본문 타이틀(대시 뒤). 시각적 강조 포인트. */}
              {hasSplit && (
                <div
                  style={{
                    fontSize: isCurrent ? 13 : 12,
                    fontWeight: isCurrent ? 700 : 600,
                    color: isCurrent
                      ? "#E8E8E8"
                      : isPast
                        ? "#9A9A9A"
                        : "#6A6A6A",
                    letterSpacing: "-0.3px",
                    lineHeight: 1.3,
                    wordBreak: "keep-all",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {bodyTitle}
                </div>
              )}
              {/* 페이지 범위 — 각 정류장이 책의 어느 구간인지 즉각 파악.
                  현재 파트만 살짝 강조, 나머지는 뮤트 톤. */}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: isCurrent
                    ? "#7AB894"
                    : isPast
                      ? "#5A7A6A"
                      : "#4A4A4A",
                  letterSpacing: 0.3,
                  marginTop: 3,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                p.{part.startPage}–{part.endPage}
              </div>
            </div>
          );
        })()}

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
