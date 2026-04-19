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
  const extractToc = useCallback(async () => {
    const files: File[] = [];
    for (const k of TOC_SLOT_KEYS) {
      const slot = state.tocSlots[k];
      if (slot) files.push(slot.file);
    }
    if (files.length === 0) return;

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
        setState((s) => ({
          ...s,
          extracting: false,
          tocResult: {
            parts: (data.parts ?? []) as BookPart[],
            totalPages: data.totalPages,
            confidence: data.confidence,
            warning: data.warning,
          },
          tocSlots: markTocStatus(s.tocSlots, "done"),
        }));
        return;
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
  }, [state.tocSlots]);

  return {
    state,
    setCover,
    clearCover,
    setTocSlot,
    clearTocSlot,
    setTitle,
    setAuthor,
    extractToc,
    overrideParts,
    overrideTotalPages,
  };
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
