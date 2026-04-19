"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookPart } from "@/types/book";
import type { SlotStatus } from "@/components/register/RegisterSlot";

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
  naverCoverUrl: string | null;
  tocResult: TocResult | null;
  tocError: string | null;
  // 지금 목차 추출 진행 중인지
  extracting: boolean;
  // 표지 메타 추출 진행 중인지 (Gemini Vision)
  coverExtracting: boolean;
  coverExtractError: string | null;
}

export function useRegisterFlow() {
  const [state, setState] = useState<RegisterFlowState>({
    cover: null,
    coverStatus: "idle",
    tocSlots: { toc1: null, toc2: null, toc3: null },
    title: "",
    author: "",
    naverCoverUrl: null,
    tocResult: null,
    tocError: null,
    extracting: false,
    coverExtracting: false,
    coverExtractError: null,
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

    const form = new FormData();
    for (const f of files) form.append("image", f);

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
        const result: TocResult = {
          parts: (data.parts ?? []) as BookPart[],
          totalPages: data.totalPages,
          confidence: data.confidence,
          warning: data.warning,
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
  }, [state.tocSlots]);

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

        setState((s) => ({
          ...s,
          coverExtracting: false,
          coverExtractError: null,
          coverStatus: "done",
          cover: s.cover ? { ...s.cover, status: "done" } : null,
          // 사용자가 이미 입력한 값은 덮지 않음.
          title: s.title || extractedTitle,
          author: s.author || extractedAuthor,
        }));
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
