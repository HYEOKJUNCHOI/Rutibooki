"use client";

// 로그인 페이지 — Google / Kakao / Naver 3종.
// 헌법("강제 금지, 조용한 도움"): 설명 문구는 작게, 카카오·네이버는 구현 예정 토스트.
// 로그인 성공 시 onAuthStateChanged 가 AuthProvider 에서 감지하고 AuthGate 가 / 로 풀어준다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import PhoneFrame from "@/components/layout/PhoneFrame";

// Google 공식 색상 G 아이콘 (구글 브랜드 가이드 준수용 4색 SVG).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// Kakao 말풍선 아이콘 — 카카오 공식 심볼 단순화.
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#191919"
        d="M12 3C6.48 3 2 6.58 2 11c0 2.87 1.9 5.38 4.73 6.79-.2.75-.72 2.7-.82 3.12-.13.52.19.51.4.37.17-.11 2.64-1.79 3.7-2.51.65.09 1.32.14 1.99.14 5.52 0 10-3.58 10-8s-4.48-8-10-8z"
      />
    </svg>
  );
}

// Naver N 심볼.
function NaverIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#FFFFFF" d="M16.27 12.845 7.25 0H0v24h7.73V11.155L16.75 24H24V0h-7.73z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 토스트 — 브라우저 alert 대신 PhoneFrame 하단에서 올라오는 카드.
  // 한 번에 하나만 띄우고, 자동으로 사라지게 해 사용자 흐름을 방해하지 않음.
  const [toast, setToast] = useState<string | null>(null);

  // 이미 로그인돼 있으면 서재로 바로 이동.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  // 토스트 자동 소멸 — 2.4s. 버튼 연타 시 타이머 재시작.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // 성공 시 onAuthStateChanged → AuthGate 가 라우팅 처리.
    } catch (err) {
      console.error("[login] signInWithPopup", err);
      setError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  const handleComingSoon = (provider: string) => {
    setToast(`${provider} 로그인은 곧 열어둘게요 🛠️`);
  };

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 토스트 keyframe — 인라인 정의로 별도 CSS 파일 없이 처리. */}
        <style>{`
          @keyframes rb-toast-in {
            0% { opacity: 0; transform: translate(-50%, 12px); }
            100% { opacity: 1; transform: translate(-50%, 0); }
          }
        `}</style>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 32,
            padding: "0 8px",
            position: "relative",
          }}
        >
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            {/* 앱 마크 — PWA 아이콘을 재사용. 초록 아우라로 살짝 떠있는 느낌. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="Rutibooki"
              width={64}
              height={64}
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                boxShadow:
                  "0 8px 24px rgba(0,255,122,0.18), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            />
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#E8E8E8",
                margin: 0,
                letterSpacing: "-0.8px",
              }}
            >
              Rutibooki
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "#5A5A5A",
                marginTop: 10,
                letterSpacing: "-0.2px",
              }}
            >
              조용한 독서 동행
            </p>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "#7A7A7A",
                letterSpacing: "-0.2px",
                margin: "0 0 6px",
              }}
            >
              서재를 저장하기 위해 로그인해요
            </p>

            {/* Google — 공식 가이드(흰 배경 + 4색 G + 중립 텍스트) 준수. */}
            <button
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: "100%",
                maxWidth: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "#FFFFFF",
                color: "#1F1F1F",
                border: "1px solid #DADCE0",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Roboto', inherit",
                cursor: busy ? "default" : "pointer",
                letterSpacing: "-0.1px",
                opacity: busy ? 0.6 : 1,
                boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                transition: "background 120ms ease, box-shadow 120ms ease",
              }}
            >
              <GoogleIcon />
              <span>{busy ? "연결 중…" : "Google로 계속하기"}</span>
            </button>

            {/* Kakao — 공식 노랑 #FEE500 + 검정 말풍선 + 검정 텍스트. */}
            <button
              onClick={() => handleComingSoon("카카오")}
              style={{
                width: "100%",
                maxWidth: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "#FEE500",
                color: "#191919",
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                letterSpacing: "-0.2px",
              }}
            >
              <KakaoIcon />
              <span>카카오로 계속하기</span>
            </button>

            {/* Naver — 공식 초록 #03C75A + 흰 N + 흰 텍스트. */}
            <button
              onClick={() => handleComingSoon("네이버")}
              style={{
                width: "100%",
                maxWidth: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "#03C75A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                letterSpacing: "-0.2px",
              }}
            >
              <NaverIcon />
              <span>네이버로 계속하기</span>
            </button>

            {error && (
              <p
                style={{
                  fontSize: 11,
                  color: "#E55A5A",
                  margin: "4px 0 0",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* 커스텀 토스트 — alert 대체. PhoneFrame 하단에서 살짝 올라옴. */}
          {toast && (
            <div
              role="status"
              aria-live="polite"
              style={{
                position: "absolute",
                left: "50%",
                bottom: 28,
                transform: "translateX(-50%)",
                background: "rgba(20,20,20,0.95)",
                color: "#E8E8E8",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: "10px 16px",
                fontSize: 12,
                letterSpacing: "-0.2px",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,122,0.08)",
                backdropFilter: "blur(6px)",
                whiteSpace: "nowrap",
                animation: "rb-toast-in 180ms ease-out",
              }}
            >
              {toast}
            </div>
          )}
        </div>
      </PhoneFrame>
    </main>
  );
}
