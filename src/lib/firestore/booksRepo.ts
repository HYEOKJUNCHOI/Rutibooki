// users/{uid}/books/{bookId} — 사용자가 등록한 책 CRUD + 실시간 구독.
// Book 타입 전체를 그대로 저장. 문서 id = book.id.

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Book } from "@/types/book";

function booksCol(uid: string) {
  return collection(db, "users", uid, "books");
}
function bookDoc(uid: string, bookId: string) {
  return doc(db, "users", uid, "books", bookId);
}

export async function addBook(uid: string, book: Book): Promise<void> {
  // setDoc + merge:false — 기존 문서가 있으면 덮어쓰기(검수 재진입 허용).
  await setDoc(bookDoc(uid, book.id), book);
}

export async function updateBook(
  uid: string,
  id: string,
  patch: Partial<Book>,
): Promise<void> {
  await updateDoc(bookDoc(uid, id), patch);
}

export async function removeBook(uid: string, id: string): Promise<void> {
  await deleteDoc(bookDoc(uid, id));
}

export async function listBooks(uid: string): Promise<Book[]> {
  const snap = await getDocs(booksCol(uid));
  return snap.docs.map((d) => d.data() as Book);
}

