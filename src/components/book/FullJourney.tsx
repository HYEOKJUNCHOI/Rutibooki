"use client";

/* eslint-disable @next/next/no-img-element */
// next/image 대신 <img> 직접 사용 — 표지 URL 은 외부 도메인 + 동적 검색 결과라
// remote patterns 등록 부담이 크고 CORS/placeholder 단순화 목적.

import type { CSSProperties } from "react";
import { Book, BookPart, BookSection } from "@/types/book";
import { calcProgress, getActivePart, getActiveSection } from "@/utils/reading";
import { useBooksStore } from "@/store/booksStore";
import { splitTitle } from "@/utils/title";

// 여정 카드 v6 — 버스 노선 스타일 + "섹션 단위 역" 재구성.
//
// 철학 전환 [2026-04-22]:
//   이전: LEVEL(BookPart) 을 역(station) 으로 찍음 → 한 역이 너무 크고 "오늘 뭘 읽지?" 가 모호함.
//   이후: 가장 작은 독서 단위(섹션/BUTTON/챕터) 를 역으로 찍음. 타겟이 "작게라도 읽어라" 이기 때문.
//         LEVEL 은 역이 아니라 "역 그룹 헤더" — 레일 중간에 끼는 장 표지.
//
// 역 = 진입점(•) + 슬롯2(라벨+제목 한 줄 / 부제목 한 줄).
// 구분선은 UI 에 불필요 — "* — * — * — *" 는 개념 표현용 텍스트였으므로 제거.
// 역 사이 간격은 STATION_H 의 아래 여백(marginBottom 역할)으로만 유지.
// 그룹 헤더 = 좌우 대시 + 가운데 "LEVEL n  제목" + (선택) 부제목. 진입점 없음.
//
// 레일 y 계산은 "역 리스트" 기준이 아니라 "레일 항목 리스트(그룹 헤더 + 역 섞인 순서)" 기준으로
// 다시 계산되어야 함. 그룹 헤더도 높이를 먹어야 역끼리 사이가 일정해 보임.

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

// "2026.04.20" → "04.20" 정도. ISO 문자열이 아니면 그대로.
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}
const COVER_BOTTOM_Y = COVER_Y + COVER_H;
const FIRST_STEP_Y = 32; // 커버 → 첫 항목까지 짧게.

// ── 슬롯·행 높이 ─────────────────────────────────────────
// 역(station) = 슬롯 2개 + 아래 자연 여백 = STATION_H 고정.
// 그룹 헤더(group-header) = GROUP_HEADER_H 고정 — 역 사이 리듬에 편입.
// 구분선 제거로 DIVIDER_HEIGHT(16px) 만큼 역 간격이 줄어들어 16px 여백으로 대체.
const SLOT_NBSP = "\u00A0";
const SLOT_HEIGHT = 14;
const STATION_MARGIN_BOTTOM = 16; // 구분선 대신 자연 여백으로 역 사이 숨 유지
const STATION_H = SLOT_HEIGHT * 2 + STATION_MARGIN_BOTTOM + 8; // 슬롯2 + 아래 여백
const GROUP_HEADER_H = 48;

// ── 색 상수 ──────────────────────────────────────────────
const LABEL_COLOR = "#7A7A7A";
const SUBTITLE_COLOR = "#9A9A9A";
const GROUP_TITLE_COLOR = "#C8C8C8";
const GROUP_DASH_COLOR = "#3A3A3A";

// ─────────────────────────────────────────────────────────
// 레일 아이템 — 그룹 헤더 / 역(station) 섞인 순서 리스트.
// 역만 진입점(•) 노드를 가짐. 그룹 헤더는 장식.
// ─────────────────────────────────────────────────────────
type RailItem =
  | {
      kind: "group-header";
      part: BookPart;
      key: string;
    }
  | {
      kind: "station";
      part: BookPart;
      // section 없으면 part 자체를 역으로 렌더(케이스 B).
      section: BookSection | null;
      key: string;
      // 해당 역의 시작 페이지 — isPast/isCurrent 판정 기준.
      startPage: number;
      endPage: number;
    };

