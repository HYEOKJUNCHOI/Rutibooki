import { create } from "zustand";
import { ReadingState, ReadingLog, QuoteEntry } from "@/types/reading";
import { updatePaceEMA } from "@/utils/pace";
import { books as initialBooks } from "@/data/books";
import { Book } from "@/types/book";
import { getActivePart, getActiveSection } from "@/utils/reading";
import { auth } from "@/lib/firebase";
import * as readingRepo from "@/lib/firestore/readingRepo";

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
  resetBook: (bookId: string) => void;
}

function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

// 등록된 책들에 대해 기본 ReadingState를 만들어 둔다 — 목업 포함 초기 진입 대응.
// [MOCKUP] 서재 뱃지 시각 검증용 — 완독·진행 중·새책·좋아요 4상태가 한 화면에 보이도록 분배.
// Firestore 가 채워지면 자동으로 덮어써짐 — 실사용에는 영향 없음.
const MOCK_STATE_OVERRIDES: Record<string, { pageRatio?: number; favorite?: boolean }> = {
  primitive: { pageRatio: 0.37 },      // 37% — 진행 중 (넘패드 8 % 뱃지 확인)
  immutable: { pageRatio: 1 },          // 완독 — 흑백 + 돋움 돌 효과 확인
  "money-equation": { pageRatio: 0.58, favorite: true }, // 좋아요 + 진행 중
  "money-talk": { favorite: true },     // 좋아요 + 새 책
  hooked: { pageRatio: 1, favorite: true }, // 좋아요 + 완독 (⭐ 컬러 유지)
  // system / gratitude → 기본(0%, 📎 새 책)
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
      favorite: override.favorite,
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
    // 목업 기본값은 유지하되, Firestore 에 있는 값은 덮어쓴다.
    set((state) => ({
      statesByBook: { ...state.statesByBook, ...statesByBook },
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
      const book = initialBooks.find((b) => b.id === bookId);
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
