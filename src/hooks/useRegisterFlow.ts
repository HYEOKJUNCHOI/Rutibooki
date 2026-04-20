"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookPart } from "@/types/book";
import type { AladinBook } from "@/types/aladin";
import type { SlotStatus } from "@/components/register/RegisterSlot";
import { postProcessParts } from "@/utils/postProcessParts";
import { parseAladinToc } from "@/utils/parseAladinToc";
import { normalizeAuthor } from "@/utils/normalizeAuthor";

// T-35: /register 상태 머신. 표지/목차 업로드, Vision 호출, Naver 표지 검색.

export interface SlotFile {
  file: File;
  previewUrl: string;
  status: SlotStatus;
}

export interface TocResult {
  parts: BookPart[];
  totalPages?: number;
  confidence?: number;
  warning?: string;
  // 검색/바코드 경로로 온 경우 true — 페이지 범위가 Gemini 추정값임을 UI 에 전달.
  estimated?: boolean;
}

interface NaverCover {
  image: string | null;
  title: string;
  author: string;
}

// 목차 슬롯 키. 표지는 별도로 관리.
export const TOC_SLOT_KEYS = ["toc1", "toc2", "toc3"] as const;
export type TocSlotKey = (typeof TOC_SLOT_KEYS)[number];

export interface RegisterFlowState {
  cover: SlotFile | null;
  coverStatus: SlotStatus;
  tocSlots: Record<TocSlotKey, SlotFile | null>;
  title: string;
  author: string;
  // Gemini Vision 이 추론한 장르. handleSave 에서 Book.genre 로 흘러감.
  genre: string;
  // 출판사 — FullJourney 시작 노드에서 저자와 나란히 표시.
  publisher: string;
  naverCoverUrl: string | null;
  tocResult: TocResult | null;
  tocError: string | null;
  // 지금 목차 추출 진행 중인지
  extracting: boolean;
  // 표지 메타 추출 진행 중인지 (Gemini Vision)
  coverExtracting: boolean;
  coverExtractError: string | null;
  // 표지 OCR → 알라딘 검색에서 백그라운드로 매칭된 책. UI 노출 X.
  // 목차 후처리 시 totalPages 검산용으로 쓰임.
  aladinMatch: AladinBook | null;
  // 바코드 경로로 확보된 ISBN-13 — 등록 시 백그라운드가 이걸 우선 사용.
  // null 이면 표지 OCR → 제목 검색 경로로 회귀.
  isbn13: string | null;
  // 바코드 스캔 직후 알라딘 조회 중 상태 — 버튼 disable 용.
  isbnLookupLoading: boolean;
}

