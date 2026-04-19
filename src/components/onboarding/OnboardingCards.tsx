"use client";

import { useState, useRef, useCallback } from "react";

// T-31, T-33: 3장 과학 카드 + 스와이프/다음 버튼 + 인디케이터.
// 문구는 회의록 E에서 확정 — 변경 금지.

interface OnboardingCard {
  body: string;
  reference: string;
}

const CARDS: OnboardingCard[] = [
  {
    body: "같은 시간대에 읽을 때 뇌의 기억 회로가 더 잘 연결돼요.",
    reference: "Circadian encoding, Chavan et al. 2016",
  },
  {
    body: "스마트폰 옆에 두지 않으면 집중력이 26% 올라요.",
    reference: "Ward et al. 2017, Brain Drain study",
  },
  {
    body: "읽은 직후 10초만 가만히 있으면 기억이 두 배로 오래가요.",
    reference: "Dewar et al. 2012, wakeful rest",
  },
];

const FOOTER = "이 원칙을 어떻게 쓸지는 당신이 정하세요";
const SWIPE_THRESHOLD = 60;

interface Props {
  onFinish: () => void;
}

export default function OnboardingCards({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const dragStartXRef = useRef<number | null>(null);
  const [dragDx, setDragDx] = useState(0);

  const isLast = index === CARDS.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish();
      return;
    }
    setIndex((i) => Math.min(CARDS.length - 1, i + 1));
  }, [isLast, onFinish]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartXRef.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartXRef.current == null) return;
    setDragDx(e.clientX - dragStartXRef.current);
  };
  const onPointerUp = () => {
    if (dragStartXRef.current == null) return;
    // threshold 넘으면 카드 전환.
    if (dragDx <= -SWIPE_THRESHOLD) goNext();
    else if (dragDx >= SWIPE_THRESHOLD) goPrev();
    dragStartXRef.current = null;
    setDragDx(0);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 560,
      }}
    >
      {/* 카드 영역 */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 8px",
          touchAction: "pan-y",
          cursor: "grab",
        }}
      >
        <div
          style={{
            // 300ms 트랜지션은 드래그 중이면 비활성 (끌림 반응 유지).
            transform: `translateX(${dragDx}px)`,
            transition:
              dragStartXRef.current == null
                ? "transform 300ms ease, opacity 300ms ease"
                : "none",
            opacity: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <p
            style={{
              color: "#F0F0F0",
              fontSize: 19,
              fontWeight: 600,
              lineHeight: 1.55,
              textAlign: "center",
              letterSpacing: "-0.3px",
              margin: 0,
            }}
          >
            {CARDS[index].body}
          </p>
          <p
            style={{
              color: "#5A5A5A",
              fontSize: 10,
              fontStyle: "italic",
              textAlign: "center",
              margin: 0,
              letterSpacing: 0.3,
            }}
          >
            — {CARDS[index].reference}
          </p>
          <p
            style={{
              marginTop: 40,
              color: "#7A7A7A",
              fontSize: 12,
              textAlign: "center",
              letterSpacing: "-0.2px",
            }}
          >
            {FOOTER}
          </p>
        </div>
      </div>

      {/* 하단 인디케이터 + 버튼 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {CARDS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === index ? "#00FF7A" : "#2A2A2A",
                transition: "background 200ms",
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          style={{
            width: "100%",
            background: "#00FF7A",
            color: "#000",
            border: "none",
            borderRadius: 14,
            padding: "16px",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.3px",
          }}
        >
          {isLast ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}
