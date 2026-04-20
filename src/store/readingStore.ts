import { create } from "zustand";
import { ReadingState, ReadingLog, QuoteEntry } from "@/types/reading";
import { updatePaceEMA } from "@/utils/pace";
import { books as initialBooks } from "@/data/books";
import { Book } from "@/types/book";
import { getActivePart, getActiveSection } from "@/utils/reading";
import { auth } from "@/lib/firebase";
import * as readingRepo from "@/lib/firestore/readingRepo";
import { useBooksStore } from "./booksStore";

// Firestore source of truth. persist 제거 — 인증 게이트 이후에만 도달한다.
// mutation 은 Firestore write 를 병행 수행. onSnapshot 은 pull.ts / 구독 코드에서 hydrate 로 반영.

interface ReadingStore {
  statesByBook: Record<string, ReadingState>;
  logs: ReadingLog[];
  quotes: QuoteEntry[];
  coachmarkShown: boolean;
  paceByBook: Record<string, number | undefined>;
  draft: {
    bookId: string;
    startedAt: string;
    startPage: number;
    elapsedSec: number;
  } | null;

  hydrate: (payload: {
    statesByBook: Record<string, ReadingState>;
    logs: ReadingLog[];
    quotes: QuoteEntry[];
    paceByBook: Record<string, number | undefined>;
  }) => void;

  getState: (bookId: string) => ReadingState;
  updatePage: (bookId: string, page: number) => void;
  commitLog: (log: ReadingLog) => void;
  addQuote: (entry: QuoteEntry) => void;
  markCoachmarkShown: () => void;
  saveDraft: (draft: {
    bookId: string;
    startedAt: string;
    startPage: number;
    elapsedSec: number;
  }) => void;
  // #10: 세션 취소용 — 진행 중이던 draft 만 조용히 파기.
  clearDraft: () => void;
  resetBook: (bookId: string) => void;
  // [Major M-2] 로그아웃 시 전체 상태 초기화. 목업 기본값만 남기고 hydrate 로 덮어쓸 준비.
  reset: () => void;
}

function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

// 등록된 책들에 대해 기본 ReadingState를 만들어 둔다 — 목업 포함 초기 진입 대응.
// [MOCKUP] 서재 뱃지 시각 검증용 — 진행 중 상태가 한 화면에 보이도록 분배.
// Firestore 가 채워지면 자동으로 덮어써짐 — 실사용에는 영향 없음.
const MOCK_STATE_OVERRIDES: Record<string, { pageRatio?: number }> = {
  primitive: { pageRatio: 0.37 },      // 37% — 진행 중
  immutable: { pageRatio: 0.72 },       // 72% — 진행 중
  "money-equation": { pageRatio: 0.58 }, // 진행 중
};

function makeInitialStates(): Record<string, ReadingState> {
  const out: Record<string, ReadingState> = {};
  const now = new Date().toISOString();
  for (const b of initialBooks as Book[]) {
    const override = MOCK_STATE_OVERRIDES[b.id] ?? {};
    const ratio = override.pageRatio ?? 0;
    out[b.id] = {
      bookId: b.id,
      currentPage: Math.round(b.totalPages * ratio),
      activePartIndex: 1,
      activeSectionIndex: 0,
      lastOpenedAt: now,
    };
  }
  return out;
}

