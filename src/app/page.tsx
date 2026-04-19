"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { books as mockBooks } from "@/data/books";
import { useBooksStore } from "@/store/booksStore";
import { useReadingStore } from "@/store/readingStore";
import { useBookCovers } from "@/hooks/useBookCovers";
import { useNickname } from "@/hooks/useNickname";
import { calcProgress } from "@/utils/reading";
import { pickBooksForToday } from "@/utils/interleave";
import PhoneFrame from "@/components/layout/PhoneFrame";
import LibraryCard from "@/components/library/LibraryCard";
import MonthlyHeatmap from "@/components/settings/MonthlyHeatmap";

// 새 홈 = 서재(Library). 책 선택 시 /book/[id] 로 진입.
// 정렬: lastOpenedAt 최신순 → 오늘 이어 읽을 책이 자연스럽게 첫 자리.

// 뱃지 정렬 필터 — 로컬 state. URL 로 올릴 정도로 중요하진 않음.
type Filter = "all" | "favorite" | "fresh" | "progress";

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "favorite", label: "⭐ 좋아요" },
  { key: "fresh", label: "📎 새책" },
  { key: "progress", label: "% 진행중" },
];

// 한 줄 4권 고정 — 베스트셀러 진열대 느낌.
const BOOKS_PER_SHELF = 4;

