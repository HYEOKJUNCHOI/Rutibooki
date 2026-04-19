"use client";

// (#17) 사용자 설정 "길게 누르기 시간(ms)"을 Firestore profile 에서 로드.
// 미설정이면 LONG_PRESS_MS (2000ms) fallback. user 가 없으면 기본값.
// 최초 로드 전에는 기본값을 반환해 hook 이 동작을 지연시키지 않는다.

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile } from "@/lib/firestore/usersRepo";
import { LONG_PRESS_MS } from "@/constants/reading";

export function useLongPressMs(): number {
  const { user } = useAuth();
  const [ms, setMs] = useState<number>(LONG_PRESS_MS);

  useEffect(() => {
    if (!user) {
      setMs(LONG_PRESS_MS);
      return;
    }
    let alive = true;
    getUserProfile(user.uid)
      .then((p) => {
        if (!alive) return;
        const v = p?.longPressMs;
        if (typeof v === "number" && v >= 300 && v <= 5000) setMs(v);
        else setMs(LONG_PRESS_MS);
      })
      .catch((err) => console.warn("[useLongPressMs]", err));
    return () => {
      alive = false;
    };
  }, [user]);

  return ms;
}
