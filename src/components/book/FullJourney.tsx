"use client";

import { Book } from "@/types/book";
import { getActiveSection } from "@/utils/reading";

// 대제목(파트) + 소제목(섹션)을 전체 순서대로 보여주는 버스정류장.
// 책 상세에서 "이 책의 전체 여정"을 한 눈에 파악하고, 현재 위치가 어디쯤인지 감 잡게 함.
// JourneyPath는 단일 레벨(파트 OR 섹션)만 보여줘서 전체 조망엔 부족 — 그래서 이 컴포넌트를 별도로 둠.

interface FullJourneyProps {
  book: Book;
  currentPage: number;
}

export default function FullJourney({ book, currentPage }: FullJourneyProps) {
  const activeSection = getActiveSection(book, currentPage || 1);

  return (
    <div
      style={{
        background: "#0E0E0E",
        border: "1px solid #1F1F1F",
        borderRadius: 12,
        padding: "14px 14px 10px",
        marginBottom: 16,
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: "#9A9A9A",
          letterSpacing: 1,
          margin: "0 0 12px",
        }}
      >
        독서 여정
      </p>

      {book.parts.map((part) => {
        // 파트 활성 여부 — 파트 안에 현재 섹션이 있는지.
        const isPartActive = part.sections.some(
          (s) =>
            s.startPage === activeSection.startPage &&
            s.endPage === activeSection.endPage,
        );
        const isPartPassed =
          currentPage > part.endPage && !isPartActive;

        return (
          <div key={part.index} style={{ marginBottom: 14 }}>
            {/* 파트 헤더 — 현재 파트는 초록, 지난 파트는 톤 다운, 미래는 회색 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isPartActive
                    ? "#00FF7A"
                    : isPartPassed
                      ? "#00B858"
                      : "#5A5A5A",
                  letterSpacing: 1,
                }}
              >
                PART {part.index}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: isPartActive
                    ? "#E8E8E8"
                    : isPartPassed
                      ? "#9A9A9A"
                      : "#5A5A5A",
                  fontWeight: isPartActive ? 600 : 400,
                  letterSpacing: "-0.3px",
                }}
              >
                {part.title}
              </span>
            </div>

            {/* 섹션 점 라인 — 현재 섹션 pulse */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                paddingLeft: 4,
              }}
            >
              {part.sections.map((s, i) => {
                const isCurrent =
                  s.startPage === activeSection.startPage &&
                  s.endPage === activeSection.endPage;
                const isPassed = currentPage > s.endPage && !isCurrent;
                const isLast = i === part.sections.length - 1;

                return (
                  <div
                    key={`${s.startPage}-${s.endPage}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: isLast ? "0 0 auto" : 1,
                    }}
                  >
                    {/* 점 */}
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: isCurrent ? 10 : 7,
                          height: isCurrent ? 10 : 7,
                          borderRadius: "50%",
                          background: isCurrent
                            ? "#00FF7A"
                            : isPassed
                              ? "#00B858"
                              : "#2A2A2A",
                          border: isCurrent
                            ? "none"
                            : isPassed
                              ? "none"
                              : "1px solid #5A5A5A",
                          boxShadow: isCurrent
                            ? "0 0 12px rgba(0,255,122,0.8)"
                            : "none",
                          animation: isCurrent
                            ? "fj-pulse 1.4s ease-in-out infinite"
                            : undefined,
                          flex: "0 0 auto",
                        }}
                      />
                      {/* 섹션 제목 — 현재만 강조, 나머지는 작게 */}
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          fontSize: 9,
                          color: isCurrent
                            ? "#00FF7A"
                            : isPassed
                              ? "#7A7A7A"
                              : "#4A4A4A",
                          fontWeight: isCurrent ? 700 : 400,
                          whiteSpace: "nowrap",
                          letterSpacing: "-0.2px",
                          // 2글자 이하면 그대로, 그 이상이면 잘라서 가독성 확보
                          maxWidth: 44,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {shorten(s.title)}
                      </span>
                    </div>

                    {/* 연결선 — 마지막 섹션 뒤엔 안 그림 */}
                    {!isLast && (
                      <div
                        style={{
                          flex: 1,
                          height: 1.5,
                          background:
                            isPassed || isCurrent ? "#00B858" : "#2A2A2A",
                          margin: "0 2px",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* 섹션 라벨 아래 공간 — 라벨이 absolute라 여백 따로 확보 */}
            <div style={{ height: 14 }} />
          </div>
        );
      })}

      {/* pulse keyframes — 현재 섹션 점용. styled-jsx 대신 전역 주입 없이, SVG 밖이니 inline <style> 한 번. */}
      <style>{`
        @keyframes fj-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// 가운뎃점(·) 프리픽스 떼고, 길면 잘라서 좁은 공간에 넣는다.
function shorten(raw: string, maxLen = 5): string {
  const parts = raw.split(" · ");
  const core = parts.length > 1 ? parts[parts.length - 1] : raw;
  return core.length > maxLen ? core.slice(0, maxLen) + "…" : core;
}
