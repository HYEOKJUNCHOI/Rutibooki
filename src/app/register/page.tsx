"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhoneFrame from "@/components/layout/PhoneFrame";
import ReviewForm from "@/components/register/ReviewForm";
import { useRegisterFlow } from "@/hooks/useRegisterFlow";

// /register 진입점. 헌법(MVP-CORE.md)에 따라 "사진(표지+목차) 업로드" 경로만 제공.
// 검색/바코드 경로는 목차 정확도·진입 장벽 문제로 제거됨.
// 사용자가 책을 손에 안 들고 있다면 ReviewForm 안의 "교보문고 미리보기에서 찾기" 링크를 쓰면 됨.

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = useRegisterFlow();
  // 홈에서 바코드 스캔 성공 시 ?isbn=XXX 쿼리로 진입 — 한 번만 자동 조회.
  const didLookupRef = useRef(false);
  useEffect(() => {
    const isbn = searchParams.get("isbn");
    if (!isbn || didLookupRef.current) return;
    didLookupRef.current = true;
    flow.lookupByIsbn(isbn);
  }, [searchParams, flow]);

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => router.back()}
            style={backBtnStyle}
            aria-label="뒤로"
          >
            ←
          </button>
          <h1 style={titleStyle}>책 등록</h1>
        </div>

        <div style={scrollStyle}>
          <ReviewForm flow={flow} />
        </div>
      </PhoneFrame>
    </main>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  background: "#111",
  color: "#E8E8E8",
  border: "1px solid #2A2A2A",
  borderRadius: "50%",
  fontSize: 16,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#E8E8E8",
  margin: 0,
  letterSpacing: "-0.3px",
};

const scrollStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  paddingBottom: 12,
};
