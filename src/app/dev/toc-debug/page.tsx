"use client";

// 마지막 /api/classify-toc 호출의 결과를 분해해서 보여주는 디버그 뷰어.
// /register/toc 가 응답을 받자마자 sessionStorage 에 던져두므로 동일 세션 내에서만 가용.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBooksStore } from "@/store/booksStore";
import type { BookPart } from "@/types/book";

interface Debug {
  rawTextPerPage: string[];
  cleanLines: string[];
  classifications?: Array<{ lineIndex: number; kind: string; parentLineIndex: number | null }>;
  aiReason?: string;
  aiUsage?: { promptTokens: number; outputTokens: number };
  maxTailPage: number;
  totalPagesIn: number;
  totalPagesOut: number;
  source: "ai" | "fallback_raw";
  parts: BookPart[];
  ts: number;
}

export default function TocDebugPage() {
  const sp = useSearchParams();
  const bookId = sp.get("bookId") ?? "";
  const book = useBooksStore((s) => s.registered.find((b) => b.id === bookId));

  const [debug, setDebug] = useState<Debug | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !bookId) return;
    try {
      const raw = sessionStorage.getItem(`toc-debug:${bookId}`);
      if (raw) setDebug(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [bookId]);

  if (!bookId) return <Wrap><Err msg="bookId 가 없습니다 — URL 에 ?bookId=xxx 를 붙여주세요" /></Wrap>;

  return (
    <Wrap>
      <Header book={book} debug={debug} />

      {!debug ? (
        <Err msg="이 책에 대한 디버그 데이터가 없어요. 같은 세션에서 /register/toc 로 한 번 등록한 뒤 다시 들어와주세요." />
      ) : (
        <>
          <Section title="📊 요약">
            <Kv k="source" v={debug.source} />
            <Kv k="totalPages 입력 → 출력" v={`${debug.totalPagesIn} → ${debug.totalPagesOut}`} />
            <Kv k="OCR max tail page" v={String(debug.maxTailPage)} />
            <Kv k="AI 사유" v={debug.aiReason ?? "—"} />
            <Kv
              k="토큰 (in/out)"
              v={`${debug.aiUsage?.promptTokens ?? 0} / ${debug.aiUsage?.outputTokens ?? 0}`}
            />
            <Kv k="parts 개수" v={String(debug.parts.length)} />
          </Section>

          <Section title="📝 Vision OCR — 페이지별 raw text">
            {debug.rawTextPerPage.map((t, i) => (
              <details key={i} style={detailsStyle}>
                <summary style={summaryStyle}>
                  page {i + 1} ({t.split("\n").length} 줄)
                </summary>
                <pre style={preStyle}>{t}</pre>
              </details>
            ))}
          </Section>

          <Section title="🧹 cleanLines (AI 입력)">
            <pre style={preStyle}>
              {debug.cleanLines.map((l, i) => `[${i}] ${l}`).join("\n")}
            </pre>
          </Section>

          <Section title="🤖 AI 분류 결과">
            {debug.classifications && Array.isArray(debug.classifications) ? (
              <pre style={preStyle}>
                {debug.classifications
                  .map(
                    (c) =>
                      `[${c.lineIndex}] ${c.kind.padEnd(8)} parent=${c.parentLineIndex ?? "—"}  ${
                        debug.cleanLines[c.lineIndex] ?? ""
                      }`,
                  )
                  .join("\n")}
              </pre>
            ) : (
              <div style={{ color: "#888" }}>AI 분류가 없어요 (폴백 사용)</div>
            )}
          </Section>

          <Section title="🌳 buildTree 결과 (parts)">
            <pre style={preStyle}>
              {debug.parts
                .map(
                  (p) =>
                    `${p.label || `Part ${p.index}`} — ${p.title}\n  ${p.startPage}p ~ ${p.endPage}p\n  sections (${p.sections.length}):\n${p.sections
                      .map(
                        (s) =>
                          `    · ${s.label ? `[${s.label}] ` : ""}${s.title} (${s.startPage}~${s.endPage})`,
                      )
                      .join("\n")}`,
                )
                .join("\n\n")}
            </pre>
          </Section>
        </>
      )}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        background: "#050505",
        minHeight: "100vh",
        color: "#E8E8E8",
        padding: "max(env(safe-area-inset-top, 0px), 14px) 14px 40px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {children}
    </main>
  );
}

function Header({ book, debug }: { book: { title: string } | undefined; debug: Debug | null }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1A1A1A" }}>
      <div style={{ fontSize: 11, color: "#7A7A7A", letterSpacing: 1.2 }}>TOC DEBUG</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, letterSpacing: "-0.3px" }}>
        {book?.title ?? "(책 정보 없음)"}
      </div>
      {debug && (
        <div style={{ fontSize: 10, color: "#5A5A5A", marginTop: 4 }}>
          {new Date(debug.ts).toLocaleString("ko-KR")}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#9AE5BD", marginBottom: 6 }}>{title}</h2>
      {children}
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: "1px dashed #1F1F1F" }}>
      <span style={{ color: "#7A7A7A" }}>{k}</span>
      <span style={{ color: "#E8E8E8", fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: 14,
        background: "#3a1010",
        color: "#FF8A8A",
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {msg}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  background: "#0E0E0E",
  border: "1px solid #1A1A1A",
  borderRadius: 6,
  padding: 10,
  fontSize: 11,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflow: "auto",
  maxHeight: 400,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
};

const detailsStyle: React.CSSProperties = {
  marginBottom: 6,
  border: "1px solid #1A1A1A",
  borderRadius: 6,
  background: "#0E0E0E",
};

const summaryStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  color: "#9AE5BD",
};
