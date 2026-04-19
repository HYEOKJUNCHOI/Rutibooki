"use client";

import { Book, BookPart } from "@/types/book";
import { calcProgress, getActivePart, getActiveSection } from "@/utils/reading";

// 에디토리얼 타임라인 스타일 독서 여정 (v2).
// - 왼쪽 세로 레일이 전체 진행률만큼 초록으로 차오름 (물 차듯)
// - 과거 파트: 체크 도트 (muted green)
// - 현재 파트: 프로그레스 링 노드 + 숨쉬는 glow + 섹션 스트립 펼침
// - 미래 파트: 빈 도트 (dim)
// - 골: 레일 끝에 "완독" 타겟 노드
//
// v1 은 모든 파트의 섹션을 펼쳐서 세로 스크롤 유발. v2 는 현재 파트만 펼쳐 고정 뷰포트에 수렴.
// 매거진 헤드라인 감성 — 네온 과다 대신 타이포 대비(light 숫자 vs caps 라벨)로 긴장감.

interface FullJourneyProps {
  book: Book;
  currentPage: number;
}

export default function FullJourney({ book, currentPage }: FullJourneyProps) {
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
        padding: "14px 18px",
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

      {/* 타임라인 컨테이너 */}
      <div style={{ position: "relative", paddingLeft: 30 }}>
        {/* 레일 배경 — 세로 회색 라인 */}
        <div
          style={{
            position: "absolute",
            left: 11,
            top: 4,
            bottom: 4,
            width: 2,
            background: "#1A1A1A",
            borderRadius: 1,
          }}
        />
        {/* 레일 차오름 — 전체 진행률 비례. 위에서 아래로 초록이 내려옴 */}
        <div
          style={{
            position: "absolute",
            left: 11,
            top: 4,
            height: `calc((100% - 8px) * ${overall / 100})`,
            width: 2,
            background: "linear-gradient(180deg, #00FF7A 0%, #00B858 100%)",
            borderRadius: 1,
            boxShadow: "0 0 6px rgba(0,255,122,0.5)",
            transition: "height 600ms ease",
          }}
        />

        {book.parts.map((part, idx) => {
          const isPast = idx < currentPartIdx;
          const isCurrent = idx === currentPartIdx;
          const partLen = Math.max(1, part.endPage - part.startPage + 1);
          const partProgress = isCurrent
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round(((currentPage - part.startPage + 1) / partLen) * 100),
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

        {/* 골 노드 — "완독" 타겟. 진행률 100% 면 풀 초록 + glow */}
        <div
          style={{
            position: "relative",
            marginLeft: -30,
            paddingLeft: 30,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 4,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: isFinished ? "#00FF7A" : "#0D0D0D",
              border: `1.5px solid ${isFinished ? "#00FF7A" : "#3A3A3A"}`,
              boxShadow: isFinished ? "0 0 14px rgba(0,255,122,0.65)" : "none",
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
        marginLeft: -30,
        paddingLeft: 30,
        marginBottom: isCurrent ? 10 : 6,
      }}
    >
      {/* 노드 — 현재만 링, 나머지는 도트 */}
      {isCurrent ? (
        <ProgressRingNode progress={partProgress} />
      ) : (
        <div
          style={{
            position: "absolute",
            left: 4,
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

        {/* 현재 파트만 섹션 스트립 펼침 — 미니 도트 라인. 너무 많으면 앞뒤 몇 개만 보이도록 */}
        {isCurrent && (
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
        left: 0,
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