export default function LibraryHome() {
  const router = useRouter();
  const nickname = useNickname();

  // AuthProvider 가 로그인 직후 pull 로 스토어를 채운다. 여기선 rehydrate 불필요.
  const hydrated = true;

  const registered = useBooksStore((s) => s.registered);
  const statesByBook = useReadingStore((s) => s.statesByBook);
  const [filter, setFilter] = useState<Filter>("all");

  // 사용자 등록 책 + 목업 병합. 동일 id 충돌 시 등록본 우선.
  const books = useMemo(() => {
    const seen = new Set(registered.map((b) => b.id));
    return [...registered, ...mockBooks.filter((b) => !seen.has(b.id))];
  }, [registered]);

  // 최근 읽은 순 정렬 — 미열람은 뒤로.
  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      const la = statesByBook[a.id]?.lastOpenedAt ?? "";
      const lb = statesByBook[b.id]?.lastOpenedAt ?? "";
      return lb.localeCompare(la);
    });
  }, [books, statesByBook]);

  // (#9) 오늘 읽을 책 — 요일 매칭 + 인터리빙(가장 오래된 책 우선). 첫 책만 TodayPick 배너로.
  const todayPick = useMemo(() => {
    const dow = new Date().getDay();
    const candidates = pickBooksForToday(books, statesByBook, dow);
    return candidates[0];
  }, [books, statesByBook]);

  // 뱃지 기준 필터. LibraryCard 의 뱃지 판정과 동일 로직.
  const filteredBooks = useMemo(() => {
    if (filter === "all") return sortedBooks;
    return sortedBooks.filter((b) => {
      const st = statesByBook[b.id];
      const page = st?.currentPage ?? 0;
      const progress = calcProgress(page, b.totalPages);
      if (filter === "favorite") return st?.favorite === true;
      if (filter === "fresh") return page === 0;
      if (filter === "progress") return progress > 0 && progress < 100;
      return true;
    });
  }, [sortedBooks, statesByBook, filter]);

  // 커버는 전체 기준으로 미리 계산 — 필터 전환 시 재요청 피함.
  const covers = useBookCovers(sortedBooks);
  const coverById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    sortedBooks.forEach((b, i) => map.set(b.id, covers[i]));
    return map;
  }, [sortedBooks, covers]);

  // 한 줄 4권씩 선반(shelf)으로 나눔.
  const shelves = useMemo(() => {
    const out: typeof filteredBooks[] = [];
    for (let i = 0; i < filteredBooks.length; i += BOOKS_PER_SHELF) {
      out.push(filteredBooks.slice(i, i + BOOKS_PER_SHELF));
    }
    return out;
  }, [filteredBooks]);

  const titleText = nickname ? `${nickname}의 서재` : "나의 서재";

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 서재 제목 · 설정. 요일/날짜 라벨은 제거(잔디 왼쪽 아래로 이동). */}
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#E8E8E8",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            {titleText}
          </h1>
          <button
            onClick={() => router.push("/settings")}
            aria-label="설정"
            style={{
              background: "transparent",
              color: "#7A7A7A",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ⚙
          </button>
        </div>

        {/* 상단 잔디 띠 — 설정에 있던 MonthlyHeatmap 을 compact 모드로 재사용. */}
        <div style={{ marginBottom: 16 }}>
          <MonthlyHeatmap compact />
        </div>

        {/* (#9) 오늘 읽을 책 — 인터리빙/요일 매칭 결과 1권. 탭 시 해당 책 상세로. */}
        {todayPick && (
          <button
            onClick={() => router.push(`/book/${todayPick.id}`)}
            aria-label={`오늘은 ${todayPick.title} 어때요`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              background: "#0E0E0E",
              border: "1px solid #1F1F1F",
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 14,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#5A7A5A",
                letterSpacing: 1,
                background: "#0E2A1E",
                border: "1px solid #2A4A3A",
                padding: "3px 7px",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              오늘
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "#E8E8E8",
                  fontWeight: 600,
                  letterSpacing: "-0.3px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {todayPick.title}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#5A5A5A",
                  letterSpacing: "-0.2px",
                  marginTop: 2,
                }}
              >
                이 책 펼쳐볼까요?
              </div>
            </div>
            <span style={{ color: "#5A5A5A", fontSize: 14 }}>›</span>
          </button>
        )}

        {/* 뱃지 정렬 탭 */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 18,
            overflowX: "auto",
          }}
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                style={{
                  flexShrink: 0,
                  background: active ? "#0E3A2A" : "transparent",
                  color: active ? "#00FF7A" : "#7A7A7A",
                  border: `1px solid ${active ? "#2A4A3A" : "#1F1F1F"}`,
                  borderRadius: 999,
                  padding: "5px 11px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  letterSpacing: "-0.2px",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 서재 — 선반(shelf) 스타일. 한 줄 4권, 선반 라인 1px 그림자. */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
          {hydrated && filteredBooks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#5A5A5A",
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              {filter === "all"
                ? "아직 서재가 비어 있어요."
                : "조건에 맞는 책이 없어요."}
              {filter === "all" && (
                <>
                  <br />첫 책을 등록해볼까요?
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                marginTop: 8,
                marginBottom: 32,
              }}
            >
              {shelves.map((shelf, shelfIdx) => (
                <div key={shelfIdx} style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 14,
                      justifyItems: "center",
                      alignItems: "end",
                      paddingBottom: 6,
                    }}
                  >
                    {shelf.map((book) => (
                      <LibraryCard
                        key={book.id}
                        book={book}
                        cover={coverById.get(book.id)}
                        onClick={() => router.push(`/book/${book.id}`)}
                      />
                    ))}
                  </div>
                  {/* 선반 라인 — 나무 선반 그림자 느낌. 1px + 아래로 번지는 미세 그라디언트. */}
                  <div
                    style={{
                      height: 1,
                      background: "#2A2A2A",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.6)",
                    }}
                  />
                </div>
              ))}

              {/* (#5) 무한피드 바닥 힌트 — 더 이상 책이 없을 때 "새 책 등록" 유도.
                  Intersection Observer 없이 하단 도달 시 자연스럽게 노출. */}
              {filter === "all" && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 16px 8px",
                    color: "#5A5A5A",
                    fontSize: 11,
                    lineHeight: 1.6,
                    letterSpacing: "-0.2px",
                  }}
                >
                  더 많은 책을 찾고 싶다면…
                  <br />
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    style={{
                      marginTop: 8,
                      background: "transparent",
                      color: "#8A8A8A",
                      border: "1px solid #2A2A2A",
                      borderRadius: 999,
                      padding: "6px 14px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "-0.2px",
                    }}
                  >
                    + 새 책 등록하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAB — 책 등록. 헌법상 강한 색은 액션 트리거에만. */}
        <button
          onClick={() => router.push("/register")}
          aria-label="책 등록"
          style={{
            position: "absolute",
            right: 20,
            bottom: 24,
            width: 52,
            height: 52,
            borderRadius: 26,
            background: "#00FF7A",
            color: "#000",
            border: "none",
            fontSize: 24,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 6px 20px rgba(0,255,122,0.35)",
          }}
        >
          +
        </button>
      </PhoneFrame>
    </main>
  );
}
