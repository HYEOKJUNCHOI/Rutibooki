"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { books as mockBooks } from "@/data/books";
import { useBooksStore } from "@/store/booksStore";
import { useReadingStore } from "@/store/readingStore";
import { useBookCovers } from "@/hooks/useBookCovers";
import { formatDateShort, getDayLabel } from "@/utils/reading";
import PhoneFrame from "@/components/layout/PhoneFrame";
import LibraryCard from "@/components/library/LibraryCard";

// 새 홈 = 서재(Library). 책 선택 시 /book/[id] 로 진입.
// 정렬: lastOpenedAt 최신순 → 오늘 이어 읽을 책이 자연스럽게 첫 자리.

export default function LibraryHome() {
  const router = useRouter();
  const today = new Date();
  const dateStr = formatDateShort(today);

  // AuthProvider 가 로그인 직후 pull 로 스토어를 채운다. 여기선 rehydrate 불필요.
  const hydrated = true;

  const registered = useBooksStore((s) => s.registered);
  const statesByBook = useReadingStore((s) => s.statesByBook);

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

  const covers = useBookCovers(sortedBooks);

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 서재 제목 · 날짜 · 설정 */}
        <div
          style={{
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#E8E8E8",
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              서재
            </h1>
            <p
              style={{
                fontSize: 11,
                color: "#5A5A5A",
                margin: "4px 0 0",
                letterSpacing: 1,
              }}
            >
              <span style={{ color: "#00FF7A", fontWeight: 600 }}>
                {getDayLabel(today.getDay())}
              </span>
              <span style={{ margin: "0 8px", color: "#4A4A4A" }}>·</span>
              {dateStr}
            </p>
          </div>
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

        {/* 서재 그리드 — 3열. 빈 상태면 등록 유도. */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
          {hydrated && sortedBooks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#5A5A5A",
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              아직 서재가 비어 있어요.
              <br />첫 책을 등록해볼까요?
            </div>
          ) : (
            // 책장 느낌 — flex-wrap 으로 여러 줄, 자연스럽게 흩뿌려진 배치. 선반 구분선은 V2.
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                rowGap: 16,
              }}
            >
              {sortedBooks.map((book, idx) => (
                <LibraryCard
                  key={book.id}
                  book={book}
                  cover={covers[idx]}
                  onClick={() => router.push(`/book/${book.id}`)}
                />
              ))}
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
