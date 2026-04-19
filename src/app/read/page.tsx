"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { books } from "@/data/books";
import { useReadingStore } from "@/store/readingStore";
import { useBookPace } from "@/store/selectors";
import { useVisibilityChange } from "@/hooks/useVisibilityChange";
import { useReadingPhase } from "@/hooks/useReadingPhase";
import PreReadingPhase from "@/components/read/PreReadingPhase";
import ReadingBlackScreen from "@/components/read/ReadingBlackScreen";
import PostReadingInput from "@/components/read/PostReadingInput";
import PartCompletionModal from "@/components/read/PartCompletionModal";
import StationTransitionAnimation from "@/components/read/StationTransitionAnimation";
import DoneScreen from "@/components/read/DoneScreen";
import AbsenceReturnOverlay from "@/components/read/AbsenceReturnOverlay";

// T-20, T-28: /read 라우트. phase 머신은 useReadingPhase로 분리.
// useSearchParams()는 Next.js 16에서 Suspense 경계 필수.

export default function ReadPage() {
  return (
    <Suspense fallback={<BlackFallback />}>
      <ReadPageInner />
    </Suspense>
  );
}

function BlackFallback() {
  // hydration 대기 중에도 눈부심 없도록 검정으로.
  return (
    <div style={{ position: "fixed", inset: 0, background: "#050505" }} />
  );
}

function ReadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";

  // Firestore pull 이 AuthProvider 에서 수행되므로 rehydrate 불필요.
  const hydrated = true;

  // books는 정적 목업. 찾지 못하면 홈으로.
  const book = books.find((b) => b.id === bookId);

  const getState = useReadingStore((s) => s.getState);
  const commitLog = useReadingStore((s) => s.commitLog);
  const addQuote = useReadingStore((s) => s.addQuote);
  const clearDraft = useReadingStore((s) => s.clearDraft);

  // 잘못된 bookId 방어.
  useEffect(() => {
    if (!hydrated) return;
    if (!book) router.replace("/");
  }, [hydrated, book, router]);

  if (!hydrated || !book) {
    return <BlackFallback />;
  }

  // #10: 세션 취소 — draft 파기 후 이전 화면(책 상세) 으로 복귀.
  const handleCancel = () => {
    clearDraft();
    router.back();
  };

  return (
    <ReadFlow
      book={book}
      startPage={getState(book.id).currentPage}
      commitLog={commitLog}
      addQuote={addQuote}
      onHome={() => router.replace("/")}
      onCancel={handleCancel}
    />
  );
}

interface ReadFlowProps {
  book: NonNullable<ReturnType<typeof books.find>>;
  startPage: number;
  commitLog: ReturnType<typeof useReadingStore.getState>["commitLog"];
  addQuote: ReturnType<typeof useReadingStore.getState>["addQuote"];
  onHome: () => void;
  onCancel: () => void;
}

function ReadFlow({
  book,
  startPage,
  commitLog,
  addQuote,
  onHome,
  onCancel,
}: ReadFlowProps) {
  const pace = useBookPace(book.id);
  const {
    phase,
    endPage,
    crossedPart,
    goReading,
    goPost,
    confirmEndPage,
    confirmQuote,
    finishTransition,
  } = useReadingPhase({ book, startPage, commitLog, addQuote });

  // 딴짓 복귀 오버레이는 phase를 바꾸지 않고 reading 위에 겹쳐 띄운다.
  const [absenceOpen, setAbsenceOpen] = useState(false);
  useVisibilityChange({
    enabled: phase === "reading",
    onReturn: () => setAbsenceOpen(true),
  });

  return (
    <>
      {phase === "pre" && (
        <PreReadingPhase
          book={book}
          startPage={startPage}
          pace={pace}
          onDone={goReading}
        />
      )}

      {phase === "reading" && (
        <>
          <ReadingBlackScreen
            book={book}
            startPage={startPage}
            startedAt={new Date().toISOString()}
            onFinish={goPost}
            onCancel={onCancel}
          />
          {absenceOpen && (
            <AbsenceReturnOverlay
              book={book}
              currentPage={startPage}
              onContinue={() => setAbsenceOpen(false)}
              onStopToday={() => {
                setAbsenceOpen(false);
                goPost();
              }}
            />
          )}
        </>
      )}

      {phase === "post" && (
        <PostReadingInput
          book={book}
          startPage={startPage}
          onConfirm={confirmEndPage}
          onCancel={onHome}
        />
      )}

      {phase === "part-modal" && (
        <PartCompletionModal
          partIndex={findPartIndex(book, endPage)}
          onConfirm={confirmQuote}
        />
      )}

      {phase === "transition" && (
        <StationTransitionAnimation
          book={book}
          fromPage={startPage}
          toPage={endPage}
          crossedPart={crossedPart}
          onDone={finishTransition}
        />
      )}

      {phase === "done" && <DoneScreen onHome={onHome} />}
    </>
  );
}

function findPartIndex(
  book: NonNullable<ReturnType<typeof books.find>>,
  page: number,
): number {
  const found = book.parts.find(
    (p) => page >= p.startPage && page <= p.endPage,
  );
  return found?.index ?? book.parts[book.parts.length - 1].index;
}
