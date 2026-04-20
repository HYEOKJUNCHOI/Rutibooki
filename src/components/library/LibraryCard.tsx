"use client";

import { useEffect, useRef, useState } from "react";
import { Book } from "@/types/book";
import { useBookState } from "@/store/selectors";
import { calcProgress } from "@/utils/reading";

// 추출 예상 시간(ms) — 이 시간 동안 0→90% 로 스멀스멀 올라감. 실제 완료 시 100% 스냅.
// 표지→검색→목차 합쳐 22~28초. 22초를 타겟으로 잡아 진행바가 90% 에 오래 멈추는 현상 완화.
const EXTRACTION_ETA_MS = 22000;

// 길게누르기 임계값 — 500ms 는 OS 컨텍스트 메뉴와 충돌 가능해 조금 아래로.
const LONG_PRESS_MS = 420;
// 손 떨림 무시 — 이 픽셀 이상 이동하면 "탭/길게누르기 아님(스크롤)" 로 간주.
const MOVE_TOLERANCE_PX = 8;

interface LibraryCardProps {
  book: Book;
  cover?: string;
  onClick: () => void;
  onLongPress?: (book: Book) => void;
}

// 서재 카드 — 작은 책 사이즈(약 64×86). 제목 띠지 + 진행률 뱃지.
//
// 뱃지:
// - 상단 중앙(넘패드 8): "37%" 진행률 (진행 중일 때만)
export default function LibraryCard({
  book,
  cover,
  onClick,
  onLongPress,
}: LibraryCardProps) {
  const state = useBookState(book.id);
  const currentPage = state?.currentPage ?? 0;
  const progress = calcProgress(currentPage, book.totalPages);

  // 길게누르기 상태 — 타이머, 시작 좌표, 길게누르기 발생 플래그.
  // 발생 플래그가 켜진 턴에는 onClick 을 삼킨다(누르고 뗀 순간 상세로 튀는 이슈 방지).
  const pressTimerRef = useRef<number | null>(null);
  const startXYRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clearTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onLongPress) return;
    firedRef.current = false;
    startXYRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    pressTimerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      // 햅틱 — 지원 브라우저만(모바일 Safari 제외).
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(18);
        } catch {
          /* no-op */
        }
      }
      onLongPress(book);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startXYRef.current) return;
    const dx = e.clientX - startXYRef.current.x;
    const dy = e.clientY - startXYRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clearTimer();
  };

  const handlePointerEnd = () => {
    clearTimer();
    startXYRef.current = null;
  };

  const isExtracting = book.status === "extracting";
  const isFailed = book.status === "failed";

  // 추출 중일 때만 ~300ms 간격 tick — 경과시간 기반 가짜 % 업데이트.
  // onSnapshot 으로 status 가 사라지는 순간 interval 자동 해제.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isExtracting) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 300);
    return () => window.clearInterval(id);
  }, [isExtracting]);
  const extractionPct = (() => {
    if (!isExtracting) return 0;
    const start = Date.parse(book.registeredAt);
    if (isNaN(start)) return 0;
    const elapsed = Date.now() - start;
    const pct = Math.min(90, Math.round((elapsed / EXTRACTION_ETA_MS) * 90));
    return Math.max(5, pct); // 시작부터 최소 5% — 게이지 보이게.
  })();
  void tick;

  const handleClick = (e: React.MouseEvent) => {
    if (firedRef.current) {
      // 길게누르기가 이미 발화 — 클릭 이벤트 무시.
      e.preventDefault();
      firedRef.current = false;
      return;
    }
    // 분석 중인 책은 상세로 들어가도 볼 게 없음 — 탭 무효.
    if (isExtracting) return;
    onClick();
  };

  // iOS Safari 길게누르기 텍스트 선택·이미지 확대 방지.
  const suppressContextMenu = (e: React.MouseEvent) => {
    if (onLongPress) e.preventDefault();
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={suppressContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      aria-label={book.title}
      style={{
        position: "relative",
        width: 64,
        height: 86,
        padding: 0,
        background: "#161616",
        border: "1px solid #1A1A1A",
        borderRadius: 5,
        cursor: "pointer",
        overflow: "hidden",
        fontFamily: "inherit",
        flexShrink: 0,
        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
      }}
    >
      {cover ? (
        // 사용자가 막 찍은 사진(data: URL) 이면 블러 + 살짝 어둡게 — 알라딘 공식 표지 오면 자연스럽게 선명해짐.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            filter: cover.startsWith("data:")
              ? "blur(4px) brightness(0.75)"
              : "none",
            transform: cover.startsWith("data:") ? "scale(1.1)" : "none",
            transition: "filter 0.4s ease, transform 0.4s ease",
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
            fontSize: 8,
            color: "#5A5A5A",
            padding: 4,
            lineHeight: 1.3,
            textAlign: "center",
          }}
        >
          {book.title.slice(0, 8)}
        </div>
      )}

      {/* 분석 중 — 표지·제목은 드러나는 대로 보이게 두고, 좌상단 점+배지로만 알림.
          보더에 미세한 초록 펄스 — "아직 돌고 있어요" 신호. */}
      {isExtracting && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "1px solid rgba(0,255,122,0.5)",
              borderRadius: 5,
              animation: "rbk-pulse 1.6s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              right: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "rgba(0,0,0,0.68)",
              color: "#00FF7A",
              fontSize: 7,
              fontWeight: 700,
              padding: "3px 5px 4px",
              borderRadius: 4,
              letterSpacing: "-0.2px",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#00FF7A",
                  animation: "rbk-blink 1s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {book.extractionStep ?? "준비중"}
              </span>
              <span style={{ opacity: 0.9 }}>{extractionPct}%</span>
            </div>
            {/* 미니 진행바 — 경과 시간 기반 0→90% 로 증가, 완료 시 카드 자체가 사라짐. */}
            <div
              style={{
                height: 2,
                background: "rgba(0,255,122,0.18)",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${extractionPct}%`,
                  background: "#00FF7A",
                  transition: "width 0.3s linear",
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* 실패 뱃지 — 우상단. 길게눌러서 삭제·재등록 유도. */}
      {isFailed && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "rgba(255,80,80,0.85)",
            color: "#fff",
            fontSize: 7,
            fontWeight: 800,
            padding: "1px 4px",
            borderRadius: 4,
          }}
        >
          실패
        </div>
      )}

      {/* 상단 중앙 뱃지 (넘패드 8) — 진행률. 0%/100% 에서는 숨김. */}
      {!isExtracting && progress > 0 && progress < 100 && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 8,
            fontWeight: 700,
            color: "#E8E8E8",
            background: "rgba(0,0,0,0.55)",
            padding: "1px 5px",
            borderRadius: 6,
            letterSpacing: "-0.3px",
            backdropFilter: "blur(2px)",
          }}
        >
          {progress}%
        </div>
      )}

      {/* 제목 띠지 — 하단 가로. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "3px 5px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%)",
          color: "#F0F0F0",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "-0.2px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textShadow: "0 1px 2px rgba(0,0,0,0.9)",
          textAlign: "left",
        }}
      >
        {book.title}
      </div>
    </button>
  );
}
