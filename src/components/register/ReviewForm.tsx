"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterSlot from "./RegisterSlot";
import {
  TOC_SLOT_KEYS,
  TocSlotKey,
  useRegisterFlow,
} from "@/hooks/useRegisterFlow";
import { useBooksStore } from "@/store/booksStore";
import { startBackgroundRegistration } from "@/lib/registerBookInBackground";
import { Book } from "@/types/book";
import {
  coverHintStyle,
  errorMsgStyle,
  saveBtnStyle,
  sectionTitleStyle,
  slotGridStyle,
  textInputStyle,
} from "./ReviewForm.style";

// 등록 검수 화면 — 백그라운드 등록 방식.
// 흐름: 사용자가 표지(필수)+목차(선택) 사진 고르고 "등록" 한 번 탭 →
// shell Book 즉시 저장 + 서재 복귀. OCR/알라딘/목차 추출은 뒤에서 돈다.

type Flow = ReturnType<typeof useRegisterFlow>;

interface Props {
  flow: Flow;
}

export default function ReviewForm({ flow }: Props) {
  const router = useRouter();
  const {
    state,
    setCover,
    clearCover,
    setTocSlot,
    clearTocSlot,
    setTitle,
    setAuthor,
  } = flow;

  const addBook = useBooksStore((s) => s.addBook);
  const [registering, setRegistering] = useState(false);

  // "등록" 활성화 조건 — 표지 1장이면 충분. 나머지는 전부 백그라운드가 메움.
  const canRegister = useMemo(() => {
    return state.cover !== null && !registering;
  }, [state.cover, registering]);

  const handleRegister = async () => {
    if (!canRegister) return;
    const coverFile = state.cover?.file;
    if (!coverFile) return;

    setRegistering(true);
    try {
      const id = `book-${Date.now()}`;
      // shell — totalPages/parts 는 백그라운드가 채울 때까지 비어있음.
      // title 수동 입력이 없으면 "분석 중…" 으로 표시하다 OCR 끝나면 덮어짐.
      // Firestore 는 undefined 값을 거부 — 없는 필드는 객체에서 아예 뺀다.
      const shell: Book = {
        id,
        title: state.title.trim() || "분석 중…",
        author: state.author.trim(),
        searchQuery: `${state.title} ${state.author}`.trim(),
        totalPages: 0,
        parts: [],
        registeredAt: new Date().toISOString(),
        status: "extracting",
      };
      if (state.naverCoverUrl) shell.coverUrl = state.naverCoverUrl;
      if (state.genre.trim()) shell.genre = state.genre.trim();
      if (state.publisher.trim()) shell.publisher = state.publisher.trim();

      await addBook(shell);

      // TOC 슬롯에 사진이 있으면 같이 백그라운드로 넘겨준다(알라딘 실패 시 폴백용).
      const tocFiles: File[] = [];
      for (const k of TOC_SLOT_KEYS) {
        const s = state.tocSlots[k];
        if (s) tocFiles.push(s.file);
      }

      startBackgroundRegistration({
        shellId: id,
        coverFile,
        tocFiles,
      });

      router.replace("/");
    } finally {
      // router.replace 가 즉시 언마운트시키지만 혹시 모를 실패 대비.
      setRegistering(false);
    }
  };

  return (
    <>
      <section>
        <div style={sectionTitleStyle}>표지</div>
        <div style={{ width: "50%" }}>
          <RegisterSlot
            label="표지"
            required
            previewUrl={
              state.cover?.previewUrl ?? state.naverCoverUrl ?? null
            }
            status={state.coverStatus}
            onPick={setCover}
            onClear={state.cover ? clearCover : undefined}
          />
        </div>
        {state.naverCoverUrl && !state.cover && (
          <p style={coverHintStyle}>
            검색 결과로 자동 표시 — 다른 표지를 쓰려면 탭해서 교체하세요.
          </p>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          style={textInputStyle}
          placeholder="책 제목"
          value={state.title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          style={textInputStyle}
          placeholder="저자"
          value={state.author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </section>

      {/* 목차 사진 — 알라딘에 목차가 없는 책 대비 폴백용. */}
      <section>
        <div style={sectionTitleStyle}>
          목차 사진
        </div>
        <div style={slotGridStyle}>
          {TOC_SLOT_KEYS.map((k, i) => {
            const slot = state.tocSlots[k];
            return (
              <RegisterSlot
                key={k}
                label={`목차 ${i + 1}`}
                required={false}
                previewUrl={slot?.previewUrl ?? null}
                status={slot?.status ?? "idle"}
                onPick={(file) => setTocSlot(k as TocSlotKey, file)}
                onClear={
                  slot ? () => clearTocSlot(k as TocSlotKey) : undefined
                }
              />
            );
          })}
        </div>

        {state.tocError && (
          <p style={errorMsgStyle}>
            추출 실패 — 사진을 다시 확인한 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>

      {/* 등록 CTA — 탭 즉시 서재 복귀. 분석은 뒤에서 돈다. */}
      <button
        onClick={handleRegister}
        disabled={!canRegister}
        style={saveBtnStyle(canRegister)}
      >
        {registering ? "등록 중…" : "등록"}
      </button>
    </>
  );
}
