"use client";

// users/{uid} 프로필 업서트·조회.
// 로그인 시 1회 호출해 profile 기본 필드를 채운다.

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

export interface UserProfile {
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  nickname?: string | null;
  onboardedAt: string | null;
  createdAt: unknown; // serverTimestamp
  migratedAt?: unknown;
  // (#17) 길게 누르기 시간(ms) — 미설정이면 LONG_PRESS_MS 기본값 사용.
  longPressMs?: number | null;
}

function userDoc(uid: string) {
  return doc(db, "users", uid);
}

// 최초 로그인 시 프로필 문서 생성. 이미 있으면 기본 필드만 병합.
export async function ensureUserProfile(user: User): Promise<void> {
  const ref = userDoc(user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      profile: {
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        onboardedAt: null,
        createdAt: serverTimestamp(),
      },
    });
  } else {
    // 프로필 경신(이름·사진 변경 반영). merge:true 로 다른 필드 보존.
    await setDoc(
      ref,
      {
        profile: {
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email,
        },
      },
      { merge: true },
    );
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { profile?: UserProfile };
  return data.profile ?? null;
}

// 온보딩 완료 마킹 — 기존 localStorage 플래그를 대체.
export async function markOnboarded(uid: string): Promise<void> {
  await updateDoc(userDoc(uid), {
    "profile.onboardedAt": new Date().toISOString(),
  });
}

// 닉네임 저장 — 빈 문자열이면 null 로 정리해서 fallback 조건을 단순화.
export async function updateNickname(uid: string, nickname: string): Promise<void> {
  const trimmed = nickname.trim();
  await updateDoc(userDoc(uid), {
    "profile.nickname": trimmed.length > 0 ? trimmed : null,
  });
}

// (#17) 길게 누르기 시간 저장. ms 단위. 범위는 호출부에서 검증.
export async function updateLongPressMs(
  uid: string,
  ms: number,
): Promise<void> {
  await updateDoc(userDoc(uid), {
    "profile.longPressMs": ms,
  });
}

export async function markMigrated(uid: string): Promise<void> {
  await updateDoc(userDoc(uid), {
    "profile.migratedAt": new Date().toISOString(),
  });
}
