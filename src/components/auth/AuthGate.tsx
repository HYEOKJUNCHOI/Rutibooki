"use client";

// /login 을 제외한 모든 라우트를 감싸는 게이트.
// 초기 onAuthStateChanged 응답 전(loading=true)에는 조용히 검정 화면만 — 헌법상 깜빡임 최소화.
// 미로그인이면 /login 으로 replace (push X, 뒤로가기로 복귀 못하도록).

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: React.ReactNode;
}

export default function AuthGate({ children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    // /login 은 게이트 밖에서 렌더되므로 여기 도달하지 않지만, 방어적으로 제외.
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  // 로그인 상태가 확정되기 전에는 앱 UI를 숨긴다 — 짧게 보이는 섬광 방지.
  if (loading || !user) {
    return (
      <div
        style={{
          background: "#050505",
          minHeight: "100vh",
          width: "100%",
        }}
        aria-hidden
      />
    );
  }

  return <>{children}</>;
}
