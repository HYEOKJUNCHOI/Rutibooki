"use client";

// onAuthStateChanged 를 한 번만 구독해서 앱 전체에 로그인 상태를 공급하는 Provider.
// 로그인 직후 로컬 → Firestore 마이그레이션과 서재 pull 을 트리거하는 지점이기도 하다.

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthContext } from "./AuthContext";
import { ensureUserProfile } from "@/lib/firestore/usersRepo";
import { runLegacyMigration } from "@/lib/firestore/migrate";
import { pullUserStateToStores } from "@/lib/firestore/pull";

interface Props {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  // 초기 1회 onAuthStateChanged 응답 전까지는 loading=true — 미로그인 판단 오탐 방지.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // 프로필 업서트 → 레거시 마이그레이션 → 스토어 pull 순.
        // 실패해도 앱은 계속 쓸 수 있어야 하므로 개별 try/catch.
        try {
          await ensureUserProfile(u);
        } catch (err) {
          console.error("[AuthProvider] ensureUserProfile", err);
        }
        try {
          await runLegacyMigration(u.uid);
        } catch (err) {
          console.error("[AuthProvider] runLegacyMigration", err);
        }
        try {
          await pullUserStateToStores(u.uid);
        } catch (err) {
          console.error("[AuthProvider] pullUserStateToStores", err);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
