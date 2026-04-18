import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rutibooki",
  description: "매일 조금씩, 책과 가까워지는 독서 리추얼",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
