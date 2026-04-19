"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import PhoneFrame from "@/components/layout/PhoneFrame";
import MonthlyHeatmap from "@/components/settings/MonthlyHeatmap";
import { useReadingStore } from "@/store/readingStore";
import { useBooksStore } from "@/store/booksStore";
import { books as mockBooks } from "@/data/books";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { resetOnboarded } from "@/lib/firestore/usersRepo";

// T-39, T-41: /settings 라우트.
// 내 독서 지도 + 책 관리 + 앱 정보. Streak/연속일 UI 금지.

const CONSTITUTION =
  "오늘도 책을 읽은 사람에 합류했다. 조금이라도 괜찮다. 누군가 책을 볼 때면 항상 켜져있고 싶은 앱. 조용한 도움을 주는 앱.";

const sectionTitleStyle: React.CSSProperties = {
  color: "#9A9A9A",
  fontSize: 11,
  letterSpacing: 1.2,
  marginBottom: 10,
  textTransform: "uppercase" as const,
};

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const registered = useBooksStore((s) => s.registered);
  const removeBook = useBooksStore((s) => s.removeBook);
  const resetBook = useReadingStore((s) => s.resetBook);

  // 진행 초기화는 돌이킬 수 없으므로 확인 한 번 받는다. alert 레벨 유지(모달까지는 오버엔지니어링).
  const handleReset = (bookId: string, title: string) => {
    if (confirm(`"${title}"의 진행·기록·인용을 모두 초기화할까요?\n되돌릴 수 없어요.`)) {
      resetBook(bookId);
    }
  };

  // 온보딩 다시보기 — Firestore 플래그 초기화 후 /onboarding 으로.
  const handleRewatchOnboarding = async () => {
    if (user) {
      try {
        await resetOnboarded(user.uid);
      } catch (err) {
        console.warn("[settings] resetOnboarded", err);
      }
    }
    router.push("/onboarding");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      console.error("[settings] signOut", err);
    }
  };

  // 사용자 등록 책 + 목업(V2 예시) 병합. MVP 는 사용자 등록을 우선 노출.
  const allBooks = [...registered, ...mockBooks];

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 상단 — 뒤로 + 제목 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {/* 뒤로가기 — 원형 버튼 통일(register/book detail 과 동일 스타일). */}
          <button
            onClick={() => router.back()}
            style={{
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
            }}
            aria-label="뒤로"
          >
            ←
          </button>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#E8E8E8",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            설정
          </h1>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            paddingBottom: 10,
          }}
        >
          {/* T-40: 내 독서 지도 */}
          <section>
            <div style={sectionTitleStyle}>내 독서 지도</div>
            <MonthlyHeatmap />
          </section>

          {/* 책 관리 */}
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={sectionTitleStyle}>책 관리</span>
              <button
                onClick={() => router.push("/register")}
                style={{
                  background: "#0E3A2A",
                  color: "#00FF7A",
                  border: "1px solid #2A4A3A",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                + 등록
              </button>
            </div>

            {allBooks.length === 0 ? (
              <p style={{ fontSize: 12, color: "#5A5A5A" }}>
                아직 등록된 책이 없어요.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {allBooks.map((b) => {
                  const isUserBook = registered.some((r) => r.id === b.id);
                  return (
                    <li
                      key={b.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "#0E0E0E",
                        border: "1px solid #1F1F1F",
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: "#E8E8E8",
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: "-0.3px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.title}
                        </div>
                        <div
                          style={{
                            color: "#5A5A5A",
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {b.author || "—"} · {b.parts.length}파트
                        </div>
                      </div>
                      <button
                        onClick={() => handleReset(b.id, b.title)}
                        style={{
                          background: "transparent",
                          color: "#7A7A4A",
                          border: "1px solid #2A2A1A",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 10,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                        aria-label={`${b.title} 진행 초기화`}
                      >
                        초기화
                      </button>
                      {isUserBook && (
                        <button
                          onClick={() => removeBook(b.id)}
                          style={{
                            background: "transparent",
                            color: "#7A3A3A",
                            border: "1px solid #3A1A1A",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 10,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 온보딩 다시보기 */}
          <section>
            <button
              onClick={handleRewatchOnboarding}
              style={{
                width: "100%",
                background: "transparent",
                color: "#9A9A9A",
                border: "1px solid #2A2A2A",
                borderRadius: 10,
                padding: "12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.2px",
              }}
            >
              온보딩 다시보기
            </button>
          </section>

          {/* 계정 — 로그아웃. 헌법상 강조 없음, 차분한 테두리 버튼. */}
          <section>
            <div style={sectionTitleStyle}>계정</div>
            {user && (
              <p
                style={{
                  fontSize: 11,
                  color: "#5A5A5A",
                  margin: "0 0 10px",
                }}
              >
                {user.email ?? user.displayName ?? user.uid}
              </p>
            )}
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                background: "transparent",
                color: "#9A9A9A",
                border: "1px solid #2A2A2A",
                borderRadius: 10,
                padding: "12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.2px",
              }}
            >
              로그아웃
            </button>
          </section>

          {/* 앱 정보 — 앱의 헌법 */}
          <section>
            <div style={sectionTitleStyle}>앱 정보</div>
            <p
              style={{
                fontSize: 12,
                color: "#7A7A7A",
                lineHeight: 1.7,
                letterSpacing: "-0.2px",
                margin: 0,
              }}
            >
              {CONSTITUTION}
            </p>
            <p
              style={{
                fontSize: 10,
                color: "#4A4A4A",
                marginTop: 12,
                letterSpacing: 0.3,
              }}
            >
              Rutibooki · v0.1
            </p>
          </section>
        </div>
      </PhoneFrame>
    </main>
  );
}
