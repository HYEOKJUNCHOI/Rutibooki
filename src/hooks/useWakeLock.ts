"use client";
import { useEffect, useRef, useState } from "react";

// Screen Wake Lock API. 지원 안 하는 브라우저(iOS 16 이하 등)에서는 조용히 실패.
// 2분 간격 자동 스냅샷(AUTOSAVE_INTERVAL_MS)이 안전망 역할.

// 타입: Wake Lock API는 TS lib에 있으나 환경마다 편차가 있어 any로 우회.
interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
}

export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // 브라우저 지원 여부 체크 — 미지원이면 실패 플래그만 올리고 종료.
    const anyNav = navigator as unknown as {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!anyNav.wakeLock) {
      setFailed(true);
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await anyNav.wakeLock!.request("screen");
        if (cancelled) {
          s.release().catch(() => {});
          return;
        }
        sentinelRef.current = s;
        setActive(true);
        s.addEventListener("release", () => setActive(false));
      } catch {
        setFailed(true);
      }
    };
    acquire();

    // 앱이 백그라운드로 갔다 돌아오면 Wake Lock이 자동 해제됨 → 재요청.
    const onVis = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [enabled]);

  return { active, failed };
}
