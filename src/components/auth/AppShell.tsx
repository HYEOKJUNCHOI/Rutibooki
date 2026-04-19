"use client";

// 루트 레이아웃이 서버 컴포넌트라 pathname/hook을 쓸 수 없어
// AuthProvider + 경로 조건부 AuthGate 를 감싸는 클라이언트 셸을 따로 둔다.
// /login 은 비로그인 상태에서 접근해야 하므로 게이트 제외.

import { usePathname } from "next/navigation";
import AuthProvider from "./AuthProvider";
import AuthGate from "./AuthGate";

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login";

  return (
    <AuthProvider>
      {isAuthRoute ? <>{children}</> : <AuthGate>{children}</AuthGate>}
    </AuthProvider>
  );
}
