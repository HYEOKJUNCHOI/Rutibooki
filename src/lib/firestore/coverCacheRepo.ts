"use client";

// 표지 검색 결과 캐시. 전체 유저 공유 — coverCache/{searchQueryHash}.
// TTL은 Firestore가 자동 지원 안 하므로 updatedAt + 30일 stale 체크를 코드에서.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CoverCacheEntry {
  image: string | null;
  updatedAt: string; // ISO
  query: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// 특수문자·공백 그대로 문서 id 로 쓸 수 없어 encodeURIComponent 로 안전화.
// Firestore 문서 id 길이 제한(1500B)을 감안해 너무 길면 slice.
export function hashSearchQuery(query: string): string {
  const normalized = query.trim().toLowerCase();
  const encoded = encodeURIComponent(normalized).replace(/\./g, "%2E");
  // '/' 는 경로 분리로 해석되므로 encode 됨. 파이어스토어 id에선 '__'·'.' 금지 케이스만 피하면 됨.
  return encoded.slice(0, 300) || "empty";
}

function cacheDoc(key: string) {
  return doc(db, "coverCache", key);
}

export async function getCached(
  query: string,
): Promise<CoverCacheEntry | null> {
  const key = hashSearchQuery(query);
  const snap = await getDoc(cacheDoc(key));
  if (!snap.exists()) return null;
  const data = snap.data() as CoverCacheEntry;
  // 30일 초과면 stale — 호출측이 재검증하도록 null 반환.
  const ageMs = Date.now() - new Date(data.updatedAt).getTime();
  if (ageMs > THIRTY_DAYS_MS) return null;
  return data;
}

export async function setCached(
  query: string,
  image: string | null,
): Promise<void> {
  const key = hashSearchQuery(query);
  await setDoc(cacheDoc(key), {
    image,
    updatedAt: new Date().toISOString(),
    query,
  } satisfies CoverCacheEntry);
}
