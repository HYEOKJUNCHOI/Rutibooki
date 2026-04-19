"use client";

// 로그인 직후 1회 Firestore 상태를 읽어 zustand 스토어에 주입한다.
// 실시간 구독(onSnapshot) 은 필요 시 추후 붙일 수 있지만 MVP 는 pull + 개별 write 만으로 충분.

import * as booksRepo from "./booksRepo";
import * as readingRepo from "./readingRepo";
import { useBooksStore } from "@/store/booksStore";
import { useReadingStore } from "@/store/readingStore";
import type { ReadingState } from "@/types/reading";

export async function pullUserStateToStores(uid: string): Promise<void> {
  const [books, readings, logs, quotes] = await Promise.all([
    booksRepo.listBooks(uid),
    readingRepo.listReadingStates(uid),
    readingRepo.listLogs(uid),
    readingRepo.listQuotes(uid),
  ]);

  // zustand hydrate — Book 타입은 그대로, reading 은 avgMinPerPage 를 paceByBook 로 분리.
  useBooksStore.getState().hydrate(books);

  const statesByBook: Record<string, ReadingState> = {};
  const paceByBook: Record<string, number | undefined> = {};
  for (const r of readings) {
    // avgMinPerPage 는 별도 맵에 넣고 나머지는 ReadingState 그대로.
    const { avgMinPerPage, ...state } = r;
    statesByBook[r.bookId] = state;
    if (typeof avgMinPerPage === "number") paceByBook[r.bookId] = avgMinPerPage;
  }

  useReadingStore.getState().hydrate({
    statesByBook,
    logs,
    quotes,
    paceByBook,
  });
}