export function useRegisterFlow() {
  const [state, setState] = useState<RegisterFlowState>({
    cover: null,
    coverStatus: "idle",
    tocSlots: { toc1: null, toc2: null, toc3: null },
    title: "",
    author: "",
    genre: "",
    publisher: "",
    naverCoverUrl: null,
    tocResult: null,
    tocError: null,
    extracting: false,
    coverExtracting: false,
    coverExtractError: null,
    aladinMatch: null,
    isbn13: null,
    isbnLookupLoading: false,
  });

  // 언마운트 시 object URL 정리 — 누수 방지.
  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, []);

  const track = useCallback((url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  const setCover = useCallback(
    (file: File) => {
      const previewUrl = track(URL.createObjectURL(file));
      setState((s) => ({
        ...s,
        cover: { file, previewUrl, status: "done" },
        coverStatus: "done",
      }));
    },
    [track],
  );

  const clearCover = useCallback(() => {
    setState((s) => ({ ...s, cover: null, coverStatus: "idle" }));
  }, []);

  const setTocSlot = useCallback(
    (key: TocSlotKey, file: File) => {
      const previewUrl = track(URL.createObjectURL(file));
      setState((s) => ({
        ...s,
        tocSlots: {
          ...s.tocSlots,
          [key]: { file, previewUrl, status: "uploading" },
        },
      }));
    },
    [track],
  );

  const clearTocSlot = useCallback((key: TocSlotKey) => {
    setState((s) => ({
      ...s,
      tocSlots: { ...s.tocSlots, [key]: null },
    }));
  }, []);

  const setTitle = useCallback(
    (v: string) => setState((s) => ({ ...s, title: v })),
    [],
  );
  const setAuthor = useCallback(
    (v: string) => setState((s) => ({ ...s, author: v })),
    [],
  );

  // 바코드 스캔 직후 호출. ISBN 으로 알라딘 메타 동기 조회 → 폼 자동 채움.
  // 여기선 "등록" 자체는 하지 않음. 사용자가 폼 확인하고 목차 사진 추가한 뒤 등록 버튼으로 마무리.
  const lookupByIsbn = useCallback(async (isbn13: string) => {
    setState((s) => ({
      ...s,
      isbn13,
      isbnLookupLoading: true,
    }));
    try {
      const r = await fetch(
        `/api/fetch-toc?isbn=${encodeURIComponent(isbn13)}`,
      );
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      if (data.error === "no_match" || !data.title) {
        throw new Error(data.error || "no_match");
      }
      setState((s) => ({
        ...s,
        title: data.title,
        author: normalizeAuthor(data.author || "") || s.author,
        publisher: data.publisher || s.publisher,
        // 바코드 경로에선 알라딘 커버를 미리보기 슬롯에 표시 (사용자 덮어쓰기 가능).
        naverCoverUrl: data.cover || s.naverCoverUrl,
        aladinMatch: {
          isbn13,
          title: data.title,
          author: normalizeAuthor(data.author || ""),
          publisher: data.publisher || "",
          cover: data.cover || "",
          itemPage: data.itemPage ?? 0,
          link: "",
        },
        isbnLookupLoading: false,
      }));
      return true;
    } catch (e) {
      console.warn("[register-flow] lookupByIsbn fail", e);
      setState((s) => ({ ...s, isbnLookupLoading: false }));
      return false;
    }
  }, []);

  const overrideParts = useCallback((parts: BookPart[]) => {
    setState((s) => ({
      ...s,
      tocResult: s.tocResult
        ? { ...s.tocResult, parts }
        : { parts, totalPages: undefined, confidence: undefined },
    }));
  }, []);

  const overrideTotalPages = useCallback((n: number) => {
    setState((s) => ({
      ...s,
      tocResult: s.tocResult
        ? { ...s.tocResult, totalPages: n }
        : { parts: [], totalPages: n },
    }));
  }, []);

  // [DISABLED 2026-04-21] Naver 표지 debounce 검색은 일시 비활성화.
  // 알라딘 메타(바코드 경로) + 표지 OCR→알라딘 보강(사진 경로) 둘 다 커버/메타를 잘 끌어오므로
  // 중복 호출은 레이턴시/쿼터 낭비라 판단. 알라딘 쿼터(5,000/day) 초과 또는
  // 커버 누락률 상승 시 아래 블록 주석 해제해서 복구:
  //
  // useEffect(() => {
  //   const title = state.title.trim();
  //   if (!title) {
  //     setState((s) => ({ ...s, naverCoverUrl: null }));
  //     return;
  //   }
  //   const id = window.setTimeout(async () => {
  //     try {
  //       const r = await fetch(`/api/book-cover?title=${encodeURIComponent(title)}`);
  //       if (!r.ok) return;
  //       const data: NaverCover = await r.json();
  //       setState((s) => ({
  //         ...s,
  //         naverCoverUrl: data.image ?? null,
  //         author: s.author ? s.author : data.author || s.author,
  //       }));
  //     } catch {}
  //   }, 500);
  //   return () => window.clearTimeout(id);
  // }, [state.title]);

  // 목차 사진 Vision 추출. 3회 retry with backoff.
  // 반환값: 성공 시 TocResult, 실패 시 null.
  // handleSave 가 한 번의 탭으로 "추출 → 저장" 을 이어가기 위해 stale state 우회용 반환값 필요.
  const extractToc = useCallback(async (): Promise<TocResult | null> => {
    const files: File[] = [];
    for (const k of TOC_SLOT_KEYS) {
      const slot = state.tocSlots[k];
      if (slot) files.push(slot.file);
    }
    if (files.length === 0) return null;

    setState((s) => ({
      ...s,
      extracting: true,
      tocError: null,
      tocSlots: markTocStatus(s.tocSlots, "extracting"),
    }));

    // 원본 사진(iPhone 은 10MB 가 흔함) 을 그대로 올리면 서버 8MB 리밋에 걸리거나
    // Gemini 응답이 느려진다. JPEG 1600px 로 축소 — OCR 해상도 충분.
    // 축소 실패는 원본 File 그대로 사용(폴백).
    const resized: Blob[] = await Promise.all(
      files.map(async (f) => {
        try {
          const dataUrl = await fileToResizedDataUrl(f, 1600);
          return await (await fetch(dataUrl)).blob();
        } catch {
          return f;
        }
      }),
    );

    const form = new FormData();
    resized.forEach((blob, i) => {
      // 파일명·mime 보존 — 서버의 ALLOWED_MIME 검사 통과용. 리사이즈된 blob 은 항상 JPEG.
      const name = (files[i] as File).name || `toc-${i + 1}.jpg`;
      const namedFile = new File(
        [blob],
        name.replace(/\.\w+$/, "") + ".jpg",
        { type: "image/jpeg" },
      );
      form.append("image", namedFile);
    });

    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch("/api/extract-toc", {
          method: "POST",
          body: form,
        });
        if (!r.ok) {
          lastError = `status ${r.status}`;
          await wait(500 * (attempt + 1));
          continue;
        }
        const data = await r.json();
        if (data.error) {
          lastError = data.error;
          await wait(500 * (attempt + 1));
          continue;
        }
        const rawParts = (data.parts ?? []) as BookPart[];
        // 알라딘 totalPages 가 있으면 검산에 활용 — Gemini 가 추정한 totalPages 보다 신뢰도 ↑.
        const aladinTotal = state.aladinMatch?.itemPage ?? 0;
        const { parts: cleanedParts, warning: postWarning } = postProcessParts(
          rawParts,
          aladinTotal || data.totalPages,
        );
        const result: TocResult = {
          parts: cleanedParts,
          // 알라딘 메타가 있으면 그쪽을 우선 사용 (출판사가 입력한 확정값).
          totalPages: aladinTotal || data.totalPages,
          confidence: data.confidence,
          warning: postWarning ?? data.warning,
        };
        setState((s) => ({
          ...s,
          extracting: false,
          tocResult: result,
          tocSlots: markTocStatus(s.tocSlots, "done"),
        }));
        return result;
      } catch (e) {
        lastError = (e as Error).message;
      }
    }

    // 3회 모두 실패.
    setState((s) => ({
      ...s,
      extracting: false,
      tocError: lastError || "unknown",
      tocSlots: markTocStatus(s.tocSlots, "error"),
    }));
    return null;
  }, [state.tocSlots, state.aladinMatch]);

  // 표지 이미지 → Gemini Vision → 제목/저자 자동 채움.
  // title 이 바뀌면 기존 effect 가 네이버 표지 자동 검색을 트리거한다.
  // 반환값: 알라딘 목차까지 성공적으로 주입됐으면 true — 상위 흐름에서 Gemini TOC 스킵 판단용.
  const extractCoverFromImage = useCallback(
    async (file: File): Promise<{ aladinTocLoaded: boolean }> => {
      // 1) 업로드된 파일 자체는 cover 슬롯에 먼저 넣는다 (사용자 피드백용).
      const previewUrl = track(URL.createObjectURL(file));
      setState((s) => ({
        ...s,
        cover: { file, previewUrl, status: "uploading" },
        coverStatus: "uploading",
        coverExtracting: true,
        coverExtractError: null,
      }));

      // 2) File → 리사이즈 + base64 data URL 변환.
      // Gemini Vision 에 원본 해상도(수 MB)를 보내면 네트워크·비용 낭비.
      // 표지/목차 텍스트 인식에는 longest edge 1200px 로 충분.
      let dataUrl: string;
      try {
        dataUrl = await fileToResizedDataUrl(file, 1200);
      } catch (e) {
        setState((s) => ({
          ...s,
          coverExtracting: false,
          coverExtractError: (e as Error).message || "read_failed",
          coverStatus: "done",
          cover: s.cover ? { ...s.cover, status: "done" } : null,
        }));
        return { aladinTocLoaded: false };
      }

      // 3) API 호출.
      try {
        const r = await fetch("/api/extract-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || `status ${r.status}`);
        }
        const data = await r.json();
        const extractedTitle =
          typeof data.title === "string" ? data.title.trim() : "";
        const extractedAuthor =
          typeof data.author === "string" ? data.author.trim() : "";
        const extractedGenre =
          typeof data.genre === "string" ? data.genre.trim() : "";
        const extractedPublisher =
          typeof data.publisher === "string" ? data.publisher.trim() : "";

        setState((s) => ({
          ...s,
          coverExtracting: false,
          coverExtractError: null,
          coverStatus: "done",
          cover: s.cover ? { ...s.cover, status: "done" } : null,
          // 사용자가 이미 입력한 값은 덮지 않음. 장르·출판사는 사용자가 직접 입력할 필드가 아니라 항상 덮음.
          title: s.title || extractedTitle,
          author: s.author || extractedAuthor,
          genre: extractedGenre || s.genre,
          publisher: extractedPublisher || s.publisher,
        }));

        // 4) 알라딘 보강 — 제목+저자+출판사 교정, ISBN 확보, 목차까지 시도.
        // await 해서 상위(handleExtractAll)가 Gemini TOC 를 돌릴지 말지 확정할 수 있게.
        let aladinTocLoaded = false;
        if (extractedTitle) {
          aladinTocLoaded = await enrichWithAladin(extractedTitle, setState);
        }
        return { aladinTocLoaded };
      } catch (e) {
        setState((s) => ({
          ...s,
          coverExtracting: false,
          coverExtractError: (e as Error).message || "extract_failed",
          coverStatus: "done",
          cover: s.cover ? { ...s.cover, status: "done" } : null,
        }));
        return { aladinTocLoaded: false };
      }
    },
    [track],
  );

  return {
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
    lookupByIsbn,
  };
}

