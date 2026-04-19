"use client";
import { useEffect, useRef } from "react";
import { ABSENCE_MIN_AWAY_MS } from "@/constants/reading";

// 딴짓 감지: 앱을 떠났다 돌아온 시점을 감지해 복귀 오버레이 트리거.
// minAwayMs 미만의 짧은 이탈은 우발적 터치로 간주하고 무시한다.
export function useVisibilityChange(opts: {
  enabled: boolean;
  minAwayMs?: number;
  onReturn: (awayMs: number) => void;
}) {
  const hiddenAtRef = useRef<number | null>(null);
  const minAwayMs = opts.minAwayMs ?? ABSENCE_MIN_AWAY_MS;
  // onReturn 최신 값을 ref 로 stable binding. 렌더 중 ref 업데이트는 린트 위반이라
  // effect 에서 동기화한다.
  const onReturnRef = useRef(opts.onReturn);
  useEffect(() => {
    onReturnRef.current = opts.onReturn;
  }, [opts.onReturn]);

  useEffect(() => {
    if (!opts.enabled) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (
        document.visibilityState === "visible" &&
        hiddenAtRef.current != null
      ) {
        const away = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (away >= minAwayMs) onReturnRef.current(away);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [opts.enabled, minAwayMs]);
}
