"use client";

// 로그인 페이지 — 구글 OAuth 단일 버튼.
// 헌법("강제 금지, 조용한 도움") 반영: 설명 문구는 작게, 버튼 위 한 줄로만.
// 로그인 성공 시 onAuthStateChanged 가 AuthProvider 에서 감지하고 AuthGate 가 / 로 풀어준다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import PhoneFrame from "@/components/layout/PhoneFrame";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인돼 있으면 서재로 바로 이동.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // 성공 시 onAuthStateChanged → AuthGate 가 라우팅 처리. 여기선 그대로 둠.
    } catch (err) {
      // popup 차단·사용자 취소·네트워크 — 모두 사용자 입장에선 "다시 시도"가 답.
      console.error("[login] signInWithPopup", err);
      setError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 32,
            padding: "0 8px",
          }}
        >
          <div style={{ textAlign: "center" }}>
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
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "#7A7A7A",
                letterSpacing: "-0.2px",
                margin: 0,
              }}
            >
              서재를 저장하기 위해 로그인해요
            </p>
            <button
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: "100%",
                maxWidth: 280,
                background: busy ? "#0E3A2A" : "#00FF7A",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: busy ? "default" : "pointer",
                letterSpacing: "-0.2px",
                boxShadow: busy ? "none" : "0 6px 20px rgba(0,255,122,0.25)",
                transition: "background 120ms ease",
              }}
            >
              {busy ? "연결 중…" : "Google 로 시작하기"}
            </button>
            {error && (
              <p
                style={{
                  fontSize: 11,
                  color: "#E55A5A",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </PhoneFrame>
    </main>
  );
}
