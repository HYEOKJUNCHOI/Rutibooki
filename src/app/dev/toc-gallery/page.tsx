"use client";

/* eslint-disable @next/next/no-img-element */
// next/image 대신 <img> 직접 사용 — 표지 URL 은 외부 도메인이라 remote patterns 등록 없이 진행.

// 개발 전용 TOC 코퍼스 갤러리.
// 룰 뱃지 vs AI 뱃지를 카드마다 동시 표시. 토글로 FullJourney 소스를 바꿀 수 있음.
// 프로덕션 서재·스토어는 전혀 건드리지 않음.

import { useMemo, useState } from "react";
import { TOC_CORPUS_BOOKS } from "@/data/tocCorpusMockBooks";
import { AI_RESULTS } from "@/data/tocCorpusAiResults";
import { judgeTocAccuracy, badgeEmoji, TocAccuracy } from "@/utils/tocAccuracy";
import FullJourney from "@/components/book/FullJourney";
import type { Book, BookPart } from "@/types/book";

const BADGE_BG: Record<TocAccuracy, string> = {
  green: "rgba(0,200,80,0.15)",
  yellow: "rgba(220,180,0,0.15)",
  red: "rgba(220,60,60,0.18)",
};
const BADGE_COLOR: Record<TocAccuracy, string> = {
  green: "#00c850",
  yellow: "#ddb800",
  red: "#dd3c3c",
};

type Source = "rule" | "ai";

// AI 결과를 해당 ISBN 에 매핑 — parts 를 book.parts 자리에 갈아끼워 FullJourney 에 넘김.
function pickParts(book: Book, source: Source): BookPart[] {
  if (source === "ai" && book.isbn13 && AI_RESULTS[book.isbn13]) {
    return AI_RESULTS[book.isbn13].parts;
  }
  return book.parts;
}

interface CardProps {
  entry: (typeof TOC_CORPUS_BOOKS)[number];
  onClick: () => void;
}

function TocCard({ entry, onClick }: CardProps) {
  const { book, fullPartCount } = entry;
  const ruleAcc = judgeTocAccuracy(book.parts);
  const ai = book.isbn13 ? AI_RESULTS[book.isbn13] : undefined;
  const aiAcc = ai ? judgeTocAccuracy(ai.parts) : undefined;

  return (
    <button
      data-component="TocCard"
      onClick={onClick}
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 10,
        padding: "8px 8px 10px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "3/4",
          borderRadius: 6,
          overflow: "hidden",
          background: "#1e1e1e",
          flexShrink: 0,
        }}
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#555",
              fontSize: 10,
            }}
          >
            표지 없음
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#e0e0e0",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {book.title}
      </div>
      <div style={{ fontSize: 9, color: "#777", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {book.author}
      </div>

      {/* 룰 + AI 뱃지 2개 나란히 */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <MiniBadge label="룰" level={ruleAcc.level} />
        {aiAcc ? (
          <MiniBadge label="AI" level={aiAcc.level} />
        ) : (
          <span style={{ fontSize: 8, color: "#444", alignSelf: "center" }}>AI 없음</span>
        )}
      </div>

      {/* AI 비용 */}
      {ai && (
        <div style={{ fontSize: 8, color: "#666", lineHeight: 1.2 }}>
          AI {ai.parts.length}파트 · {ai.costKrw.toFixed(1)}원
        </div>
      )}

      <div style={{ fontSize: 8, color: "#444", lineHeight: 1.2 }}>
        룰 {fullPartCount}파트
      </div>
    </button>
  );
}

function MiniBadge({ label, level }: { label: string; level: TocAccuracy }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        background: BADGE_BG[level],
        color: BADGE_COLOR[level],
        borderRadius: 4,
        padding: "2px 4px",
        fontSize: 8,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 9 }}>{badgeEmoji(level)}</span>
      {label}
    </span>
  );
}

interface JourneyModalProps {
  book: Book;
  source: Source;
  onClose: () => void;
  onToggleSource: (next: Source) => void;
}

