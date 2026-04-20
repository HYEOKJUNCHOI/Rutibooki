"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterSlot from "./RegisterSlot";
import PartsEditor from "./PartsEditor";
import ExtractProgressOverlay from "./ExtractProgressOverlay";
import {
  TOC_SLOT_KEYS,
  TocSlotKey,
  useRegisterFlow,
} from "@/hooks/useRegisterFlow";
import { useBooksStore } from "@/store/booksStore";
import { Book } from "@/types/book";
import {
  coverHintStyle,
  errorMsgStyle,
  extractBtnStyle,
  saveBtnStyle,
  sectionTitleStyle,
  slotGridStyle,
  textInputStyle,
} from "./ReviewForm.style";

// 사진(표지+목차) 기반 등록 검수 화면. 사용자 업로드 이미지에서 Gemini 로 메타·파트 추출.
// 흐름: 표지·목차 사진을 다 넣고 "불러오기" 1번 탭 → 제목/저자/목차 동시 추출(체크리스트 4단계).

type Flow = ReturnType<typeof useRegisterFlow>;

interface Props {
  flow: Flow;
}

type StepState = "pending" | "running" | "done" | "error";
interface OverlayStep {
  key: string;
  label: string;
  state: StepState;
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
    extractToc,
    extractCoverFromImage,
    overrideParts,
    overrideTotalPages,
  } = flow;

  const addBook = useBooksStore((s) => s.addBook);
  const [saving, setSaving] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // 저장 흐름이 내부적으로 extractToc 를 트리거할 때는 오버레이를 숨김 — 통일된 "불러오기" UX 유지.
  const suppressOverlayRef = useRef(false);

  // 오버레이 단계 — flow 상태를 그대로 계산해 화면에 반영.
  // Gemini 표지 1회 호출이 제목·저자·장르를 같이 돌려주므로 cover/title/author 는 동일 페이즈를 공유.
  const steps: OverlayStep[] = useMemo(() => {
    const coverPhase: StepState = state.coverExtractError
      ? "error"
      : state.coverExtracting
        ? "running"
        : state.cover && state.title.trim().length > 0
          ? "done"
          : "pending";
    const tocPhase: StepState = state.tocError
      ? "error"
      : state.extracting
        ? "running"
        : (state.tocResult?.parts.length ?? 0) > 0
          ? "done"
          : "pending";
    return [
      { key: "cover", label: "책표지 불러오기", state: coverPhase },
      { key: "title", label: "제목 불러오기", state: coverPhase },
      { key: "author", label: "저자 불러오기", state: coverPhase },
      { key: "toc", label: "목차 불러오기", state: tocPhase },
    ];
  }, [
    state.coverExtracting,
    state.coverExtractError,
    state.cover,
    state.title,
    state.extracting,
    state.tocError,
    state.tocResult,
  ]);

  // 모든 단계가 done 또는 마지막 한 단계라도 error 로 끝났을 때 오버레이를 닫아준다.
  // 끝난 뒤 잠시(700ms) 체크 표시를 보여주고 자연스럽게 페이드아웃.
  useEffect(() => {
    if (!overlayOpen) return;
    const running = steps.some((s) => s.state === "running");
    if (running) return;
    const hasError = steps.some((s) => s.state === "error");
    const t = setTimeout(() => setOverlayOpen(false), hasError ? 1400 : 700);
    return () => clearTimeout(t);
  }, [steps, overlayOpen]);

  // 저장 조건: 표지(사용자/네이버/알라딘 어느 것이든) + 제목 + 목차 결과(파트 존재).
  // 검색·바코드 경로에서는 사진 없이도 통과. 사진 경로에서는 "불러오기" 를 먼저 눌러야 저장 활성화.
  const canSave = useMemo(() => {
    const hasCover = state.cover !== null || state.naverCoverUrl !== null;
    const hasTitle = state.title.trim().length > 0;
    const hasTocResult = (state.tocResult?.parts.length ?? 0) > 0;
    return (
      hasCover &&
      hasTitle &&
      hasTocResult &&
      !state.extracting &&
      !state.coverExtracting &&
      !saving
    );
  }, [state, saving]);

  // "불러오기" 활성화 조건 — 표지 + 목차 슬롯 1장 이상.
  const canExtractAll = useMemo(() => {
    const hasCoverFile = state.cover !== null;
    const hasTocImage = TOC_SLOT_KEYS.some((k) => state.tocSlots[k] !== null);
    return (
      hasCoverFile &&
      hasTocImage &&
      !state.extracting &&
      !state.coverExtracting
    );
  }, [state.cover, state.tocSlots, state.extracting, state.coverExtracting]);

  const handleExtractAll = async () => {
    if (!canExtractAll) return;
    const coverFile = state.cover?.file;
    if (!coverFile) return;
    setOverlayOpen(true);
    // 표지 → 목차 직렬. 병렬로 2건 동시 호출 시 Gemini rate limit(429) 에 걸리거나
    // 알라딘 보강 결과(totalPages) 가 목차 후처리에 간당간당하게 못 들어옴.
    // 표지 먼저 끝내면 aladinMatch 세팅 → 목차 단계에서 바로 활용 가능.
    await extractCoverFromImage(coverFile);
    await extractToc();
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let parts = state.tocResult?.parts ?? [];
      let totalPages = state.tocResult?.totalPages ?? 0;

      // 혹시 "불러오기" 없이 저장을 누른 경우 — 목차만 조용히 돌린다(체크리스트 스킵).
      if (parts.length === 0) {
        suppressOverlayRef.current = true;
        const result = await extractToc();
        suppressOverlayRef.current = false;
        if (!result || result.parts.length === 0) return;
        parts = result.parts;
        totalPages = result.totalPages ?? parts.at(-1)?.endPage ?? 0;
      } else if (totalPages <= 0) {
        totalPages = parts.at(-1)?.endPage ?? 0;
      }
      if (totalPages <= 0 || parts.length === 0) return;

      const id = slugify(state.title) || `book-${Date.now()}`;
      const book: Book = {
        id,
        title: state.title.trim(),
        author: state.author.trim(),
        searchQuery: `${state.title} ${state.author}`.trim(),
        coverUrl: state.naverCoverUrl ?? undefined,
        totalPages,
        parts,
        registeredAt: new Date().toISOString(),
        genre: state.genre.trim() || undefined,
        publisher: state.publisher.trim() || undefined,
      };
      addBook(book);
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  const hasToc = (state.tocResult?.parts.length ?? 0) > 0;

  return (
    <>
      <ExtractProgressOverlay open={overlayOpen} steps={steps} />

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
            // 이제 표지 픽 = 저장만. 추출은 아래 "불러오기" 가 일괄 수행.
            onPick={setCover}
            onClear={state.cover ? clearCover : undefined}
          />
        </div>
        {state.naverCoverUrl && !state.cover && (
          <p style={coverHintStyle}>
            검색 결과로 자동 표시 — 다른 표지를 쓰려면 탭해서 교체하세요.
          </p>
        )}
        {state.coverExtractError && (
          <p style={errorMsgStyle}>표지 인식 실패 — 다시 시도해 주세요.</p>
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
          placeholder="저자 (선택)"
          value={state.author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </section>

      {/* 사진 스캔용 슬롯 — 검색/바코드 경로에서도 "목차 확인" 을 위해 노출.
          이미 tocResult 가 있으면 슬롯은 추가 보정용. */}
      <section>
        <div style={sectionTitleStyle}>
          {hasToc ? "목차 사진 (선택 · 보정용)" : "목차 사진"}
        </div>
        <div style={slotGridStyle}>
          {TOC_SLOT_KEYS.map((k, i) => {
            const slot = state.tocSlots[k];
            return (
              <RegisterSlot
                key={k}
                label={`목차 ${i + 1}`}
                required={!hasToc && i === 0}
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

        {/* 통합 "불러오기" — 표지+목차 동시 추출. 체크리스트 오버레이가 진행 상황을 알려줌. */}
        <button
          onClick={handleExtractAll}
          disabled={!canExtractAll}
          style={extractBtnStyle(canExtractAll)}
        >
          {state.extracting || state.coverExtracting
            ? "불러오는 중…"
            : hasToc
              ? "다시 불러오기"
              : "불러오기"}
        </button>

        {state.tocError && (
          <p style={errorMsgStyle}>
            추출 실패 — 사진을 다시 확인한 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>

      {hasToc && (
        <section>
          <div style={sectionTitleStyle}>파트 구조 확인</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#7A7A7A", marginBottom: 4 }}>
              총 페이지
            </div>
            <input
              type="number"
              style={textInputStyle}
              value={state.tocResult?.totalPages ?? ""}
              onChange={(e) =>
                overrideTotalPages(Number(e.target.value) || 0)
              }
              placeholder="예: 312"
            />
          </div>
          <PartsEditor
            parts={state.tocResult?.parts ?? []}
            onChange={overrideParts}
            warning={state.tocResult?.warning}
          />
        </section>
      )}

      {/* 저장 CTA — PhoneFrame 스크롤 하단에 붙도록 부모가 묶어둠. */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        style={saveBtnStyle(canSave)}
      >
        {saving
          ? "저장 중…"
          : state.extracting
            ? "목차 분석 중…"
            : "등록 완료"}
      </button>
    </>
  );
}

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
}
