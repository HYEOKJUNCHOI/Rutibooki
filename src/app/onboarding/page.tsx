"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import PhoneFrame from "@/components/layout/PhoneFrame";
import OnboardingCards from "@/components/onboarding/OnboardingCards";
import { useAuth } from "@/hooks/useAuth";
import { markOnboarded } from "@/lib/firestore/usersRepo";

// T-31, T-32: /onboarding 라우트. 3장 과학 카드 + 스킵 버튼 + 1회 게이트.
// 플래그는 Firestore users/{uid}/profile.onboardedAt 로 이전됨. 로컬 저장소 X.

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const finish = useCallback(async () => {
    if (user) {
      try {
        await markOnboarded(user.uid);
      } catch {
        // Firestore 실패는 조용히 무시 — 재노출 감수. 헌법상 사용자 막지 않음.
      }
    }
    router.replace("/");
  }, [router, user]);

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
