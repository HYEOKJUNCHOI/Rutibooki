import { create } from "zustand";

interface ReadingStore {
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export const useReadingStore = create<ReadingStore>((set) => ({
  currentPage: 0,
  setCurrentPage: (page) => set({ currentPage: page }),
}));