function JourneyModal({ book, source, onClose, onToggleSource }: JourneyModalProps) {
  const parts = pickParts(book, source);
  const displayBook: Book = { ...book, parts };
  // 여정 UI가 페이지 변화에 따라 어떻게 움직이는지 눈으로 확인하려고 수동 슬라이더 둠.
  const maxPage = Math.max(
    1,
    book.totalPages || parts.at(-1)?.endPage || parts.at(-1)?.startPage || 1,
  );
  const [currentPage, setCurrentPage] = useState(1);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} 목차 여정`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0d0d0d",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 420,
          maxHeight: "85dvh",
          overflowY: "auto",
          padding: "12px 16px 24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#333" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {book.title}
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#666", fontSize: 18, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <SourceToggle source={source} onChange={onToggleSource} book={book} />

        <BadgeSummary parts={parts} />

        <PageScrubber
          value={currentPage}
          max={maxPage}
          onChange={setCurrentPage}
        />

        <div style={{ marginTop: 12 }}>
          <FullJourney book={displayBook} currentPage={currentPage} coverUrl={book.coverUrl} />
        </div>
      </div>
    </div>
  );
}

function PageScrubber({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  // 슬라이더로 대략 움직이고, 숫자 입력으로 정밀 조정 — 둘 다 제공.
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        background: "#141414",
        borderRadius: 10,
        border: "1px solid #1f1f1f",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#666", letterSpacing: "0.05em" }}>현재 페이지</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number"
            min={1}
            max={max}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.min(max, Math.max(1, n)));
            }}
            style={{
              width: 54,
              background: "#0a0a0a",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: "#e0e0e0",
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 6px",
              textAlign: "right",
              fontFamily: "inherit",
            }}
          />
          <span style={{ fontSize: 10, color: "#555" }}>/ {max}</span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#3ddc97",
          cursor: "pointer",
        }}
      />
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        {[1, 50, 100, Math.round(max / 2), max].map((p, i) => (
          <button
            key={`${p}-${i}`}
            onClick={() => onChange(Math.min(max, Math.max(1, p)))}
            style={{
              fontSize: 10,
              padding: "3px 8px",
              background: value === p ? "#1f3a2e" : "#0a0a0a",
              border: `1px solid ${value === p ? "#3ddc97" : "#222"}`,
              borderRadius: 6,
              color: value === p ? "#3ddc97" : "#888",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {p}p
          </button>
        ))}
      </div>
    </div>
  );
}

function SourceToggle({
  source,
  onChange,
  book,
}: {
  source: Source;
  onChange: (s: Source) => void;
  book: Book;
}) {
  const hasAi = !!(book.isbn13 && AI_RESULTS[book.isbn13]);
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
      <ToggleBtn active={source === "rule"} onClick={() => onChange("rule")}>
        룰
      </ToggleBtn>
      <ToggleBtn
        active={source === "ai"}
        onClick={() => hasAi && onChange("ai")}
        disabled={!hasAi}
      >
        AI{hasAi ? "" : " (없음)"}
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: "6px 0",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "inherit",
        border: "1px solid",
        borderColor: active ? "#4ec9b0" : "#222",
        background: active ? "rgba(78,201,176,0.12)" : "#111",
        color: disabled ? "#333" : active ? "#4ec9b0" : "#888",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function BadgeSummary({ parts }: { parts: Book["parts"] }) {
  const accuracy = judgeTocAccuracy(parts);
  return (
    <div
      style={{
        background: BADGE_BG[accuracy.level],
        borderRadius: 8,
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 16 }}>{badgeEmoji(accuracy.level)}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: BADGE_COLOR[accuracy.level] }}>
          {accuracy.level === "green" ? "파싱 양호" : accuracy.level === "yellow" ? "부분 파싱" : "평탄 구조"}
        </div>
        <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{accuracy.reason}</div>
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = useMemo(() => {
    const rule = { green: 0, yellow: 0, red: 0 };
    const ai = { green: 0, yellow: 0, red: 0 };
    let totalCost = 0;
    for (const entry of TOC_CORPUS_BOOKS) {
      rule[judgeTocAccuracy(entry.book.parts).level]++;
      const aiRes = entry.book.isbn13 ? AI_RESULTS[entry.book.isbn13] : undefined;
      if (aiRes) {
        ai[judgeTocAccuracy(aiRes.parts).level]++;
        totalCost += aiRes.costKrw;
      }
    }
    return { rule, ai, totalCost };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginBottom: 16,
        padding: "10px 12px",
        background: "#111",
        borderRadius: 10,
        border: "1px solid #1f1f1f",
      }}
    >
      <StatRow label="룰" counts={stats.rule} />
      <StatRow label="AI" counts={stats.ai} />
      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
        AI 총비용 <b style={{ color: "#4ec9b0" }}>{stats.totalCost.toFixed(1)}원</b> · 책당 평균{" "}
        {(stats.totalCost / TOC_CORPUS_BOOKS.length).toFixed(1)}원
      </div>
    </div>
  );
}

function StatRow({
  label,
  counts,
}: {
  label: string;
  counts: { green: number; yellow: number; red: number };
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "#888", width: 18 }}>{label}</span>
      <StatChip count={counts.green} level="green" />
      <StatChip count={counts.yellow} level="yellow" />
      <StatChip count={counts.red} level="red" />
    </div>
  );
}

function StatChip({ count, level }: { count: number; level: TocAccuracy }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 12 }}>{badgeEmoji(level)}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: BADGE_COLOR[level] }}>{count}</span>
    </div>
  );
}

export default function TocGalleryPage() {
  const [selected, setSelected] = useState<Book | null>(null);
  const [source, setSource] = useState<Source>("rule");

  return (
    <main
      data-component="TocGalleryPage"
      style={{
        background: "#080808",
        minHeight: "100dvh",
        padding: "16px 12px 32px",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#444",
              background: "#1a1a1a",
              borderRadius: 4,
              padding: "2px 6px",
              letterSpacing: "0.05em",
            }}
          >
            DEV ONLY
          </div>
          <div style={{ fontSize: 10, color: "#444" }}>룰 vs AI 하이브리드</div>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#e8e8e8", margin: 0, letterSpacing: "-0.3px" }}>
          TOC 코퍼스 갤러리
        </h1>
        <p style={{ fontSize: 10, color: "#555", margin: "4px 0 0" }}>
          룰베이스 / Gemini 2.5 Flash 분류 결과 비교
        </p>
      </div>

      <StatsBar />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {TOC_CORPUS_BOOKS.map((entry) => (
          <TocCard
            key={entry.book.isbn13}
            entry={entry}
            onClick={() => {
              setSelected(entry.book);
              setSource("rule");
            }}
          />
        ))}
      </div>

      {selected && (
        <JourneyModal
          book={selected}
          source={source}
          onToggleSource={setSource}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
