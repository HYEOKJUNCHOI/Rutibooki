import type { NextConfig } from "next";

// [Security MED #9] 전역 보안 헤더.
// CSP 는 Firebase Auth(팝업/redirect)·Gemini API·jsdelivr(Pretendard) 모두 허용해야 해서
// 이번 라운드에선 범용 보호 헤더만 넣고 CSP 는 별도 R&D 로 미룸.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera 만 허용(표지 촬영용). mic/geolocation/usb 등 전면 차단.
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    // HTTPS 전용 브라우저. preload 는 도메인 안정화 후 고려.
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
