"use client";

/* eslint-disable @next/next/no-img-element */
// next/image 대신 <img> 직접 사용 — 표지 URL 은 외부 도메인 + 동적 검색 결과라
// remote patterns 등록 부담이 크고 CORS/placeholder 단순화 목적.

import { Book, BookPart } from "@/types/book";
import { calcProgress, getActivePart, getActiveSection } from "@/utils/reading";

// 여정 카드 v3 — 커버를 레일의 시작점으로. 커버 바닥에서 레일이 흘러 나와 완독까지 이어짐.
// - 커버(52x74) 가 STATION 0 역할
// - 아래로 rail 이 내려오며 PART 노드 → 완독 순서로 이어짐
// - 현재 파트만 섹션 스트립 펼침 → 세로 공간 수렴
// - 한 화면에 수용되도록 파트 수 많아도 비율로 분배 (내부 스크롤 없음, 페이지 스크롤에 위임)

interface FullJourneyProps {
  book: Book;
  currentPage: number;
  coverUrl?: string | null;
}

// 레일 x 좌표 — 커버 중앙 및 노드 중앙이 이 축에 정렬된다.
const RAIL_X = 30;

export default function FullJourney({
  book,
  currentPage,
  coverUrl,
}: FullJourneyProps) {
  // parts 가 비어있는 책(등록 직후 OCR 전)은 렌더 생략 — NaN 방지.
  if (!book.parts || book.parts.length === 0) return null;

  const overall = calcProgress(currentPage, book.totalPages);
  const safePage = Math.max(1, currentPage);
  const activeSection = getActiveSection(book, safePage);
  const activePart = getActivePart(book, safePage);
  const currentPartIdx = book.parts.findIndex((p) => p.index === activePart.index);
  const activeSectionKey = `${activeSection.startPage}-${activeSection.endPage}`;
  const isFinished = overall >= 100;

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
      {/* 매거진 헤드라인 — caps 라벨 vs light 숫자의 타이포 대비 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 14,
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

      {/* 레일 컨테이너 — 레일은 커버 하단에서 시작해 완독까지 흐른다. */}
      <div style={{ position: "relative", paddingLeft: RAIL_X + 20 }}>
        {/* 레일 배경 — 커버 아래에서 시작. top 76 = 커버 74 + 2 여유. */}
        <div
          style={{
            position: "absolute",
            left: RAIL_X - 1,
            top: 76,
            bottom: 4,
            width: 2,
            background: "#1A1A1A",
            borderRadius: 1,
          }}
        />
        {/* 레일 차오름 — 전체 진행률 비례. 위에서 아래로 초록이 흘러 내림. */}
        <div
          style={{
            position: "absolute",
            left: RAIL_X - 1,
            top: 76,
            height: `calc((100% - 80px) * ${overall / 100})`,
            width: 2,
            background: "linear-gradient(180deg, #00FF7A 0%, #00B858 100%)",
            borderRadius: 1,
            boxShadow: "0 0 6px rgba(0,255,122,0.5)",
            transition: "height 600ms ease",
          }}
        />

        {/* ── STATION 0 : 커버 블록 ───────────────────── */}
        <div
          style={{
            position: "relative",
            marginLeft: -(RAIL_X + 20),
            paddingLeft: RAIL_X + 20,
            marginBottom: 10,
            minHeight: 74,
          }}
        >
          {/* 커버 썸네일 — 레일 중앙선(x=RAIL_X)에 센터 정렬 */}
          <div
            style={{
              position: "absolute",
              left: RAIL_X - 26,
              top: 0,
              width: 52,
              height: 74,
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

          {/* 커버 우측 — 제목 + 저자/출판사. 얇은 타이포로 커버 보조. */}
          <div style={{ paddingTop: 2 }}>
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
        </div>

        {/* ── PART 노드들 ─────────────────────────────── */}
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
            />
          );
        })}

        {/* ── GOAL : 완독 노드 ─────────────────────────── */}
        <div
          style={{
            position: "relative",
            marginLeft: -(RAIL_X + 20),
            paddingLeft: RAIL_X + 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: RAIL_X - 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: isFinished ? "#00FF7A" : "#0D0D0D",
              border: `1.5px solid ${isFinished ? "#00FF7A" : "#3A3A3A"}`,
              boxShadow: isFinished
                ? "0 0 14px rgba(0,255,122,0.65)"
                : "none",
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
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: isFinished ? "#00FF7A" : "#7A7A7A",
              letterSpacing: 2,
            }}
          >
            완독
          </span>
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
// 파트 행 — 과거/현재/미래 분기
// ─────────────────────────────────────────────────────────
interface PartRowProps {
  part: BookPart;
  isPast: boolean;
  isCurrent: boolean;
  partProgress: number;
  activeSectionKey: string;
  currentPage: number;
}

function PartRow({
  part,
  isPast,
  isCurrent,
  partProgress,
  activeSectionKey,
  currentPage,
}: PartRowProps) {
  return (
    <div
      style={{
        position: "relative",
        marginLeft: -(RAIL_X + 20),
        paddingLeft: RAIL_X + 20,
        marginBottom: isCurrent ? 10 : 6,
      }}
    >
      {/* 노드 — 현재만 링, 나머지는 도트. 레일 중앙선(x=RAIL_X)에 정렬. */}
      {isCurrent ? (
        <ProgressRingNode progress={partProgress} />
      ) : (
        <div
          style={{
            position: "absolute",
            left: RAIL_X - 8,
            top: 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: isPast ? "#1F4D33" : "#0D0D0D",
            border: `1.5px solid ${isPast ? "#00B858" : "#2A2A2A"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPast && (
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
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

      {/* 파트 라벨(caps 인덱스) + 타이틀 */}
      <div style={{ paddingTop: isCurrent ? 3 : 1 }}>
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
              fontSize: isCurrent ? 13 : 11,
              fontWeight: isCurrent ? 700 : 500,
              color: isCurrent ? "#E8E8E8" : isPast ? "#9A9A9A" : "#5A5A5A",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 210,
            }}
          >
            {part.title}
          </span>
        </div>

        {/* 현재 파트만 섹션 스트립 펼침 — 미니 도트 라인. */}
        {isCurrent && part.sections.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              marginTop: 7,
              paddingLeft: 1,
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 프로그레스 링 노드 — 현재 파트 전용.
// SVG stroke-dashoffset 로 진행률 표현 + 숨쉬는 glow.
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
        position: "absolute",
        left: RAIL_X - size / 2,
        top: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#0D0D0D",
        animation: "fj-breath 2.2s ease-in-out infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
