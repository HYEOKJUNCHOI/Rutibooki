"use client";

// reading / logs / quotes 를 책별·세션별로 관리하는 Firestore 레포.
// - users/{uid}/reading/{bookId}       ReadingState + paceByBook[bookId] 병합 저장
// - users/{uid}/logs/{logId}           세션 로그
// - users/{uid}/quotes/{quoteId}       인용 (id = `${bookId}_${partIndex}_${createdAt}`)

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  QuoteEntry,
  ReadingLog,
  ReadingState,
} from "@/types/reading";

interface ReadingDoc extends ReadingState {
  // 책별 EMA 페이스 — 기존엔 paceByBook 맵에 있었으나 reading 문서에 병합해 단일 경로로.
  avgMinPerPage?: number | null;
}

function readingCol(uid: string) {
  return collection(db, "users", uid, "reading");
}
function readingDoc(uid: string, bookId: string) {
  return doc(db, "users", uid, "reading", bookId);
}
function logsCol(uid: string) {
  return collection(db, "users", uid, "logs");
}
function logDoc(uid: string, logId: string) {
  return doc(db, "users", uid, "logs", logId);
}
function quotesCol(uid: string) {
  return collection(db, "users", uid, "quotes");
}
function quoteDoc(uid: string, quoteId: string) {
  return doc(db, "users", uid, "quotes", quoteId);
}

// 인용 id — 같은 파트 같은 시각 중복 방지 겸 안정 키.
export function quoteIdOf(q: QuoteEntry): string {
  return `${q.bookId}_${q.partIndex}_${q.createdAt}`;
}

// --- reading state ---

export async function getState(
  uid: string,
  bookId: string,
): Promise<ReadingDoc | null> {
  const snap = await getDoc(readingDoc(uid, bookId));
  return snap.exists() ? (snap.data() as ReadingDoc) : null;
}

export async function putState(
  uid: string,
  state: ReadingState,
  avgMinPerPage?: number,
): Promise<void> {
  const payload: ReadingDoc = {
    ...state,
    avgMinPerPage: avgMinPerPage ?? null,
  };
  await setDoc(readingDoc(uid, state.bookId), payload);
}

// 페이지만 갱신할 때 호출 — 불필요한 payload 전송 최소화.
export async function updatePage(
  uid: string,
  state: ReadingState,
): Promise<void> {
  await setDoc(readingDoc(uid, state.bookId), state, { merge: true });
}

// (#9) 요일 반복 설정. 빈 배열(= 매일)도 명시 저장 가능하도록 merge.
export async function updateWeekdays(
  uid: string,
  bookId: string,
  weekdays: number[],
): Promise<void> {
  await setDoc(
    readingDoc(uid, bookId),
    { bookId, weekdays },
    { merge: true },
  );
}

export async function listReadingStates(
  uid: string,
): Promise<ReadingDoc[]> {
  const snap = await getDocs(readingCol(uid));
  return snap.docs.map((d) => d.data() as ReadingDoc);
}

export function onReadingSnapshot(
  uid: string,
  cb: (states: ReadingDoc[]) => void,
): Unsubscribe {
  return onSnapshot(readingCol(uid), (snap) => {
    cb(snap.docs.map((d) => d.data() as ReadingDoc));
  });
}

// --- logs ---

export async function commitLog(
  uid: string,
  log: ReadingLog,
): Promise<void> {
  await setDoc(logDoc(uid, log.id), log);
}

export async function listLogs(uid: string): Promise<ReadingLog[]> {
  const snap = await getDocs(logsCol(uid));
  return snap.docs.map((d) => d.data() as ReadingLog);
}

export function onLogsSnapshot(
  uid: string,
  cb: (logs: ReadingLog[]) => void,
): Unsubscribe {
  return onSnapshot(logsCol(uid), (snap) => {
    cb(snap.docs.map((d) => d.data() as ReadingLog));
  });
}

// --- quotes ---

export async function addQuote(uid: string, entry: QuoteEntry): Promise<void> {
  await setDoc(quoteDoc(uid, quoteIdOf(entry)), entry);
}

export async function listQuotes(uid: string): Promise<QuoteEntry[]> {
  const snap = await getDocs(quotesCol(uid));
  return snap.docs.map((d) => d.data() as QuoteEntry);
}

export function onQuotesSnapshot(
  uid: string,
  cb: (quotes: QuoteEntry[]) => void,
): Unsubscribe {
  return onSnapshot(quotesCol(uid), (snap) => {
    cb(snap.docs.map((d) => d.data() as QuoteEntry));
  });
}

// --- reset ---

// 특정 책의 reading·logs·quotes 삭제. batch 로 원자성 확보.
export async function resetBook(
  uid: string,
  bookId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(readingDoc(uid, bookId));

  const logsQ = query(logsCol(uid), where("bookId", "==", bookId));
  const logsSnap = await getDocs(logsQ);
  logsSnap.docs.forEach((d) => batch.delete(d.ref));

  const quotesQ = query(quotesCol(uid), where("bookId", "==", bookId));
  const quotesSnap = await getDocs(quotesQ);
  quotesSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

// 책 삭제 시 같이 치우는 용도.
export async function deleteReadingDoc(
  uid: string,
  bookId: string,
): Promise<void> {
  await deleteDoc(readingDoc(uid, bookId));
}
