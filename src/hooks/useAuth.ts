"use client";

// Auth Context 소비 훅. 실제 구독은 AuthProvider 에서 수행하고 여기선 값만 읽는다.
// 컴포넌트에서 { user, loading } 을 바로 쓰기 위한 얇은 어댑터.

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/components/auth/AuthContext";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  // Provider로 감싸지 않은 곳에서 호출하면 바로 드러나도록 throw.
  if (!ctx) throw new Error("useAuth: AuthProvider 내부에서만 사용 가능");
  return ctx;
}
