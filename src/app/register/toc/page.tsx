"use client";

// /register/toc?bookId=xxx
// 서재의 특정 책에 목차 사진을 찍어서 → Vision → AI → BookPart[] 저장.
// 등록 직후 분기 + 길게누름 메뉴 모두 여기로.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBooksStore } from "@/store/booksStore";
import TocCaptureFlow from "@/components/scan/TocCaptureFlow";
import type { BookPart } from "@/types/book";

export default function RegisterTocPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const bookId = sp.get("bookId") ?? "";

  const book = useBooksStore((s) => s.registered.find((b) => b.id === bookId));
  const updateBook = useBooksStore((s) => s.updateBook);

  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Vision + AI 파이프라인 호출 — 한 방에 처리.
  const onComplete = async (blobs: Blob[]) => {
    if (!book) {
      setError("책을 못 찾았습니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setBusyMsg("AI 가 목차 분석 중...");
      const fd = new FormData();
      blobs.forEach((b, i) => {
        fd.append(`file_${i}`, new File([b], `toc-${i + 1}.jpg`, { type: "image/jpeg" }));
      });
      fd.append("totalPages", String(book.totalPages ?? 0));

      const r = await fetch("/api/classify-toc", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        throw new Error(data.detail || data.error || `HTTP ${r.status}`);
      }

      const parts = data.parts as BookPart[];
      const totalPages = data.totalPages || book.totalPages || 0;

      await updateBook(bookId, {
        parts,
        totalPages,
      });

      // 서재로 복귀.
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBusy(false);
      setBusyMsg("");
    }
  };

  const onCancel = () => router.replace("/");

  if (!bookId) {
    return (
      <main style={pageBg}>
        <div style={errCard}>책 ID 가 없습니다.</div>
      </main>
    );
  }
  if (!book) {
    return (
      <main style={pageBg}>
        <div style={errCard}>해당 책을 찾을 수 없습니다.</div>
      </main>
    );
  }

  return (
    <main style={pageBg}>
      <div style={titleBar}>
        <span style={{ color: "#7A7A7A", fontSize: 11, letterSpacing: 1.2 }}>
          목차 등록
        </span>
        <div
          style={{
            color: "#E8E8E8",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.3px",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {book.title}
        </div>
      </div>

      {error && (
        <div style={errCard}>
          {error}
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.75 }}>
            다시 찍기로 재시도하거나 ‹이전 으로 빠져나갈 수 있어요.
          </div>
        </div>
      )}

      <TocCaptureFlow
        onComplete={onComplete}
        onCancel={onCancel}
        externalBusy={busy}
        externalBusyMessage={busyMsg}
      />
    </main>
  );
}

const pageBg: React.CSSProperties = {
  background: "#050505",
  minHeight: "100vh",
  color: "#E8E8E8",
};

const titleBar: React.CSSProperties = {
  padding: "14px 16px 6px",
  borderBottom: "1px solid #1A1A1A",
};

const errCard: React.CSSProperties = {
  margin: "12px 14px",
  padding: 12,
  background: "#3a1010",
  color: "#FF8A8A",
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
};
