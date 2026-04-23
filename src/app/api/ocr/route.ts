import { NextRequest, NextResponse } from "next/server";
import { visionOcr } from "@/lib/googleVision";
import { paddleOcr } from "@/lib/paddleOcr";

// OCR 라우트.
// ?engine=vision  → Google Cloud Vision (기본)
// ?engine=paddle  → 로컬 PaddleOCR 사이드카 (:8765)
//
// 응답 스키마는 엔진 공통:
//   { text, lines[], blockCount, engine }

export const maxDuration = 60;

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const engine = (req.nextUrl.searchParams.get("engine") ?? "vision").toLowerCase();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", limit: MAX_BYTES },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: "unsupported_mime", mime: file.type },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (engine === "paddle") {
      const r = await paddleOcr({
        buffer: buf,
        filename: file.name,
        mime: file.type,
      });
      return NextResponse.json({
        engine: "paddle",
        text: r.text,
        // Vision 스키마와 호환 — lines 를 블록처럼 노출.
        lines: r.lines.map((l) => l.text),
        blocks: r.lines.map((l) => ({
          text: l.text,
          vertices: l.box.map(([x, y]) => ({ x, y })),
          confidence: l.confidence,
        })),
        blockCount: r.lineCount,
      });
    }

    // 기본 — Vision.
    const base64 = buf.toString("base64");
    const r = await visionOcr({ base64 });
    return NextResponse.json({
      engine: "vision",
      text: r.text,
      lines: r.lines,
      blocks: r.blocks,
      blockCount: r.blocks.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error(`[api/ocr] ${engine} fail`, msg);
    return NextResponse.json({ error: "ocr_failed", engine, detail: msg }, { status: 500 });
  }
}
