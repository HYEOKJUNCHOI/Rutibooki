"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { books as mockBooks } from "@/data/books";
import { Book } from "@/types/book";
import { useBooksStore } from "@/store/booksStore";
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

  // 사용자 등록 책 + 목업 목록을 병합. 등록 책 우선.
  // [Critical C-1] 이전엔 mockBooks 만 검색해서 등록 책 "책 펼쳤어요" 시 홈으로 튕김.
  const registered = useBooksStore((s) => s.registered);
  const book = useMemo(
    () => [...registered, ...mockBooks].find((b) => b.id === bookId),
    [registered, bookId],
  );

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
  book: Book;
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

  // [Major M-1] 세션 시작 시각은 한 번만 확정. 이전엔 렌더마다 new Date()를 넘겨
  // ReadingBlackScreen 내부 useEffect deps 변화 → 2분 autosave 타이머가 매번 리셋됐음.
  // React 19 react-hooks/refs 규칙상 ref.current 를 렌더 중 읽지 말고 useMemo 로 결정.
  const startedAt = useMemo(() => new Date().toISOString(), []);
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
            startedAt={startedAt}
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

function findPartIndex(book: Book, page: number): number {
  const found = book.parts.find(
    (p) => page >= p.startPage && page <= p.endPage,
  );
  return found?.index ?? book.parts[book.parts.length - 1].index;
}