function buildRailItems(book: Book): RailItem[] {
  const items: RailItem[] = [];
  for (const part of book.parts) {
    if (part.sections && part.sections.length > 0) {
      // 케이스 A: 섹션 있는 책 — 대파트는 그룹 헤더로, 각 섹션이 역.
      items.push({
        kind: "group-header",
        part,
        key: `gh-${part.index}`,
      });
      for (let i = 0; i < part.sections.length; i++) {
        const sec = part.sections[i];
        items.push({
          kind: "station",
          part,
          section: sec,
          key: `st-${part.index}-${i}`,
          startPage: sec.startPage,
          endPage: sec.endPage,
        });
      }
    } else {
      // 케이스 B: 섹션 없는 책 — 대파트 자체가 역. 그룹 헤더 없음.
      items.push({
        kind: "station",
        part,
        section: null,
        key: `st-${part.index}`,
        startPage: part.startPage,
        endPage: part.endPage,
      });
    }
  }
  return items;
}

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
  const isFinished = overall >= 100;

  const items = buildRailItems(book);

  // 각 아이템 y 상단 좌표 — 커버 바로 아래부터 순차 누적.
  // 그룹 헤더와 역이 각자 다른 높이를 먹으므로 y 는 "이전 아이템 높이 합"을 누적.
  const itemTops: number[] = [];
  let cursor = COVER_BOTTOM_Y + FIRST_STEP_Y;
  for (let i = 0; i < items.length; i++) {
    itemTops.push(cursor);
    const h = items[i].kind === "group-header" ? GROUP_HEADER_H : STATION_H;
    cursor += h;
  }
  // 완독 노드는 마지막 아이템 끝에서 약간 여유 두고.
  const goalY = cursor + 12;
  const svgHeight = goalY + 16;

  // "현재 역" 인덱스 판정 — 섹션 단위로.
  //   케이스 A: activeSection 과 매칭되는 station item.
  //   케이스 B: activePart 와 매칭되는 station item.
  // TODO(혁준, 2026-04-22): readingStore 에 section 단위 현재 위치 저장 확장.
  //   현재는 currentPage → getActiveSection 으로 파생 — 이미 섹션 단위로 작동하므로 호환됨.
  const currentStationIdx = items.findIndex((it) => {
    if (it.kind !== "station") return false;
    if (it.section) {
      return (
        it.part.index === activePart.index &&
        it.section.startPage === activeSection.startPage &&
        it.section.endPage === activeSection.endPage
      );
    }
    // 섹션 없는 역 = 대파트 자체.
    return it.part.index === activePart.index;
  });

  // 역 노드만 X 스윙 적용 — 그룹 헤더는 중앙 정렬로 따로 렌더.
  // 스윙 t 는 "전체 역 개수 중 몇 번째 역인가" 기준 — 그룹 헤더로 리듬 깨지지 않게.
  const stationIndices: number[] = items
    .map((it, i) => (it.kind === "station" ? i : -1))
    .filter((i) => i !== -1);
  const stationCount = stationIndices.length;

  function nodeXForStation(itemIdx: number): number {
    if (stationCount <= 1) return RAIL_CX;
    const order = stationIndices.indexOf(itemIdx);
    const t = order / (stationCount - 1);
    const base = Math.sin(t * Math.PI * 1.8) * RAIL_AMP;
    const wobble = Math.sin(t * Math.PI * 5.1 + 0.4) * (RAIL_AMP * 0.28);
    return RAIL_CX + base + wobble;
  }

  // 각 역의 "진입점 y" = 해당 아이템 top + 슬롯[1] 중앙.
  //   슬롯[1] 중앙 = SLOT_HEIGHT/2 위치. 라벨 블록을 nodeY - SLOT_HEIGHT/2 에 맞춰 둠.
  function nodeYForStation(itemIdx: number): number {
    return itemTops[itemIdx] + SLOT_HEIGHT / 2;
  }

  // 레일 path — 커버 바닥 → 각 역 노드 → 완독.
  // 그룹 헤더 구간은 노드가 없지만 레일은 그 구간을 직선으로 통과.
  const points: Array<{ x: number; y: number; dashed?: boolean }> = [
    { x: RAIL_CX, y: COVER_BOTTOM_Y + 2 },
  ];
  for (const si of stationIndices) {
    points.push({ x: nodeXForStation(si), y: nodeYForStation(si) });
  }
  points.push({ x: RAIL_CX, y: goalY });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    pathD += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }

  // 그룹 헤더 구간의 레일 강조(점선) — 역이 아니라 "전환 구간" 임을 암시.
  // group-header 아이템의 y 범위만 커버하는 세로선 오버레이를 역 사이에 그림.
  const groupHeaderBands: Array<{ y1: number; y2: number }> = items
    .map((it, i) =>
      it.kind === "group-header"
        ? { y1: itemTops[i], y2: itemTops[i] + GROUP_HEADER_H }
        : null,
    )
    .filter((b): b is { y1: number; y2: number } => b !== null);

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
      <div
        style={{
          position: "relative",
          width: "100%",
          height: svgHeight,
        }}
      >
        {/* 커브 레일 — SVG 로 뒤에 깔고, 노드·라벨은 div 로 앞에 올림 */}
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
          {/* 레일 4겹 레이어 — 기존 유지 */}
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
          {/* 그룹 헤더 구간 — 얇은 점선 세로선으로 "전환 구간" 암시.
              RAIL_CX 수직선이 아니라 실제 path 위로 덧칠 효과를 주기 어려우니
              그룹 헤더 y 범위에 RAIL_CX 기준 짧은 점선을 별도로 깜. */}
          {groupHeaderBands.map((b, i) => (
            <line
              key={`gh-band-${i}`}
              x1={RAIL_CX}
              y1={b.y1}
              x2={RAIL_CX}
              y2={b.y2}
              stroke="#2A2A2A"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ))}
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

        {/* 진행률 % — 커버 오른쪽 상단 */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: COVER_Y + 4,
            height: 38,
            display: "flex",
            alignItems: "center",
            paddingRight: 4,
          }}
        >
          {overall === 0 ? (
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

        {/* 커버 블록 */}
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

        {/* 커버 우측 메타 블록 */}
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
            {formatShortDate(book.registeredAt)} 부터
          </div>
          {(() => {
            const { main, sub } = splitTitle(book.title);
            return (
              <>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#E8E8E8",
                    letterSpacing: "-0.3px",
                    lineHeight: 1.2,
                    marginBottom: sub ? 1 : 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: sub ? 1 : 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {main}
                </div>
                {sub && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: "#8A8A8A",
                      letterSpacing: "-0.2px",
                      lineHeight: 1.2,
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sub}
                  </div>
                )}
              </>
            );
          })()}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "#7A7A7A",
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {book.author}
            </span>
            {book.category && (
              <span
                style={{
                  flexShrink: 0,
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 8,
                  fontWeight: 600,
                  color: "#B8D4FF",
                  background: "rgba(90,140,220,0.12)",
                  border: "1px solid rgba(90,140,220,0.35)",
                  letterSpacing: "-0.1px",
                  lineHeight: 1.3,
                }}
              >
                {book.category}
              </span>
            )}
          </div>
        </div>

        {/* 레일 아이템 — 그룹 헤더 + 역 섞인 순서 */}
        {items.map((it, idx) => {
          if (it.kind === "group-header") {
            return (
              <GroupHeader
                key={it.key}
                part={it.part}
                top={itemTops[idx]}
                labelXPct={(LABEL_X / SVG_W) * 100}
              />
            );
          }
          // station
          const isPast = idx < currentStationIdx;
          const isCurrent = idx === currentStationIdx;
          const stLen = Math.max(1, it.endPage - it.startPage + 1);
          const stProgress = isCurrent
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round(((currentPage - it.startPage + 1) / stLen) * 100),
                ),
              )
            : 0;
          return (
            <StationRow
              key={it.key}
              part={it.part}
              section={it.section}
              isPast={isPast}
              isCurrent={isCurrent}
              stationProgress={stProgress}
              currentPage={currentPage}
              nodeXPct={(nodeXForStation(idx) / SVG_W) * 100}
              nodeY={nodeYForStation(idx)}
              labelXPct={(LABEL_X / SVG_W) * 100}
              startPage={it.startPage}
            />
          );
        })}

        {/* 완독 — 종점 */}
        <div
          style={{
            position: "absolute",
            left: `${(RAIL_CX / SVG_W) * 100}%`,
            top: goalY,
            transform: "translate(-50%, -50%)",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isFinished
              ? "#00FF7A"
              : !book.goalDate
                ? "#FFD400"
                : "#0D0D0D",
            border: `2px solid ${
              isFinished ? "#00FF7A" : !book.goalDate ? "#FFD400" : "#3A3A3A"
            }`,
            boxShadow: isFinished
              ? "0 0 0 4px rgba(0,255,122,0.2), 0 0 14px rgba(0,255,122,0.65)"
              : "0 0 0 3px rgba(58,58,58,0.18), 0 2px 4px rgba(0,0,0,0.6)",
            animation:
              !isFinished && !book.goalDate
                ? "fj-goal-blink 1.7s ease-in-out infinite"
                : undefined,
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
              background: isFinished
                ? "#000"
                : !book.goalDate
                  ? "#000"
                  : "#3A3A3A",
            }}
          />
        </div>
        <label
          style={{
            position: "absolute",
            left: `${(LABEL_X / SVG_W) * 100}%`,
            top: goalY - 6,
            fontSize: 10,
            fontWeight: 700,
            color: isFinished ? "#00FF7A" : "#7A7A7A",
            letterSpacing: 2,
            cursor: "pointer",
          }}
        >
          {book.goalDate ? `${formatShortDate(book.goalDate)} 까지` : "— 까지"}
          <input
            type="date"
            value={book.goalDate ? book.goalDate.slice(0, 10) : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              useBooksStore.getState().updateBook(book.id, {
                goalDate: new Date(v).toISOString(),
              });
            }}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              pointerEvents: "auto",
              border: "none",
              background: "transparent",
            }}
          />
        </label>
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
        @keyframes fj-goal-blink {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255,212,0,0.55), 0 0 10px rgba(255,212,0,0.5);
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 0 8px rgba(255,212,0,0), 0 0 18px rgba(255,212,0,0.9);
            opacity: 0.55;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 그룹 헤더 — 역이 아니라 "장 표지". 진입점 없음.
