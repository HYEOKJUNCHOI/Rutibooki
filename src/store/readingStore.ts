import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ReadingState, ReadingLog, QuoteEntry } from "@/types/reading";
import { updatePaceEMA } from "@/utils/pace";
import { books as initialBooks } from "@/data/books";
import { Book } from "@/types/book";
import { getActivePart, getActiveSection } from "@/utils/reading";

// 진행도·세션·인용·코치마크를 책별로 관리하는 전역 스토어.
// Streak/연속일수 관련 필드는 앱의 헌법에 따라 전부 제거됨.

interface ReadingStore {
  // --- persisted ---
  statesByBook: Record<string, ReadingState>;
  logs: ReadingLog[];
  quotes: QuoteEntry[];
  coachmarkShown: boolean;
  // EMA 결과는 Book에 저장하는 대신 별도 맵으로 관리 (books.ts는 정적 목업이므로).
  paceByBook: Record<string, number | undefined>;

  // --- actions ---
  getState: (bookId: string) => ReadingState;
  updatePage: (bookId: string, page: number) => void;
  commitLog: (log: ReadingLog) => void;
  addQuote: (entry: QuoteEntry) => void;
  markCoachmarkShown: () => void;
  // 진행 중 세션 임시 저장 — Wake Lock 실패 시 안전망(2분 간격)
  saveDraft: (draft: {
    bookId: string;
    startedAt: string;
    startPage: number;
    elapsedSec: number;
  }) => void;
  // 테스트/실수 복구용 — 특정 책의 진행·로그·페이스·인용을 모두 비운다.
  resetBook: (bookId: string) => void;
  draft: {
    bookId: string;
    startedAt: string;
    startPage: number;
    elapsedSec: number;
  } | null;
}

// 앱 초기 진입 시 등록된 책들에 대해 기본 ReadingState를 만들어 둔다.
// 등록 플로우 전까지는 books.ts의 정적 데이터 기준.
function makeInitialStates(): Record<string, ReadingState> {
  const out: Record<string, ReadingState> = {};
  const now = new Date().toISOString();
  for (const b of initialBooks as Book[]) {
    out[b.id] = {
      bookId: b.id,
      currentPage: 0,
      activePartIndex: 1,
      activeSectionIndex: 0,
      lastOpenedAt: now,
    };
  }
  return out;
}

export const useReadingStore = create<ReadingStore>()(
  persist(
    (set, get) => ({
      statesByBook: makeInitialStates(),
      logs: [],
      quotes: [],
      coachmarkShown: false,
      paceByBook: {},
      draft: null,

      getState: (bookId) => {
        const s = get().statesByBook[bookId];
        if (s) return s;
        // 없으면 즉시 만들어 반환 (새로 등록된 책 대응)
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
        set((state) => {
          const prev = state.statesByBook[bookId];
          if (!prev) return state;
          // activePart/Section 인덱스는 books.ts 참조가 필요하므로 얕게 계산.
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
          return {
            statesByBook: {
              ...state.statesByBook,
              [bookId]: {
                ...prev,
                currentPage: page,
                activePartIndex,
                activeSectionIndex,
                lastOpenedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      commitLog: (log) => {
        set((state) => {
          const newLogs = [...state.logs, log];
          // EMA 업데이트 — 이 책의 이번 로그 포함 누적 세션 수 기준.
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

          // currentPage도 여기서 동기화 (updatePage와 별개 흐름 방어)
          const prevState = state.statesByBook[log.bookId];
          const updatedState = prevState
            ? {
                ...prevState,
                currentPage: log.endPage,
                lastOpenedAt: log.endedAt,
              }
            : prevState;

          return {
            logs: newLogs,
            paceByBook: { ...state.paceByBook, [log.bookId]: nextPace },
            statesByBook: updatedState
              ? { ...state.statesByBook, [log.bookId]: updatedState }
              : state.statesByBook,
            draft: null,
          };
        });
      },

      addQuote: (entry) => {
        set((state) => ({ quotes: [...state.quotes, entry] }));
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
      },
    }),
    {
      name: "ruti-reading-v1",
      // UI 일시 state 제외, 영속할 값만 partialize.
      partialize: (state) => ({
        statesByBook: state.statesByBook,
        logs: state.logs,
        quotes: state.quotes,
        coachmarkShown: state.coachmarkShown,
        paceByBook: state.paceByBook,
        draft: state.draft,
      }),
      // SSR hydration 이슈 방지 — 클라이언트 마운트 후 수동 rehydrate.
      skipHydration: true,
    },
  ),
);
