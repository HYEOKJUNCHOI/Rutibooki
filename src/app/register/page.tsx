"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import PhoneFrame from "@/components/layout/PhoneFrame";
import RegisterSlot from "@/components/register/RegisterSlot";
import PartsEditor from "@/components/register/PartsEditor";
import {
  TOC_SLOT_KEYS,
  TocSlotKey,
  useRegisterFlow,
} from "@/hooks/useRegisterFlow";
import { useBooksStore } from "@/store/booksStore";
import { Book } from "@/types/book";

// T-34: /register 라우트. 슬롯 그리드 + 제목/저자 + 목차 추출 + 파트 편집.
// 지시서의 "검수 화면"(/register/review)은 같은 페이지 안에 pull-down 으로 통합.

const slotGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const sectionTitleStyle: React.CSSProperties = {
  color: "#9A9A9A",
  fontSize: 12,
  letterSpacing: 1,
  marginBottom: 10,
};

const textInputStyle: React.CSSProperties = {
  background: "#0E0E0E",
  border: "1px solid #2A2A2A",
  color: "#E8E8E8",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

export default function RegisterPage() {
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
  } = useRegisterFlow();

  const addBook = useBooksStore((s) => s.addBook);
  // Firestore pull 이 AuthProvider 에서 수행되므로 rehydrate 불필요.

  // 숨겨진 file input 을 버튼 클릭으로 트리거. capture="environment" 는 모바일에서 후면 카메라.
  const coverScanInputRef = useRef<HTMLInputElement | null>(null);
  const handleScanCoverClick = () => {
    coverScanInputRef.current?.click();
  };
  const handleScanCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) extractCoverFromImage(f);
    // 같은 파일을 다시 선택해도 change 가 발화되도록 초기화.
    e.target.value = "";
  };

  // 필수 슬롯 + 제목이 있어야 등록 완료 가능.
  // hasParts 는 등록 시점에 자동 추출로 채워지므로 활성화 조건에서는 제외.
  const canSave = useMemo(() => {
    const hasCover = state.cover !== null || state.naverCoverUrl !== null;
    const hasTocImage = TOC_SLOT_KEYS.some((k) => state.tocSlots[k] !== null);
    return (
      hasCover &&
      hasTocImage &&
      state.title.trim().length > 0 &&
      !state.extracting &&
      !state.coverExtracting
    );
  }, [state]);

  const canExtract = useMemo(() => {
    return (
      TOC_SLOT_KEYS.some((k) => state.tocSlots[k] !== null) &&
      !state.extracting
    );
  }, [state.tocSlots, state.extracting]);

  const handleSave = async () => {
    // 목차 추출이 아직이면 먼저 실행 (한 번의 탭으로 "추출 → 저장" 연속 진행).
    let parts = state.tocResult?.parts ?? [];
    let totalPages = state.tocResult?.totalPages ?? 0;

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
      coverUrl: state.cover?.previewUrl ?? state.naverCoverUrl ?? undefined,
      totalPages,
      parts,
      registeredAt: new Date().toISOString(),
    };

    addBook(book);
    router.replace("/");
  };

  return (
    <main
      style={{ background: "#050505", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <PhoneFrame>
        {/* 상단 — 뒤로가기 + 제목 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* 뒤로가기 — 원형 버튼으로 시인성 확보(얇은 ← 기호는 안 보인다는 피드백 반영). */}
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
            책 등록
          </h1>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            paddingBottom: 12,
          }}
        >
          {/* 표지 슬롯 + Naver 자동 미리보기 */}
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
              <p
                style={{
                  fontSize: 10,
                  color: "#5A7A5A",
                  marginTop: 6,
                  letterSpacing: "-0.2px",
                }}
              >
                네이버 검색 결과로 자동 표시 — 다른 표지를 쓰려면 탭해서 교체하세요.
              </p>
            )}

            {/* 표지 촬영 → Gemini Vision → 제목/저자 자동 채움. */}
            <input
              ref={coverScanInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanCoverPick}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={handleScanCoverClick}
              disabled={state.coverExtracting}
              style={{
                marginTop: 10,
                width: "100%",
                background: "transparent",
                color: state.coverExtracting ? "#5A5A5A" : "#8A8A8A",
                border: "1px dashed #2A2A2A",
                borderRadius: 10,
                padding: "10px",
                fontSize: 12,
                cursor: state.coverExtracting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.2px",
              }}
            >
              {state.coverExtracting
                ? "표지 인식 중…"
                : "📸 표지 촬영으로 찾기"}
            </button>
            {state.coverExtractError && (
              <p
                style={{
                  fontSize: 11,
                  color: "#7A3A3A",
                  marginTop: 8,
                  letterSpacing: "-0.2px",
                }}
              >
                표지 인식 실패 — 다시 시도해 주세요.
              </p>
            )}
          </section>

          {/* 제목/저자 */}
          <section
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
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

          {/* 목차 슬롯 3개 */}
          <section>
            <div style={sectionTitleStyle}>목차 사진</div>
            <div style={slotGridStyle}>
              {TOC_SLOT_KEYS.map((k, i) => {
                const slot = state.tocSlots[k];
                return (
                  <RegisterSlot
                    key={k}
                    label={`목차 ${i + 1}`}
                    required={i === 0}
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

            <button
              onClick={extractToc}
              disabled={!canExtract}
              style={{
                marginTop: 12,
                width: "100%",
                background: canExtract ? "#0E3A2A" : "#1A1A1A",
                color: canExtract ? "#00FF7A" : "#5A5A5A",
                border: "1px solid #2A4A3A",
                borderRadius: 10,
                padding: "12px",
                fontSize: 13,
                cursor: canExtract ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              {state.extracting ? "목차 추출 중…" : "목차에서 파트 추출"}
            </button>

            {state.tocError && (
              <p
                style={{
                  fontSize: 11,
                  color: "#7A3A3A",
                  marginTop: 8,
                  letterSpacing: "-0.2px",
                }}
              >
                추출 실패 — 사진을 다시 확인한 뒤 다시 시도해 주세요.
              </p>
            )}
          </section>

          {/* 파트 편집 영역 */}
          {state.tocResult && state.tocResult.parts.length > 0 && (
            <section>
              <div style={sectionTitleStyle}>파트 구조 확인</div>

              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#7A7A7A",
                    marginBottom: 4,
                    letterSpacing: "-0.2px",
                  }}
                >
                  총 페이지
                </div>
                <input
                  type="number"
                  style={textInputStyle}
                  value={state.tocResult.totalPages ?? ""}
                  onChange={(e) =>
                    overrideTotalPages(Number(e.target.value) || 0)
                  }
                  placeholder="예: 312"
                />
              </div>

              <PartsEditor
                parts={state.tocResult.parts}
                onChange={overrideParts}
                warning={state.tocResult.warning}
              />
            </section>
          )}
        </div>

        {/* 하단 CTA */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            marginTop: 16,
            width: "100%",
            background: canSave ? "#00FF7A" : "#1A1A1A",
            color: canSave ? "#000" : "#5A5A5A",
            border: "none",
            borderRadius: 14,
            padding: "16px",
            fontSize: 16,
            fontWeight: 800,
            cursor: canSave ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            letterSpacing: "-0.3px",
          }}
        >
          {state.extracting ? "목차 분석 중…" : "등록 완료"}
        </button>
      </PhoneFrame>
    </main>
  );
}

// 한국어 제목을 id 로 변환 — 공백 → dash, 특수문자 제거. 해시 등은 붙이지 않음.
function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
}
