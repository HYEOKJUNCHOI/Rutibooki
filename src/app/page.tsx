"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooksStore } from "@/store/booksStore";
import { useReadingStore } from "@/store/readingStore";
import { useBookCovers } from "@/hooks/useBookCovers";
import { useNickname } from "@/hooks/useNickname";
import PhoneFrame from "@/components/layout/PhoneFrame";
import LibraryCard from "@/components/library/LibraryCard";
import BookActionSheet from "@/components/library/BookActionSheet";
import TocUploadModal from "@/components/library/TocUploadModal";
import BarcodeScanner from "@/components/register/BarcodeScanner";
import RegisterModePicker from "@/components/register/RegisterModePicker";
import { Book } from "@/types/book";
import { normalizeAuthor } from "@/utils/normalizeAuthor";
import { updateTocForExistingBook } from "@/lib/registerBookInBackground";

// 새 홈 = 서재(Library). 책 선택 시 /book/[id] 로 진입.
// 정렬: lastOpenedAt 최신순 → 오늘 이어 읽을 책이 자연스럽게 첫 자리.

// 한 줄 4권 고정 — 베스트셀러 진열대 느낌.
const BOOKS_PER_SHELF = 4;

export default function LibraryHome() {
  const router = useRouter();
  const nickname = useNickname();

  // AuthProvider 가 로그인 직후 pull 로 스토어를 채운다. pull 끝나기 전엔
  // "서재 비어있어요" 오판이 한 프레임 떠서 플래시 — 실제 hydrated 로 바꿈.
  const hydrated = useBooksStore((s) => s.hydrated);

  const registered = useBooksStore((s) => s.registered);
  const removeBook = useBooksStore((s) => s.removeBook);
  const updateBook = useBooksStore((s) => s.updateBook);
  const statesByBook = useReadingStore((s) => s.statesByBook);

  // FAB(+) → 2지선다 시트 (바코드/직접입력).
  const [pickerOpen, setPickerOpen] = useState(false);
  // 바코드 신규 등록 스캔 모드 — rescan 과 별개 상태로 두어 핸들러 분리.
  const [newScan, setNewScan] = useState(false);

  // 길게눌러 뜨는 액션 시트.
  const [sheetBook, setSheetBook] = useState<Book | null>(null);
  // 바코드 재스캔 모드 — 이 값이 set 되면 스캐너 오버레이 뜨고, 인식되면 해당 책 메타만 갱신.
  const [rescanBook, setRescanBook] = useState<Book | null>(null);
  const [rescanBusy, setRescanBusy] = useState(false);
  // 목차 업로드 모달 — 3장까지 선택받아 기존 책 parts 덮어쓰기.
  const [tocUploadBook, setTocUploadBook] = useState<Book | null>(null);
  const isRegistered = (id: string) => registered.some((b) => b.id === id);

  // 서재 = 등록된 책 그대로.
  const books = useMemo(() => registered, [registered]);

  // 최근 읽은 순 정렬 — 미열람은 뒤로.
  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      const la = statesByBook[a.id]?.lastOpenedAt ?? "";
      const lb = statesByBook[b.id]?.lastOpenedAt ?? "";
      return lb.localeCompare(la);
    });
  }, [books, statesByBook]);

  // 커버는 전체 기준으로 미리 계산 — 필터 전환 시 재요청 피함.
  const covers = useBookCovers(sortedBooks);
  // book.coverUrl(알라딘) 이 있으면 우선 사용. 없을 때만 네이버 API 캐시 폴백.
  const coverById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    sortedBooks.forEach((b, i) => map.set(b.id, b.coverUrl || covers[i]));
    return map;
  }, [sortedBooks, covers]);

  // 한 줄 4권씩 선반(shelf)으로 나눔.
  const shelves = useMemo(() => {
    const out: typeof sortedBooks[] = [];
    for (let i = 0; i < sortedBooks.length; i += BOOKS_PER_SHELF) {
      out.push(sortedBooks.slice(i, i + BOOKS_PER_SHELF));
    }
    return out;
  }, [sortedBooks]);

  const titleText = nickname ? `${nickname}의 서재` : "나의 서재";

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 헤더 — 서재 제목 · 설정. */}
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

        {/* 서재 — 선반(shelf) 스타일. 한 줄 4권, 선반 라인 1px 그림자. */}
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
                        onClick={() => {
                          console.log("[home] open book", {
                            id: book.id,
                            title: book.title,
                            href: `/book/${book.id}`,
                            encoded: `/book/${encodeURIComponent(book.id)}`,
                          });
                          router.push(`/book/${book.id}`);
                        }}
                        onLongPress={
                          isRegistered(book.id)
                            ? (b) => setSheetBook(b)
                            : undefined
                        }
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
            </div>
          )}
        </div>

        {/* FAB — 책 등록. 헌법상 강한 색은 액션 트리거에만. */}
        <button
          onClick={() => setPickerOpen(true)}
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

      <RegisterModePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPickBarcode={() => {
          setPickerOpen(false);
          setNewScan(true);
        }}
        onPickManual={() => {
          setPickerOpen(false);
          router.push("/register");
        }}
      />

      {newScan && (
        <BarcodeScanner
          onClose={() => setNewScan(false)}
          onDetect={(isbn13) => {
            setNewScan(false);
            // 등록 페이지로 ISBN 실어 보냄 → 페이지가 마운트 시 알라딘 조회 자동 실행.
            router.push(`/register?isbn=${encodeURIComponent(isbn13)}`);
          }}
        />
      )}

      <BookActionSheet
        book={sheetBook}
        onClose={() => setSheetBook(null)}
        onDelete={async (b) => {
          await removeBook(b.id);
        }}
        onRescanBarcode={(b) => {
          setSheetBook(null);
          setRescanBook(b);
        }}
        onUpdateTocOpen={(b) => {
          setSheetBook(null);
          setTocUploadBook(b);
        }}
      />

      {tocUploadBook && (
        <TocUploadModal
          book={tocUploadBook}
          onClose={() => setTocUploadBook(null)}
          onConfirm={async () => {
            // [2026-04-22] 사진 업로드 경로 폐기. ISBN 기반 교보 재시도만 남김.
            const target = tocUploadBook;
            setTocUploadBook(null);
            if (!target.isbn13) {
              alert("이 책은 ISBN 이 없어 목차를 다시 가져올 수 없습니다");
              return;
            }
            const ok = await updateTocForExistingBook(target.id, target.isbn13);
            if (!ok) alert("교보에 목차가 없어요 — 다른 책으로 시도하거나 나중에 다시 시도해주세요");
          }}
        />
      )}

      {rescanBook && (
        <BarcodeScanner
          onClose={() => {
            setRescanBook(null);
            setRescanBusy(false);
          }}
          onDetect={async (isbn13) => {
            if (rescanBusy) return;
            setRescanBusy(true);
            try {
              const r = await fetch(
                `/api/fetch-toc?isbn=${encodeURIComponent(isbn13)}`,
              );
              if (!r.ok) throw new Error("fetch_toc_failed");
              const data = await r.json();
              if (data.error === "no_match" || !data.title) {
                throw new Error("no_match");
              }
              // 목차(parts/totalPages) 는 건드리지 않음 — 메타만 덮어쓰기.
              const patch: Partial<Book> = { title: data.title };
              if (data.author) patch.author = normalizeAuthor(data.author);
              if (data.publisher) patch.publisher = data.publisher;
              if (data.cover) patch.coverUrl = data.cover;
              if (data.category) patch.category = data.category;
              await updateBook(rescanBook.id, patch);
            } catch (e) {
              console.warn("[rescan] fail", e);
              alert("바코드 메타 업데이트 실패 — 다시 시도해주세요");
            } finally {
              setRescanBook(null);
              setRescanBusy(false);
            }
          }}
        />
      )}
    </main>
  );
}
