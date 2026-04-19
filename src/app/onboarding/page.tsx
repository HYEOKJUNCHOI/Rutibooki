"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import PhoneFrame from "@/components/layout/PhoneFrame";
import OnboardingCards from "@/components/onboarding/OnboardingCards";
import { ONBOARD_FLAG_KEY } from "@/constants/onboarding";

// T-31, T-32: /onboarding 라우트. 3장 과학 카드 + 스킵 버튼 + 1회 게이트.

export default function OnboardingPage() {
  const router = useRouter();

  const finish = useCallback(() => {
    // localStorage 접근은 클라이언트에서만. "use client"라 안전.
    try {
      window.localStorage.setItem(ONBOARD_FLAG_KEY, "1");
    } catch {
      // 사파리 프라이빗 모드 등 저장 실패는 조용히 무시 (재노출 감수).
    }
    router.replace("/");
  }, [router]);

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 상단 우측 스킵 버튼 — 상시 노출. 강제 금지 원칙. */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          <button
            onClick={finish}
            style={{
              background: "transparent",
              color: "#7A7A7A",
              border: "none",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "4px 2px",
            }}
          >
            건너뛰기
          </button>
        </div>
        <OnboardingCards onFinish={finish} />
      </PhoneFrame>
    </main>
  );
}
