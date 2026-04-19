"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LONG_PRESS_MS } from "@/constants/reading";

// 0.8초 누르면 onComplete 발화. progress(0~1)로 링 시각화 가능.
// 터치/마우스 양쪽 지원. haptic 지원 시 완료 시점에 짧은 진동.
export function useLongPress(
  onComplete: () => void,
  opts: { durationMs?: number; haptic?: boolean } = {},
) {
  const durationMs = opts.durationMs ?? LONG_PRESS_MS;
  const haptic = opts.haptic ?? true;

  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const cancel = useCallback(() => {
    startRef.current = null;
    setProgress(0);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    startRef.current = Date.now();
    const tick = () => {
      if (startRef.current == null) return;
      const p = Math.min((Date.now() - startRef.current) / durationMs, 1);
      setProgress(p);
      if (p >= 1) {
        cancel();
        // Vibration API는 iOS Safari 미지원 — try/catch로 조용히.
        if (haptic && typeof navigator !== "undefined") {
          try {
            (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean })
              .vibrate?.(30);
          } catch {
            // 무시
          }
        }
        onCompleteRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs, haptic, cancel]);

  // 언마운트 시 RAF 누수 방지
  useEffect(() => () => cancel(), [cancel]);

  return {
    progress,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    },
  };
}
