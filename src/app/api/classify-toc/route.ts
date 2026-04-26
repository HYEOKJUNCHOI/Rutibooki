import { NextRequest, NextResponse } from "next/server";
import { visionOcr } from "@/lib/googleVision";
import { classifyTocLines } from "@/lib/tocClassifierAI";
import { buildTocTreeFromAI } from "@/lib/buildTocTree";
import type { BookPart } from "@/types/book";

// 목차 사진들을 받아서 → Vision OCR → AI 분류 → BookPart[] 반환.
// 등록 플로우 한 방 엔드포인트.
//
// Body (multipart/form-data):
//   - file_0, file_1, ... : 목차 페이지 이미지들 (1장 이상)
//   - totalPages: number — 알라딘에서 받은 책 총쪽수 (페이지 균등분배 기준)
//
// 응답:
//   { ok, parts, totalPages, debug?: { rawText, classified } }
//
// 실패 폴백 — AI 안 돌면 raw OCR 라인을 평탄한 파트로 묶어서라도 결과 채움.

export const maxDuration = 60;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

interface OkResp {
  ok: true;
  parts: BookPart[];
  totalPages: number;
  source: "ai" | "fallback_raw";
  pageCount: number;
}

interface ErrResp {
  ok: false;
  error: string;
  detail?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<OkResp | ErrResp>> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const totalPagesRaw = form.get("totalPages");
  let totalPages =
    typeof totalPagesRaw === "string" ? Number(totalPagesRaw) || 0 : 0;

  // 파일 수집 — file_0, file_1, ... 또는 file 다중.
  const files: File[] = [];
  for (const [key, val] of form.entries()) {
    if (val instanceof File && (key === "file" || key.startsWith("file_"))) {
      files.push(val);
    }
  }
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "no_files" }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "file_too_large" },
        { status: 413 },
      );
    }
    if (f.type && !ALLOWED_MIMES.has(f.type)) {
      return NextResponse.json(
        { ok: false, error: "unsupported_mime", detail: f.type },
        { status: 400 },
      );
    }
  }

  // ── 1) 각 페이지 Vision OCR 병렬 실행 ──
  let allLines: string[] = [];
  try {
    const perPage = await Promise.all(
      files.map(async (f) => {
        const buf = Buffer.from(await f.arrayBuffer());
        const base64 = buf.toString("base64");
        const r = await visionOcr({ base64 });
        return r.lines ?? [];
      }),
    );
    // 페이지 순서 그대로 줄 합치기 — 목차는 페이지 → 페이지로 자연스럽게 이어짐.
    allLines = perPage.flat();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "vision_failed", detail: e instanceof Error ? e.message : "" },
      { status: 502 },
    );
  }

  // 빈 줄/너무 짧은 줄 제거 — 목차 줄로 의미없는 노이즈 차단.
  const cleanLines = allLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length < 200);

  if (cleanLines.length === 0) {
    return NextResponse.json(
      { ok: false, error: "ocr_empty", detail: "Vision 이 텍스트를 못 뽑았어요" },
      { status: 422 },
    );
  }

  // OCR 줄들에서 발견되는 최대 페이지 번호 — totalPages 가 0/잘못된 경우 안전망.
  // "... 256" 처럼 줄 끝 4자리 이하 숫자만. 비현실적인 큰 값(년도 등)은 1500 이하로 제한.
  const PAGE_TAIL = /\s(\d{1,4})\s*$/;
  let maxTailPage = 0;
  for (const l of cleanLines) {
    const m = PAGE_TAIL.exec(l);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v > maxTailPage && v <= 1500) {
        maxTailPage = v;
      }
    }
  }
  // 알라딘 totalPages 가 0 이거나 추출 max 보다 작으면 max 채택 — 마지막 챕터 잘림 방지.
  if (maxTailPage > totalPages) {
    console.log(
      `[classify-toc] totalPages override ${totalPages} → ${maxTailPage} (max tail)`,
    );
    totalPages = maxTailPage;
  }

  // ── 2) AI 분류 — Gemini ──
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  let parts: BookPart[] = [];
  let source: "ai" | "fallback_raw" = "fallback_raw";

  if (apiKey) {
    try {
      const cls = await classifyTocLines(cleanLines, { apiKey });
      if (cls.ok && cls.classifications.length > 0) {
        parts = buildTocTreeFromAI(cleanLines, cls.classifications, { totalPages });
        if (parts.length > 0) source = "ai";
      } else {
        console.warn("[classify-toc] AI failed:", cls.reason);
      }
    } catch (e) {
      console.warn("[classify-toc] AI throw:", e);
    }
  } else {
    console.warn("[classify-toc] GEMINI_API_KEY missing — skipping AI");
  }

  // ── 3) 폴백 — AI 결과 빈약하면 raw 줄을 평탄한 파트로 ──
  if (parts.length === 0) {
    parts = cleanLines.map((line, i) => ({
      index: i + 1,
      label: "",
      title: line,
      startPage: 0,
      endPage: 0,
      sections: [],
    }));
    // 페이지 균등 분배 — 룰 기반과 동일하게.
    if (totalPages > 0) {
      const slot = Math.floor(totalPages / parts.length);
      let cursor = 1;
      parts.forEach((p, i) => {
        p.startPage = cursor;
        const end =
          i === parts.length - 1 ? totalPages : Math.min(totalPages, cursor + slot - 1);
        p.endPage = end;
        cursor = end + 1;
      });
    }
    source = "fallback_raw";
  }

  return NextResponse.json({
    ok: true,
    parts,
    totalPages,
    source,
    pageCount: files.length,
  });
}
