"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { books } from "@/data/books";
import { useBookCovers } from "@/hooks/useBookCovers";
import { formatDateShort, getDayLabel } from "@/utils/reading";
import { useReadingStore } from "@/store/readingStore";
import PhoneFrame from "@/components/layout/PhoneFrame";
import BookCoverSwipe from "@/components/book/BookCoverSwipe";
import TodayCard from "@/components/book/TodayCard";
import RestNudge from "@/components/book/RestNudge";
import { getNudge } from "@/data/nudges";
import { ONBOARD_FLAG_KEY } from "@/constants/onboarding";

export default function Home() {
  const router = useRouter();
  const today = new Date();
  const todayIdx = today.getDay();
  const dateStr = formatDateShort(today);

  // MVP = 한 권 모드. selectedIdx는 고정 0. BookCoverSwipe는 books.length > 1일 때만 스와이프 활성.
  // books 배열은 Foundation 유지(V2 서재 대비), 홈에선 첫 권만 노출.
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showNudge, setShowNudge] = useState(false);

  // Zustand persist는 skipHydration — 클라이언트 마운트 후 수동 rehydrate 필요.
  useEffect(() => {
    useReadingStore.persist.rehydrate();
  }, []);

  // 온보딩 자동 노출은 일단 비활성화 — 홈이 바로 뜬다.
  // 다시 켜려면 아래 블록 복구 + ONBOARD_FLAG_KEY 체크 되돌리면 됨.
  // 온보딩 자체는 /onboarding 라우트와 Settings "온보딩 다시보기"로 여전히 접근 가능.
  useEffect(() => {
    if (books.length === 0) {
      router.replace("/register");
    }
  }, [router]);

  const covers = useBookCovers(books);
  const selectedBook = books[selectedIdx];

  const handleOpenBook = () => {
    // /read 라우트는 T-20에서 생성 예정. 현 단계에선 이동만 심어둠.
    router.push(`/read?bookId=${selectedBook.id}`);
  };

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 요일·날짜·쉬어가기 한 줄 */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#E8E8E8", letterSpacing: 1 }}>
            <span style={{ color: "#00FF7A", fontWeight: 600 }}>
              {getDayLabel(todayIdx)}
            </span>
            <span style={{ margin: "0 8px", color: "#4A4A4A" }}>·</span>
            {dateStr}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowNudge(true)}
              style={{
                background: "transparent",
                color: "#E8E8E8",
                border: "none",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              쉬어가기
            </button>
            {/* T-45: 설정 진입 — 회색 12px 톱니(유니코드 ⚙). next/link 대신 router.push 유지. */}
            <button
              onClick={() => router.push("/settings")}
              aria-label="설정"
              style={{
                background: "transparent",
                color: "#7A7A7A",
                border: "none",
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ⚙
            </button>
          </div>
        </div>

        {/* 책 표지 스와이프 — 한 권 모드에서는 스와이프 비활성. 카드 뒤집기(JourneyPath)는 유지. */}
        <BookCoverSwipe
          books={books}
          covers={covers}
          selectedIdx={selectedIdx}
          onSelect={setSelectedIdx}
        />

        {/* 오늘 카드 — 파트/섹션 라벨 + anchor 시간 문구 */}
        <TodayCard book={selectedBook} />

        {/* CTA — /read 로 진입 */}
        <button
          onClick={handleOpenBook}
          style={{
            width: "100%",
            background: "#00FF7A",
            color: "#000",
            border: "none",
            borderRadius: 14,
            padding: "18px",
            fontSize: 17,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.5px",
          }}
        >
          책 펼쳤어요 →
        </button>

        {/* 쉬어가기 오버레이 — 4차 회의에서 제거 명시 없음, 유지. nudge 소스는 data/nudges.ts */}
        {showNudge && (
          <RestNudge
            nudge={getNudge(selectedBook.id)}
            onClose={() => setShowNudge(false)}
          />
        )}
      </PhoneFrame>

      <p style={{ color: "#5A5A5A", fontSize: 12, marginTop: 20, letterSpacing: 1 }}>
        스플래시 없이 바로.{" "}
        <span style={{ color: "#00FF7A" }}>책 한 권, 버튼 하나</span>.
      </p>
    </main>
  );
}
