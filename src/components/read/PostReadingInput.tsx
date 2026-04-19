"use client";

import { useState } from "react";
import { Book } from "@/types/book";
import { calcDailyRange } from "@/utils/reading";

// T-25: Reading 종료 후 "어디까지 읽었어요?" 숫자 입력.
// pre-fill = 이번 세션에서 기대하는 끝 페이지 (calcDailyRange).
// 이미 섹션 끝에 도달한 상태면 다음 섹션 끝으로 자동 이동 — 1 같은 이상값 방지.
// 걸린 시간·목표 등 평가 요소는 절대 노출하지 않는다.

interface PostReadingInputProps {
  book: Book;
  startPage: number;
  onConfirm: (endPage: number) => void;
  onCancel?: () => void;
}

export default function PostReadingInput({
  book,
  startPage,
  onConfirm,
  onCancel,
}: PostReadingInputProps) {
  // calcDailyRange는 "섹션 끝까지 도달"한 경우도 다음 섹션으로 넘겨주므로
  // startPage보다 항상 크거나 같은 안전한 pre-fill을 보장.
  const daily = calcDailyRange(book, startPage);
  const prefill = Math.max(daily.end, startPage);
  const [value, setValue] = useState<string>(String(prefill));

  const parsed = Number.parseInt(value, 10);
  const min = Math.max(startPage, 1);
  const max = book.totalPages;
  const isValid =
    Number.isFinite(parsed) && parsed >= min && parsed <= max;

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm(parsed);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 55,
        padding: "0 32px",
      }}
    >
      {/* 취소 — 잘못 long-press로 종료했을 때 되돌아갈 탈출구. 빨강 금지(4차 회의 색 대비 규칙). */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="취소"
          style={{
            position: "absolute",
            top: 20,
            left: 16,
            background: "transparent",
            border: "none",
            color: "#5A5A5A",
            fontSize: 14,
            fontFamily: "inherit",
            padding: "8px 12px",
            cursor: "pointer",
            letterSpacing: "-0.3px",
          }}
        >
          ✕ 취소
        </button>
      )}

      <p
        style={{
          fontSize: 20,
          color: "#E8E8E8",
          fontWeight: 600,
          letterSpacing: "-0.5px",
          marginBottom: 40,
        }}
      >
        어디까지 읽었어요?
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          aria-label="끝 페이지"
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1.5px solid #2A2A2A",
            color: "#E8E8E8",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-1px",
            textAlign: "center",
            width: 160,
            padding: "6px 0",
            outline: "none",
            fontFamily: "inherit",
          }}
          onFocus={(e) => {
            // 입력 즉시 전체선택 — 숫자 수정 유도.
            e.currentTarget.select();
          }}
        />
        <span
          style={{
            fontSize: 24,
            color: "#5A5A5A",
            fontWeight: 500,
          }}
        >
          p
        </span>
      </div>

      <p
        style={{
          fontSize: 12,
          color: "#3A3A3A",
          letterSpacing: "-0.3px",
          marginBottom: 48,
        }}
      >
        {startPage}p 부터 {book.totalPages}p 사이
      </p>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid}
        aria-label="페이지 확인"
        style={{
          width: "100%",
          maxWidth: 320,
          background: isValid ? "#00FF7A" : "#1F1F1F",
          color: isValid ? "#000" : "#5A5A5A",
          border: "none",
          borderRadius: 14,
          padding: "18px",
          fontSize: 16,
          fontWeight: 700,
          cursor: isValid ? "pointer" : "default",
          fontFamily: "inherit",
          letterSpacing: "-0.3px",
          transition: "background 200ms ease, color 200ms ease",
        }}
      >
        확인
      </button>
    </div>
  );
}