// 좌우 대시 + 중앙 "LEVEL n  제목", 아래 부제목(있으면).
// ─────────────────────────────────────────────────────────
function GroupHeader({
  part,
  top,
  labelXPct,
}: {
  part: BookPart;
  top: number;
  labelXPct: number;
}) {
  const label = part.label || `PART ${part.index}`;
  return (
    <div
      style={{
        position: "absolute",
        left: `${labelXPct}%`,
        top,
        right: 0,
        paddingRight: 4,
        height: GROUP_HEADER_H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
      }}
    >
      {/* 라벨 + 제목 한 줄 — 좌우에 대시 장식으로 "장 경계" 느낌 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: GROUP_DASH_COLOR,
            letterSpacing: 0,
            flexShrink: 0,
          }}
        >
          ━━
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: GROUP_TITLE_COLOR,
            letterSpacing: 1,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: GROUP_TITLE_COLOR,
            letterSpacing: "-0.3px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {part.title}
        </span>
        <span
          style={{
            fontSize: 10,
            color: GROUP_DASH_COLOR,
            letterSpacing: 0,
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          ━━
        </span>
      </div>
      {part.subtitle ? (
        <div
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: "#8A8A8A",
            letterSpacing: "-0.2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {part.subtitle}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 역(Station) — 슬롯2 고정. 진입점(•) + 라벨행 + 부제목.
// ─────────────────────────────────────────────────────────
interface StationRowProps {
  part: BookPart;
  section: BookSection | null;
  isPast: boolean;
  isCurrent: boolean;
  stationProgress: number;
  currentPage: number;
  nodeXPct: number;
  nodeY: number;
  labelXPct: number;
  startPage: number;
}

function StationSlot({
  text,
  style,
}: {
  text: string;
  style: CSSProperties;
}) {
  return (
    <div
      style={{
        height: SLOT_HEIGHT,
        lineHeight: `${SLOT_HEIGHT}px`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...style,
      }}
    >
      {text || SLOT_NBSP}
    </div>
  );
}

// 라벨+제목 한 줄. 라벨 비어있으면 gap 없이 제목만 — 레이아웃 안 깨지도록.
function StationLabelRow({
  label,
  title,
  labelColor,
  titleColor,
  titleSize,
  titleWeight,
}: {
  label: string;
  title: string;
  labelColor: string;
  titleColor: string;
  titleSize: number;
  titleWeight: number;
}) {
  return (
    <div
      style={{
        height: SLOT_HEIGHT,
        lineHeight: `${SLOT_HEIGHT}px`,
        display: "flex",
        alignItems: "center",
        gap: label ? 6 : 0,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {label ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: labelColor,
            letterSpacing: 0.8,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          fontSize: titleSize,
          fontWeight: titleWeight,
          color: titleColor,
          letterSpacing: "-0.3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {title || SLOT_NBSP}
      </span>
    </div>
  );
}

function StationRow({
  part,
  section,
  isPast,
  isCurrent,
  stationProgress,
  currentPage,
  nodeXPct,
  nodeY,
  labelXPct,
  startPage,
}: StationRowProps) {
  // 역 라벨/제목/부제목 — 케이스 A(섹션 있음) vs 케이스 B(섹션 없음) 분기.
  //   A: section 의 label/title/subtitle 사용.
  //   B: part 의 label/title/subtitle 사용.
  const label = section
    ? (section.label ?? "")
    : (part.label ?? ""); // 케이스 B 에서 라벨 없을 수 있음 — 비어있으면 gap 없이 제목만
  const title = section ? section.title : part.title;
  const sub = section ? (section.subtitle ?? "") : (part.subtitle ?? "");

  const labelColor = isCurrent
    ? "#00FF7A"
    : isPast
      ? "#00B858"
      : "#4A4A4A";
  const titleColor = isCurrent
    ? "#E8E8E8"
    : isPast
      ? "#9A9A9A"
      : "#6A6A6A";
  const subColor = isCurrent
    ? SUBTITLE_COLOR
    : isPast
      ? "#6A6A6A"
      : "#5A5A5A";

  return (
    <>
      {/* 진입점(•) 노드 — 현재 역이면 링 프로그레스, 아니면 정류장 원 */}
      {isCurrent ? (
        <div
          style={{
            position: "absolute",
            left: `${nodeXPct}%`,
            top: nodeY,
            transform: "translate(-50%, -50%)",
          }}
        >
          <ProgressRingNode progress={stationProgress} page={currentPage} />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: `${nodeXPct}%`,
            top: nodeY,
            transform: "translate(-50%, -50%)",
            width: isPast ? 18 : 22,
            height: isPast ? 18 : 22,
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
          {isPast ? (
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
          ) : (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "#6A6A6A",
                letterSpacing: "-0.3px",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {startPage}
            </span>
          )}
        </div>
      )}

      {/* 라벨 블록 — 슬롯2. 진입점(•)은 슬롯[1] 중앙에 정렬. */}
      <div
        style={{
          position: "absolute",
          left: `${labelXPct}%`,
          top: nodeY - SLOT_HEIGHT / 2,
          right: 0,
          paddingRight: 4,
          marginBottom: STATION_MARGIN_BOTTOM,
        }}
      >
        <StationLabelRow
          label={label}
          title={title}
          labelColor={labelColor}
          titleColor={titleColor}
          titleSize={isCurrent ? 13 : 12}
          titleWeight={isCurrent ? 700 : 600}
        />
        <StationSlot
          text={sub}
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: subColor,
            letterSpacing: "-0.2px",
          }}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 프로그레스 링 노드 — 현재 역 전용.
// ─────────────────────────────────────────────────────────
function ProgressRingNode({
  progress,
  page,
}: {
  progress: number;
  page: number;
}) {
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
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {page}
      </span>
    </div>
  );
}
