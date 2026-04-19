"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import PhoneFrame from "@/components/layout/PhoneFrame";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserProfile,
  updateLongPressMs,
  updateNickname,
} from "@/lib/firestore/usersRepo";
import { LONG_PRESS_MS, LONG_PRESS_PRESETS_MS } from "@/constants/reading";
import { books as mockBooks } from "@/data/books";
import { useBooksStore } from "@/store/booksStore";
import { useReadingStore } from "@/store/readingStore";

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

const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // 닉네임 로컬 입력 상태. Firestore 프로필에서 1회 로드해 채운다.
  const [nickname, setNickname] = useState("");
  const [loadedNickname, setLoadedNickname] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // (#17) 길게 누르기 시간 — 프로필에서 로드, 프리셋 버튼으로 저장.
  const [longPressMs, setLongPressMs] = useState<number>(LONG_PRESS_MS);
  const [lpSaving, setLpSaving] = useState(false);

  // (#9) 책별 요일 토글 — Zustand 에서 바로 읽고 쓴다.
  const registered = useBooksStore((s) => s.registered);
  const statesByBook = useReadingStore((s) => s.statesByBook);
  const updateWeekdays = useReadingStore((s) => s.updateWeekdays);

  // 설정에 노출할 책 목록 — 사용자가 등록한 책 우선, 없으면 목업 병합(미 로그인 상태 대비).
  const booksForSettings = registered.length > 0
    ? registered
    : mockBooks;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getUserProfile(user.uid)
      .then((p) => {
        if (!alive) return;
        const nn = p?.nickname ?? "";
        setNickname(nn);
        setLoadedNickname(nn);
        const lp = p?.longPressMs;
        if (typeof lp === "number" && lp > 0) setLongPressMs(lp);
      })
      .catch((err) => console.warn("[settings] getUserProfile", err));
    return () => {
      alive = false;
    };
  }, [user]);

  const handleSelectLongPress = async (ms: number) => {
    if (!user) return;
    setLongPressMs(ms);
    setLpSaving(true);
    try {
      await updateLongPressMs(user.uid, ms);
    } catch (err) {
      console.error("[settings] updateLongPressMs", err);
    } finally {
      setLpSaving(false);
    }
  };

  // (#9) 책/요일 토글. 빈 배열도 허용(= 매일).
  const handleToggleWeekday = (bookId: string, dow: number) => {
    const current = statesByBook[bookId]?.weekdays ?? [];
    const next = current.includes(dow)
      ? current.filter((d) => d !== dow)
      : [...current, dow].sort((a, b) => a - b);
    updateWeekdays(bookId, next);
  };

  const handleSaveNickname = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateNickname(user.uid, nickname);
      setLoadedNickname(nickname.trim());
      setSaveMsg("저장됐어요");
    } catch (err) {
      console.error("[settings] updateNickname", err);
      setSaveMsg("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      console.error("[settings] signOut", err);
    }
  };

  const nicknameDirty = nickname.trim() !== loadedNickname.trim();

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
          {/* 닉네임 — "{닉네임}의 서재" 로 표시. 빈값이면 "나의 서재" fallback. */}
          <section>
            <div style={sectionTitleStyle}>닉네임</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="나"
                maxLength={16}
                style={{
                  flex: 1,
                  background: "#0E0E0E",
                  color: "#E8E8E8",
                  border: "1px solid #1F1F1F",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  letterSpacing: "-0.3px",
                }}
                aria-label="닉네임"
              />
              <button
                onClick={handleSaveNickname}
                disabled={saving || !nicknameDirty}
                style={{
                  background: nicknameDirty ? "#0E3A2A" : "transparent",
                  color: nicknameDirty ? "#00FF7A" : "#5A5A5A",
                  border: `1px solid ${nicknameDirty ? "#2A4A3A" : "#2A2A2A"}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  cursor: nicknameDirty && !saving ? "pointer" : "default",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                {saving ? "저장 중" : "저장"}
              </button>
            </div>
            <p
              style={{
                fontSize: 10,
                color: "#5A5A5A",
                margin: "6px 0 0",
                letterSpacing: "-0.2px",
              }}
            >
              {saveMsg ?? "비워두면 \"나의 서재\"로 표시돼요"}
            </p>
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

          {/* (#17) 길게 누르기 시간 — 프리셋 4개. 현재 값은 초록 테두리. */}
          <section>
            <div style={sectionTitleStyle}>길게 누르기 시간</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LONG_PRESS_PRESETS_MS.map((ms) => {
                const active = ms === longPressMs;
                return (
                  <button
                    key={ms}
                    onClick={() => handleSelectLongPress(ms)}
                    disabled={lpSaving}
                    style={{
                      flex: 1,
                      minWidth: 60,
                      background: active ? "#0E3A2A" : "transparent",
                      color: active ? "#00FF7A" : "#8A8A8A",
                      border: `1px solid ${active ? "#2A4A3A" : "#2A2A2A"}`,
                      borderRadius: 10,
                      padding: "10px 8px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: lpSaving ? "default" : "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {(ms / 1000).toFixed(1)}s
                  </button>
                );
              })}
            </div>
            <p
              style={{
                fontSize: 10,
                color: "#5A5A5A",
                margin: "6px 0 0",
                letterSpacing: "-0.2px",
              }}
            >
              읽기 종료·그만 버튼을 확정하는 시간이에요
            </p>
          </section>

          {/* (#9) 책 읽을 요일 — 책마다 요일 토글. 아무것도 고르지 않으면 "매일". */}
          {booksForSettings.length > 0 && (
            <section>
              <div style={sectionTitleStyle}>책 읽을 요일</div>
              <p
                style={{
                  fontSize: 10,
                  color: "#5A5A5A",
                  margin: "0 0 10px",
                  letterSpacing: "-0.2px",
                }}
              >
                요일을 고르지 않으면 매일로 설정돼요
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {booksForSettings.map((book) => {
                  const wd = statesByBook[book.id]?.weekdays ?? [];
                  const isDaily = wd.length === 0;
                  return (
                    <div
                      key={book.id}
                      style={{
                        background: "#0E0E0E",
                        border: "1px solid #1F1F1F",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#E8E8E8",
                            fontWeight: 600,
                            letterSpacing: "-0.3px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {book.title}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: isDaily ? "#5A7A5A" : "#5A5A5A",
                            letterSpacing: "-0.2px",
                            flexShrink: 0,
                          }}
                        >
                          {isDaily ? "매일" : `${wd.length}일`}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {DOW_LABELS.map((label, dow) => {
                          const on = wd.includes(dow);
                          return (
                            <button
                              key={dow}
                              onClick={() => handleToggleWeekday(book.id, dow)}
                              style={{
                                flex: 1,
                                background: on ? "#0E3A2A" : "transparent",
                                color: on ? "#00FF7A" : "#5A5A5A",
                                border: `1px solid ${on ? "#2A4A3A" : "#2A2A2A"}`,
                                borderRadius: 6,
                                padding: "6px 0",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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
