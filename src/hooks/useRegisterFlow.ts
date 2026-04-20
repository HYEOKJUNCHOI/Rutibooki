"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookPart } from "@/types/book";
import type { AladinBook } from "@/types/aladin";
import type { SlotStatus } from "@/components/register/RegisterSlot";
import { postProcessParts } from "@/utils/postProcessParts";

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

  // Naver 표지 debounce 검색 — title 입력 후 500ms.
  useEffect(() => {
    const title = state.title.trim();
    if (!title) {
      setState((s) => ({ ...s, naverCoverUrl: null }));
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/book-cover?title=${encodeURIComponent(title)}`,
        );
        if (!r.ok) return;
        const data: NaverCover = await r.json();
        setState((s) => ({
          ...s,
          // 사용자 업로드가 있으면 덮지 않음 (수동 우선)
          naverCoverUrl: data.image ?? null,
          // 저자가 비어있을 때만 자동 채움
          author: s.author ? s.author : data.author || s.author,
        }));
      } catch {
        // 네트워크 실패는 조용히 무시 (필수 플로우 아님)
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [state.title]);

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
  const extractCoverFromImage = useCallback(
    async (file: File) => {
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
        return;
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

        // 4) 알라딘 백그라운드 보강 — 표지에서 제목을 못 뽑았으면 스킵.
        // 메인 OCR 흐름은 이미 완료된 상태라 이건 "있으면 좋은" 보너스.
        // 실패해도 사용자에겐 안 알린다 (사진 OCR 결과만으로도 등록 가능).
        if (extractedTitle) {
          enrichWithAladin(extractedTitle, setState);
        }
      } catch (e) {
        setState((s) => ({
          ...s,
          coverExtracting: false,
          coverExtractError: (e as Error).message || "extract_failed",
          coverStatus: "done",
          cover: s.cover ? { ...s.cover, status: "done" } : null,
        }));
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
) {
  try {
    const r = await fetch(`/api/search-book?q=${encodeURIComponent(query)}`);
    if (!r.ok) return;
    const data = await r.json();
    const top: AladinBook | undefined = data.items?.[0];
    if (!top) return;

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
  } catch {
    // 네트워크 실패는 조용히 — 보강은 보너스, 필수 흐름이 아니다.
  }
}
