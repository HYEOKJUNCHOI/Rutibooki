"use client";

import { useRef, useState } from "react";
import { Book } from "@/types/book";
import JourneyPath from "./JourneyPath";

const SWIPE_THRESHOLD = 60;
const TAP_THRESHOLD = 8; // 이 거리 이하로 움직이면 탭으로 간주 — 스와이프와 구분

interface BookCoverSwipeProps {
  books: Book[];
  covers: Record<number, string>;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}

export default function BookCoverSwipe({
  books,
  covers,
  selectedIdx,
  onSelect,
}: BookCoverSwipeProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const startX = useRef(0);
  const didSwipe = useRef(false);

  const prevIdx = (selectedIdx - 1 + books.length) % books.length;
  const nextIdx = (selectedIdx + 1) % books.length;
  const selectedBook = books[selectedIdx];

  const swipeProgress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const swipeDir = dragX < 0 ? "left" : "right";

  const onDragStart = (clientX: number) => {
    startX.current = clientX;
    didSwipe.current = false;
    setIsDragging(true);
  };

  const onDragMove = (clientX: number) => {
    if (!isDragging) return;
    const dx = clientX - startX.current;
    if (Math.abs(dx) > TAP_THRESHOLD) didSwipe.current = true;
    setDragX(dx);
  };

  const onDragEnd = () => {
    if (dragX < -SWIPE_THRESHOLD) {
      onSelect(nextIdx);
      didSwipe.current = true;
    } else if (dragX > SWIPE_THRESHOLD) {
      onSelect(prevIdx);
      didSwipe.current = true;
    }
    setDragX(0);
    setIsDragging(false);
  };

  // 탭(제스처 종료 시점에 스와이프가 아니었다면) → 카드 뒤집기
  const handleClick = () => {
    if (didSwipe.current) return;
    setIsFlipped((v) => !v);
  };

  // 책 데이터에서 파트 정보를 꺼내오고 싶지만, 아직 스키마에 없으므로 임시 기본값.
  // TODO: Book 타입에 parts / currentPart 추가되면 그걸 사용.
  const totalParts = 7;
  const currentPart = 4;

  return (
    <div
      style={{ position: "relative", height: 220, marginBottom: 20, userSelect: "none" }}
      onMouseDown={(e) => onDragStart(e.clientX)}
      onMouseMove={(e) => onDragMove(e.clientX)}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
      onTouchEnd={onDragEnd}
      onClick={handleClick}
    >
      {/* 책 뒤 초록 글로우 — 중앙이 가장 진하고 가장자리로 퍼지며 투명 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 55% 70% at 50% 50%, rgba(0,255,122,0.12) 0%, rgba(0,255,122,0.04) 40%, rgba(0,0,0,0) 75%)",
          pointerEvents: "none",
        }}
      />
      {/* 스와이프 중 옆 책 미리보기 — 뒤집힌 상태에서는 숨김 */}
      {!isFlipped && swipeDir === "right" && isDragging && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: swipeProgress * 0.5,
            transform: `translateX(${-60 + swipeProgress * 40}px) scale(${0.75 + swipeProgress * 0.1})`,
            transition: "none",
            pointerEvents: "none",
          }}
        >
          {covers[prevIdx] && (
            <img
              src={covers[prevIdx]}
              alt=""
              style={{ height: "80%", objectFit: "contain", borderRadius: 6, filter: "blur(1px)" }}
            />
          )}
        </div>
      )}
      {!isFlipped && swipeDir === "left" && isDragging && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: swipeProgress * 0.5,
            transform: `translateX(${60 - swipeProgress * 40}px) scale(${0.75 + swipeProgress * 0.1})`,
            transition: "none",
            pointerEvents: "none",
          }}
        >
          {covers[nextIdx] && (
            <img
              src={covers[nextIdx]}
              alt=""
              style={{ height: "80%", objectFit: "contain", borderRadius: 6, filter: "blur(1px)" }}
            />
          )}
        </div>
      )}

      {/* 3D 퍼스펙티브 — 카드 뒤집기 효과의 깊이감을 부여 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1200,
          transform: `translateX(${dragX * 0.4}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
          cursor: "pointer",
        }}
      >
        {/* 플리퍼 — rotateY로 앞/뒤 전환 */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
            transition: "transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
        >
          {/* 앞면 — 책 표지 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {covers[selectedIdx] ? (
              <img
                src={covers[selectedIdx]}
                alt={selectedBook.title}
                style={{
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: 6,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#E8E8E8" }}>{selectedBook.title}</p>
                <p style={{ fontSize: 12, color: "#5A5A5A" }}>{selectedBook.author}</p>
              </div>
            )}
          </div>

          {/* 뒷면 — 독서 여정 (버스노선) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "0 8px",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                "linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(5,5,5,0.95) 100%)",
              border: "1px solid #1A1A1A",
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <p style={{ fontSize: 10, color: "#5A5A5A", letterSpacing: 1, margin: 0 }}>
              독서 여정
            </p>
            <div style={{ width: "100%" }}>
              <JourneyPath totalParts={totalParts} currentPart={currentPart} />
            </div>
            <p style={{ fontSize: 11, color: "#E8E8E8", margin: 0 }}>
              <span style={{ color: "#00FF7A", fontWeight: 700 }}>PART {currentPart}</span>
              <span style={{ color: "#4A4A4A", margin: "0 6px" }}>/</span>
              <span style={{ color: "#5A5A5A" }}>{totalParts}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