export const useReadingStore = create<ReadingStore>()((set, get) => ({
  statesByBook: makeInitialStates(),
  logs: [],
  quotes: [],
  coachmarkShown: false,
  paceByBook: {},
  draft: null,

  hydrate: ({ statesByBook, logs, quotes, paceByBook }) => {
    // [Major M-2] 이전엔 기존 state 위에 merge 해서 A 사용자 잔여 진행률이 B 세션에 스며들었음.
    // hydrate 는 인증 성공 직후 1회 호출되므로 항상 Firestore 값으로 완전 교체한다.
    // 목업 책은 makeInitialStates 로 다시 시딩 후 그 위에 Firestore 값을 덮어씀.
    set(() => ({
      statesByBook: { ...makeInitialStates(), ...statesByBook },
      logs,
      quotes,
      paceByBook,
    }));
  },

  getState: (bookId) => {
    const s = get().statesByBook[bookId];
    if (s) return s;
    const fallback: ReadingState = {
      bookId,
      currentPage: 0,
      activePartIndex: 1,
      activeSectionIndex: 0,
      lastOpenedAt: new Date().toISOString(),
    };
    set((state) => ({
      statesByBook: { ...state.statesByBook, [bookId]: fallback },
    }));
    return fallback;
  },

  updatePage: (bookId, page) => {
    let nextState: ReadingState | null = null;
    set((state) => {
      const prev = state.statesByBook[bookId];
      if (!prev) return state;
      // [Critical C-2] 등록 책도 책 정보를 찾을 수 있어야 함. 이전엔 목업만 봐서
      // 사용자 등록 책의 activePartIndex/Sec 가 절대 갱신되지 않았음.
      const book =
        initialBooks.find((b) => b.id === bookId) ??
        useBooksStore.getState().getById(bookId);
      let activePartIndex = prev.activePartIndex;
      let activeSectionIndex = prev.activeSectionIndex;
      if (book) {
        const part = getActivePart(book, page);
        const section = getActiveSection(book, page);
        activePartIndex = part.index;
        activeSectionIndex = part.sections.findIndex(
          (s) =>
            s.startPage === section.startPage &&
            s.endPage === section.endPage,
        );
      }
      nextState = {
        ...prev,
        currentPage: page,
        activePartIndex,
        activeSectionIndex,
        lastOpenedAt: new Date().toISOString(),
      };
      return {
        statesByBook: { ...state.statesByBook, [bookId]: nextState },
      };
    });
    // Firestore 반영 — 실패해도 UX 막지 않도록 fire-and-forget + 콘솔 로깅.
    const uid = currentUid();
    if (uid && nextState) {
      readingRepo
        .updatePage(uid, nextState)
        .catch((err) => console.error("[readingStore] updatePage", err));
    }
  },

  commitLog: (log) => {
    let nextState: ReadingState | null = null;
    let nextPaceValue: number | undefined;
    set((state) => {
      const newLogs = [...state.logs, log];
      const samplesForBook = newLogs.filter(
        (l) => l.bookId === log.bookId,
      ).length;
      const pagesRead = Math.max(1, log.endPage - log.startPage);
      const latestMinPerPage = log.durationSec / 60 / pagesRead;
      const prevPace = state.paceByBook[log.bookId];
      const nextPace = updatePaceEMA({
        prevPace,
        latestMinPerPage,
        sampleCount: samplesForBook,
      });

      const prevState = state.statesByBook[log.bookId];
      const updatedState = prevState
        ? {
            ...prevState,
            currentPage: log.endPage,
            lastOpenedAt: log.endedAt,
          }
        : prevState;
      nextState = updatedState ?? null;
      nextPaceValue = nextPace;

      return {
        logs: newLogs,
        paceByBook: { ...state.paceByBook, [log.bookId]: nextPace },
        statesByBook: updatedState
          ? { ...state.statesByBook, [log.bookId]: updatedState }
          : state.statesByBook,
        draft: null,
      };
    });

    const uid = currentUid();
    if (uid) {
      readingRepo
        .commitLog(uid, log)
        .catch((err) => console.error("[readingStore] commitLog", err));
      if (nextState) {
        readingRepo
          .putState(uid, nextState, nextPaceValue)
          .catch((err) =>
            console.error("[readingStore] putState after log", err),
          );
      }
    }
  },

  addQuote: (entry) => {
    set((state) => ({ quotes: [...state.quotes, entry] }));
    const uid = currentUid();
    if (uid) {
      readingRepo
        .addQuote(uid, entry)
        .catch((err) => console.error("[readingStore] addQuote", err));
    }
  },

  markCoachmarkShown: () => set({ coachmarkShown: true }),

  saveDraft: (draft) => set({ draft }),

  clearDraft: () => set({ draft: null }),

  reset: () =>
    set({
      statesByBook: makeInitialStates(),
      logs: [],
      quotes: [],
      paceByBook: {},
      draft: null,
    }),

  resetBook: (bookId) => {
    set((state) => {
      const now = new Date().toISOString();
      return {
        statesByBook: {
          ...state.statesByBook,
          [bookId]: {
            bookId,
            currentPage: 0,
            activePartIndex: 1,
            activeSectionIndex: 0,
            lastOpenedAt: now,
          },
        },
        logs: state.logs.filter((l) => l.bookId !== bookId),
        quotes: state.quotes.filter((q) => q.bookId !== bookId),
        paceByBook: { ...state.paceByBook, [bookId]: undefined },
        draft: state.draft?.bookId === bookId ? null : state.draft,
      };
    });
    const uid = currentUid();
    if (uid) {
      readingRepo
        .resetBook(uid, bookId)
        .catch((err) => console.error("[readingStore] resetBook", err));
    }
  },
}));
