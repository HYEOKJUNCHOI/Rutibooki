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
  // user 가 없을 때의 기본값은 state 초기값으로 처리 → effect 조기 return 경로에서
  // 불필요한 setState 가 사라져 react-hooks/set-state-in-effect 규칙 준수.
  const [ms, setMs] = useState<number>(LONG_PRESS_MS);

  useEffect(() => {
    if (!user) return;
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
      // 로그아웃·유저 변경 시 이전 유저 값이 새 유저로 잠깐 누수되지 않도록 기본값으로 복귀.
      setMs(LONG_PRESS_MS);
    };
  }, [user]);

  return ms;
}
