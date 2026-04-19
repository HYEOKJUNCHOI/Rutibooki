import { create } from "zustand";
import { Book } from "@/types/book";
import { auth } from "@/lib/firebase";
import * as booksRepo from "@/lib/firestore/booksRepo";
import * as readingRepo from "@/lib/firestore/readingRepo";

// 등록 책 상태. Firestore가 source of truth, zustand는 in-memory 캐시.
// mutation은 Firestore write를 즉시 실행하고, onSnapshot 이 hydrate 로 되돌아 들어온다.
// persist middleware 는 제거 — 로그인 전 로컬 저장은 더 이상 필요 없음.

interface BooksStore {
  registered: Book[];
  hydrate: (books: Book[]) => void;
  addBook: (book: Book) => Promise<void>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  getById: (id: string) => Book | undefined;
}

// 미로그인 상태에서 mutation이 호출되면 조용히 throw — AuthGate 이후에만 도달해야 함.
function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("booksStore: 로그인 필요");
  return uid;
}

export const useBooksStore = create<BooksStore>()((set, get) => ({
  registered: [],

  hydrate: (books) => set({ registered: books }),

  addBook: async (book) => {
    const uid = requireUid();
    // 로컬 optimistic 업데이트 — onSnapshot 도착 전 UI 반영.
    set((state) => {
      const without = state.registered.filter((b) => b.id !== book.id);
      return { registered: [...without, book] };
    });
    await booksRepo.addBook(uid, book);
  },

  updateBook: async (id, patch) => {
    const uid = requireUid();
    set((state) => ({
      registered: state.registered.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      ),
    }));
    await booksRepo.updateBook(uid, id, patch);
  },

  removeBook: async (id) => {
    const uid = requireUid();
    set((state) => ({
      registered: state.registered.filter((b) => b.id !== id),
    }));
    // 책 삭제 시 해당 reading 문서도 같이 치우기 — 고아 데이터 방지.
    await Promise.all([
      booksRepo.removeBook(uid, id),
      readingRepo.deleteReadingDoc(uid, id),
    ]);
  },

  getById: (id) => get().registered.find((b) => b.id === id),
}));