// File → base64 data URL. FileReader 래핑.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("read_not_string"));
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

// File → canvas 리사이즈 → JPEG data URL. longest edge 가 maxEdge 이하가 되도록 축소.
// 이미 충분히 작으면 원본을 그대로 data URL 로 반환(재인코딩으로 화질 떨어지는 것 방지).
async function fileToResizedDataUrl(
  file: File,
  maxEdge: number,
): Promise<string> {
  // 브라우저 외 환경(SSR·테스트) 안전 장치.
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return fileToDataUrl(file);
  }

  const originalUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image_load_failed"));
      el.src = originalUrl;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= maxEdge) {
      // 리사이즈 불필요 → 원본 data URL 그대로 반환.
      return await fileToDataUrl(file);
    }

    const scale = maxEdge / longest;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await fileToDataUrl(file);
    ctx.drawImage(img, 0, 0, w, h);
    // JPEG 품질 0.85 — OCR/라벨 인식에 충분하면서 용량은 1/5~1/10 수준.
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

function markTocStatus(
  slots: Record<TocSlotKey, SlotFile | null>,
  status: SlotStatus,
): Record<TocSlotKey, SlotFile | null> {
  const out = { ...slots };
  for (const k of TOC_SLOT_KEYS) {
    const s = out[k];
    if (s) out[k] = { ...s, status };
  }
  return out;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 표지 OCR 끝난 뒤 알라딘으로 메타 보강.
// 1순위 매칭이면 제목/저자/출판사/표지를 알라딘 값으로 덮음 — Gemini OCR 의 오타 자동 교정.
// 알라딘이 빈 응답을 주거나 네트워크 실패면 조용히 종료 (사진 OCR 결과 그대로 유지).
async function enrichWithAladin(
  query: string,
  setState: React.Dispatch<React.SetStateAction<RegisterFlowState>>,
): Promise<boolean> {
  try {
    const r = await fetch(`/api/search-book?q=${encodeURIComponent(query)}`);
    if (!r.ok) return false;
    const data = await r.json();
    const top: AladinBook | undefined = data.items?.[0];
    if (!top) return false;

    setState((s) => ({
      ...s,
      // OCR 보다 알라딘이 정답에 가까움 — 사용자가 아직 손대지 않은 필드만 덮는다.
      title: s.title === "" || s.title === query ? top.title : s.title,
      author: s.author ? s.author : top.author,
      publisher: s.publisher ? s.publisher : top.publisher,
      // 사용자가 직접 표지를 올렸으면 안 덮음 (수동 우선). 알라딘 표지는 보조.
      naverCoverUrl: s.cover ? s.naverCoverUrl : top.cover || s.naverCoverUrl,
      aladinMatch: top,
    }));

    // 매칭됐으니 바로 알라딘 목차 조회 — 성공하면 Gemini Vision 안 돌려도 됨.
    // 실패/빈 결과면 false 반환해서 상위에서 사진 OCR 흐름으로 회귀.
    if (top.isbn13) {
      return await fetchAladinToc(top.isbn13, top.itemPage || 0, setState);
    }
    return false;
  } catch {
    // 네트워크 실패는 조용히 — 보강은 보너스, 필수 흐름이 아니다.
    return false;
  }
}

// 알라딘 ItemLookUp 목차 조회 → 파싱 → tocResult 주입.
// 이게 성공하면 사용자는 "불러오기" 눌러도 Gemini 호출 없이 즉시 저장 가능.
async function fetchAladinToc(
  isbn: string,
  fallbackPages: number,
  setState: React.Dispatch<React.SetStateAction<RegisterFlowState>>,
): Promise<boolean> {
  try {
    const r = await fetch(`/api/fetch-toc?isbn=${encodeURIComponent(isbn)}`);
    if (!r.ok) return false;
    const data = await r.json();
    const html = typeof data.toc === "string" ? data.toc : "";
    if (!html) return false;

    const { parts, lastPage } = parseAladinToc(html);
    if (parts.length === 0) return false;

    const totalPages =
      (typeof data.itemPage === "number" && data.itemPage > 0
        ? data.itemPage
        : fallbackPages) || lastPage;

    setState((s) => {
      // 사용자가 이미 사진 OCR 로 목차를 뽑아둔 경우엔 덮지 않음.
      if (s.tocResult && s.tocResult.parts.length > 0) return s;
      return {
        ...s,
        tocResult: {
          parts,
          totalPages,
          confidence: 0.95,
          warning: undefined,
        },
      };
    });
    return true;
  } catch {
    // 목차 조회 실패는 조용히 — 사진 OCR fallback 이 대기 중.
    return false;
  }
}
