import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/auth/AppShell";

// T-44: PWA 메타. Next 16은 themeColor/viewport를 Viewport 객체로 분리해야 한다.
// apple-mobile-web-app-* 는 appleWebApp 필드로 자동 생성.
// [Critical C-3] viewport-fit=cover 는 Viewport 타입의 viewportFit 필드로 지원됨.
// 과거에는 수동 <meta> 로 중복 주입해서 Next.js 자동 메타와 충돌했음.
export const metadata: Metadata = {
  title: "Rutibooki",
  description: "조용한 독서 동행",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Rutibooki",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // apple-touch-icon 180 PNG는 아직 미생성 — iOS 홈 화면 아이콘은 기본 스크린샷으로 폴백.
    // 모던 브라우저용 SVG만 지정, PNG는 T-43 후속에서 sharp로 내보낸 뒤 추가.
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
