import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Book } from "@/types/book";

// T-34~T-38: 사용자가 /register 에서 등록한 책을 보관하는 별도 스토어.
// 정적 목업(data/books.ts)과 분리 — 등록 플로우의 소스 오브 트루스.

interface BooksStore {
  registered: Book[];
  addBook: (book: Book) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;
  getById: (id: string) => Book | undefined;
}

export const useBooksStore = create<BooksStore>()(
  persist(
    (set, get) => ({
      registered: [],

      addBook: (book) => {
        set((state) => {
          // 동일 id가 있으면 덮어쓰기 (검수 재진입 대응)
          const without = state.registered.filter((b) => b.id !== book.id);
          return { registered: [...without, book] };
        });
      },

      updateBook: (id, patch) => {
        set((state) => ({
          registered: state.registered.map((b) =>
            b.id === id ? { ...b, ...patch } : b,
          ),
        }));
      },

      removeBook: (id) => {
        set((state) => ({
          registered: state.registered.filter((b) => b.id !== id),
        }));
      },

      getById: (id) => get().registered.find((b) => b.id === id),
    }),
    {
      name: "ruti-books-v1",
      // readingStore와 동일 패턴 — SSR hydration mismatch 방지.
      skipHydration: true,
    },
  ),
);
