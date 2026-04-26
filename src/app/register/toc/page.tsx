"use client";

// /register/toc?bookId=xxx
// 카메라 → 크롭 → blobs 모이면 즉시 status="extracting" 으로 바꾸고 서재로 복귀.
// /api/classify-toc 호출은 fire-and-forget — 응답 오면 store 의 updateBook 으로 갱신.
//
// 사용자는 LibraryCard 의 진행률 게이지 + extractionStep 라벨로 분석 진행 인지.

import { useRouter, useSearchParams } from "next/navigation";
import { useBooksStore } from "@/store/booksStore";
import TocCaptureFlow from "@/components/scan/TocCaptureFlow";
import {
  clearExtractionStep,
  clearStatusField,
} from "@/lib/registerBookInBackground";
import type { BookPart } from "@/types/book";

export default function RegisterTocPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const bookId = sp.get("bookId") ?? "";

  const book = useBooksStore((s) => s.registered.find((b) => b.id === bookId));
  const updateBook = useBooksStore((s) => s.updateBook);

  // 카메라 → 크롭 → blobs 완성. 여기서부터 즉시 서재 이동.
  // fetch 는 fire-and-forget — Promise 가 살아있는 한 unmount 돼도 진행됨.
  const onComplete = async (blobs: Blob[]) => {
    if (!book) return;

    // 1) 즉시 extracting 상태로 — 서재 카드에 진행률 게이지 뜸.
    await updateBook(bookId, {
      status: "extracting",
      extractionStartedAt: new Date().toISOString(),
      extractionStep: "AI 가 목차 분석 중",
    });

    // 2) FormData 구성 (blob 을 fetch 가 들고 있음 — 컴포넌트 unmount 와 무관).
    const fd = new FormData();
    blobs.forEach((b, i) => {
      fd.append(`file_${i}`, new File([b], `toc-${i + 1}.jpg`, { type: "image/jpeg" }));
    });
    fd.append("totalPages", String(book.totalPages ?? 0));

    // 3) 백그라운드 호출 — 응답 받으면 store 만 업데이트.
    void runClassifyInBackground({
      bookId,
      fd,
      fallbackTotalPages: book.totalPages ?? 0,
    });

    // 4) 즉시 서재 복귀.
    router.replace("/");
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

      <TocCaptureFlow onComplete={onComplete} onCancel={onCancel} />
    </main>
  );
}

// fire-and-forget — Promise 가 살아있는 동안만 동작. 응답 받으면 store 갱신.
async function runClassifyInBackground(args: {
  bookId: string;
  fd: FormData;
  fallbackTotalPages: number;
}) {
  const { updateBook } = useBooksStore.getState();
  try {
    const r = await fetch("/api/classify-toc", { method: "POST", body: args.fd });
    const data = await r.json();
    if (!r.ok || !data.ok) {
      throw new Error(data.detail || data.error || `HTTP ${r.status}`);
    }
    const parts = data.parts as BookPart[];
    const totalPages: number = data.totalPages || args.fallbackTotalPages || 0;

    await updateBook(args.bookId, { parts, totalPages });
    await clearStatusField(args.bookId);
  } catch (e) {
    console.warn("[register/toc] classify failed", e);
    await updateBook(args.bookId, { status: "failed" });
    await clearExtractionStep(args.bookId);
  }
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
