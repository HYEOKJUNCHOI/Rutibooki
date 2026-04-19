import type { Metadata, Viewport } from "next";
import "./globals.css";

// T-44: PWA 메타. Next 16은 themeColor/viewport를 Viewport 객체로 분리해야 한다.
// apple-mobile-web-app-* 는 appleWebApp 필드로 자동 생성되고,
// viewport-fit=cover 는 Viewport 타입 미지원이라 <head>에서 직접 <meta> 로 둔다.
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
        {/* iOS 키보드 올라와도 노치/홈바 영역까지 배경 깔리도록 viewport-fit=cover. Next Viewport 타입에 없어 수동. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
