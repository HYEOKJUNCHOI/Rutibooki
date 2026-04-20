// 기존 localStorage (zustand persist) 데이터를 Firestore 로 1회 마이그레이션.
// 중복 방지: users/{uid}/profile.migratedAt 있으면 스킵.
// 대상 키: ruti-books-v1, ruti-reading-v1, ruti-onboarded-v1.

import { writeBatch, doc, type WriteBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Book } from "@/types/book";
import type {
  QuoteEntry,
  ReadingLog,
  ReadingState,
} from "@/types/reading";
import { ONBOARD_FLAG_KEY } from "@/constants/onboarding";
import {
  getUserProfile,
  markMigrated,
  markOnboarded,
} from "./usersRepo";
import { quoteIdOf } from "./readingRepo";

interface PersistBox<T> {
  state: T;
  version?: number;
}

interface BooksPersistState {
  registered?: Book[];
}
interface ReadingPersistState {
  statesByBook?: Record<string, ReadingState>;
  logs?: ReadingLog[];
  quotes?: QuoteEntry[];
  coachmarkShown?: boolean;
  paceByBook?: Record<string, number | undefined>;
  draft?: unknown;
}

function readLS<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clearLS(keys: string[]) {
  for (const k of keys) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // 실패 무시.
    }
  }
}

// writes 배열을 chunk 단위로 나눠 batch 커밋 — 500 상한 여유있게 450.
async function commitInChunks(
  ops: Array<(batch: WriteBatch) => void>,
): Promise<void> {
  const CHUNK = 450;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + CHUNK)) op(batch);
    await batch.commit();
  }
}

export async function runLegacyMigration(uid: string): Promise<void> {
  if (typeof window === "undefined") return;

  const profile = await getUserProfile(uid);
  if (profile?.migratedAt) return; // 이미 완료

  const booksBox = readLS<PersistBox<BooksPersistState>>("ruti-books-v1");
  const readingBox = readLS<PersistBox<ReadingPersistState>>(
    "ruti-reading-v1",
  );
  const onboardedFlag = (() => {
    try {
      return window.localStorage.getItem(ONBOARD_FLAG_KEY) === "1";
    } catch {
      return false;
    }
  })();

  const books = booksBox?.state.registered ?? [];
  const states = readingBox?.state.statesByBook ?? {};
  const logs = readingBox?.state.logs ?? [];
  const quotes = readingBox?.state.quotes ?? [];
  const paceByBook = readingBox?.state.paceByBook ?? {};

  const hasAny =
    books.length > 0 ||
    Object.keys(states).length > 0 ||
    logs.length > 0 ||
    quotes.length > 0 ||
    onboardedFlag;

  if (!hasAny) {
    await markMigrated(uid);
    return;
  }

  const ops: Array<(batch: WriteBatch) => void> = [];

  for (const b of books) {
    ops.push((batch) =>
      batch.set(doc(db, "users", uid, "books", b.id), b),
    );
  }
  for (const [bookId, s] of Object.entries(states)) {
    ops.push((batch) =>
      batch.set(doc(db, "users", uid, "reading", bookId), {
        ...s,
        avgMinPerPage: paceByBook[bookId] ?? null,
      }),
    );
  }
  for (const log of logs) {
    ops.push((batch) =>
      batch.set(doc(db, "users", uid, "logs", log.id), log),
    );
  }
  for (const q of quotes) {
    ops.push((batch) =>
      batch.set(doc(db, "users", uid, "quotes", quoteIdOf(q)), q),
    );
  }

  await commitInChunks(ops);

  if (onboardedFlag) {
    await markOnboarded(uid);
  }
  await markMigrated(uid);

  clearLS(["ruti-books-v1", "ruti-reading-v1", ONBOARD_FLAG_KEY]);
}
