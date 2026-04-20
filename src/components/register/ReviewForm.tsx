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
  kyoboHelperIconStyle,
  kyoboHelperStyle,
  kyoboHelperSubStyle,
  kyoboHelperTextWrapStyle,
  kyoboHelperTitleStyle,
  saveBtnStyle,
  scanBtnStyle,
  sectionTitleStyle,
  slotGridStyle,
  textInputStyle,
} from "./ReviewForm.style";

// 사진(표지+목차) 기반 등록 검수 화면. 사용자 업로드 이미지에서 Gemini 로 메타·파트 추출.

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
    extractToc,
    extractCoverFromImage,
    overrideParts,
    overrideTotalPages,
  } = flow;

  const addBook = useBooksStore((s) => s.addBook);
  const [saving, setSaving] = useState(false);

  // 추출 진행 오버레이 — 표지(표지/제목/작가) + 목차 4 단계.
  // Gemini 응답이 한 번에 오므로 완료 연출만 300ms 씩 스테거링해 "체크리스트 찍히는 느낌" 을 냄.
  type StepState = "pending" | "running" | "done" | "error";
  interface OverlayStep {
    key: string;
    label: string;
    state: StepState;
  }
  const [overlay, setOverlay] = useState<{
    open: boolean;
    steps: OverlayStep[];
  }>({ open: false, steps: [] });

  // 표지 추출 → 시작 시 표지/제목/작가 3 단계 러닝, 종료 후 순차 done.
  const prevCoverExtractingRef = useRef(false);
  useEffect(() => {
    const was = prevCoverExtractingRef.current;
    const now = state.coverExtracting;
    prevCoverExtractingRef.current = now;

    if (!was && now) {
      setOverlay({
        open: true,
        steps: [
          { key: "cover", label: "책표지 불러오기", state: "running" },
          { key: "title", label: "제목 불러오기", state: "pending" },
          { key: "author", label: "작가 불러오기", state: "pending" },
        ],
      });
      return;
    }

    if (was && !now) {
      // 실패면 error 마크만 찍고 잠시 뒤 닫기.
      if (state.coverExtractError) {
        setOverlay((o) => ({
          ...o,
          steps: o.steps.map((s) =>
            s.state === "running" ? { ...s, state: "error" } : s,
          ),
        }));
        const t = setTimeout(
          () => setOverlay((o) => ({ ...o, open: false })),
          1200,
        );
        return () => clearTimeout(t);
      }

      // 성공 → 300ms 간격으로 순차 done.
      const keys = ["cover", "title", "author"];
      const timers: number[] = [];
      keys.forEach((k, i) => {
        const t = window.setTimeout(() => {
          setOverlay((o) => ({
            ...o,
            steps: o.steps.map((s) =>
              s.key === k ? { ...s, state: "done" } : s,
            ),
          }));
        }, i * 300);
        timers.push(t);
      });
      const closeT = window.setTimeout(
        () => setOverlay((o) => ({ ...o, open: false })),
        300 * keys.length + 500,
      );
      timers.push(closeT);
      return () => timers.forEach(clearTimeout);
    }
  }, [state.coverExtracting, state.coverExtractError]);

  // 목차 추출 오버레이 — 단일 단계.
  const prevExtractingRef = useRef(false);
  useEffect(() => {
    const was = prevExtractingRef.current;
    const now = state.extracting;
    prevExtractingRef.current = now;

    if (!was && now) {
      setOverlay({
        open: true,
        steps: [
          { key: "toc", label: "목차 불러오기", state: "running" },
        ],
      });
      return;
    }

    if (was && !now) {
      if (state.tocError) {
        setOverlay((o) => ({
          ...o,
          steps: o.steps.map((s) => ({ ...s, state: "error" as StepState })),
        }));
        const t = setTimeout(
          () => setOverlay((o) => ({ ...o, open: false })),
          1200,
        );
        return () => clearTimeout(t);
      }
      setOverlay((o) => ({
        ...o,
        steps: o.steps.map((s) => ({ ...s, state: "done" as StepState })),
      }));
      const t = setTimeout(
        () => setOverlay((o) => ({ ...o, open: false })),
        700,
      );
      return () => clearTimeout(t);
    }
  }, [state.extracting, state.tocError]);

  // 표지 촬영 → Gemini Vision 숨은 인풋.
  const coverScanInputRef = useRef<HTMLInputElement | null>(null);
  const handleScanCoverClick = () => coverScanInputRef.current?.click();
  const handleScanCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) extractCoverFromImage(f);
    e.target.value = "";
  };

  // 저장 조건: 표지(사용자/네이버/알라딘 어느 것이든) + 제목 + 목차 결과(파트 존재).
  // 사진 모드에선 tocResult 없이도 extractToc 가 handleSave 안에서 자동 트리거되므로
  // tocSlots 가 채워져 있으면 활성화. 검색/바코드 모드에선 tocResult 가 이미 있어야 함.
  const canSave = useMemo(() => {
    const hasCover = state.cover !== null || state.naverCoverUrl !== null;
    const hasTitle = state.title.trim().length > 0;
    const hasTocImage = TOC_SLOT_KEYS.some((k) => state.tocSlots[k] !== null);
    const hasTocResult = (state.tocResult?.parts.length ?? 0) > 0;
    return (
      hasCover &&
      hasTitle &&
      (hasTocImage || hasTocResult) &&
      !state.extracting &&
      !state.coverExtracting &&
      !saving
    );
  }, [state, saving]);

  const canExtract = useMemo(() => {
    return (
      TOC_SLOT_KEYS.some((k) => state.tocSlots[k] !== null) &&
      !state.extracting
    );
  }, [state.tocSlots, state.extracting]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let parts = state.tocResult?.parts ?? [];
      let totalPages = state.tocResult?.totalPages ?? 0;

      // 사진 모드에서 아직 추출 전이면 자동으로 돌린다.
      if (parts.length === 0) {
        const result = await extractToc();
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
      <ExtractProgressOverlay open={overlay.open} steps={overlay.steps} />

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
        <input
          ref={coverScanInputRef}
          type="file"
          accept="image/*"
          onChange={handleScanCoverPick}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={handleScanCoverClick}
          disabled={state.coverExtracting}
          style={scanBtnStyle(state.coverExtracting)}
        >
          {state.coverExtracting ? "표지 인식 중…" : "📸 표지 촬영으로 찾기"}
        </button>
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
                allowScan
                scanShotIndex={i + 1}
                scanShotTotal={TOC_SLOT_KEYS.length}
              />
            );
          })}
        </div>

        {/* 책이 수중에 없을 때 — 교보문고 미리보기로 열어 사용자가 직접 캡처해 업로드.
            앱은 링크만 제공. 크롤링·자동화 없음 (저작권/ToS 이슈 회피). */}
        <a
          href={buildKyoboSearchUrl(state.title, state.author)}
          target="_blank"
          rel="noopener noreferrer"
          style={kyoboHelperStyle}
        >
          <span style={kyoboHelperIconStyle}>📖</span>
          <span style={kyoboHelperTextWrapStyle}>
            <span style={kyoboHelperTitleStyle}>
              책이 손에 없어요?
            </span>
            <span style={kyoboHelperSubStyle}>
              교보문고 미리보기에서 목차 캡처해 올리기 →
            </span>
          </span>
        </a>

        {canExtract && (
          <button
            onClick={extractToc}
            disabled={!canExtract}
            style={extractBtnStyle(canExtract)}
          >
            {state.extracting ? "목차 추출 중…" : "목차에서 파트 추출"}
          </button>
        )}

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

// 교보문고 검색 URL. 제목·저자가 있으면 쿼리에 꽂아주고, 아니면 빈 검색 홈.
// 앱은 링크만 여는 역할 — 캡처·업로드는 전적으로 사용자 몫(저작권/ToS 회피).
function buildKyoboSearchUrl(title: string, author: string): string {
  const q = [title.trim(), author.trim()].filter(Boolean).join(" ");
  if (!q) return "https://search.kyobobook.co.kr/search";
  return `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(q)}`;
}

