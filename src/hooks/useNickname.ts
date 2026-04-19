"use client";

// 로그인한 사용자의 닉네임을 Firestore profile 에서 1회 로드.
// 닉네임 미설정이면 null 반환 → 호출부에서 "나의 서재" 같은 fallback 문구를 결정.

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile } from "@/lib/firestore/usersRepo";

export function useNickname(): string | null {
  const { user } = useAuth();
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getUserProfile(user.uid)
      .then((p) => {
        if (!alive) return;
        const nn = p?.nickname?.trim();
        setNickname(nn && nn.length > 0 ? nn : null);
      })
      .catch((err) => console.warn("[useNickname]", err));
    return () => {
      alive = false;
      // 유저가 바뀌거나 로그아웃하면 이전 유저 닉네임이 새 세션으로 새지 않도록 리셋.
      setNickname(null);
    };
  }, [user]);

  return nickname;
}
