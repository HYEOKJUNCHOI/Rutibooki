import { NextRequest, NextResponse } from "next/server";

// Google Cloud Vision DOCUMENT_TEXT_DETECTION 을 통한 순수 OCR 라우트.
// 왜 분리했냐: Gemini Vision 한 방으로 OCR+구조화를 같이 하면 이미지 토큰 비용이 큼.
// Cloud Vision 은 호출당 flat rate ($1.50/1000장, 월 1,000장 무료) 라 해상도 올려도 비용 동일.
// 여기선 raw 텍스트만 뽑고, 구조화는 /api/extract-toc-text 에서 텍스트-전용 Gemini 가 담당.

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILES = 3;

interface VisionResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    error?: { code?: number; message?: string };
  }>;
  error?: { code?: number; message?: string };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const images = form.getAll("image") as File[];
  if (images.length === 0) {
    return NextResponse.json({ error: "no_images" }, { status: 400 });
  }
  if (images.length > MAX_FILES) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }
  for (const img of images) {
    if (img.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    if (!ALLOWED_MIME.includes(img.type)) {
      return NextResponse.json(
        { error: "unsupported_media_type" },
        { status: 415 },
      );
    }
  }

  const apiKey = process.env.GCP_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GCP_VISION_API_KEY missing" },
      { status: 400 },
    );
  }

  // 각 이미지를 base64 로 변환해 Vision batch request 로 한 번에 전송.
  // languageHints=["ko"] 로 한글 인식 정확도 향상.
  const requests = await Promise.all(
    images.map(async (f) => ({
      image: {
        content: Buffer.from(await f.arrayBuffer()).toString("base64"),
      },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      imageContext: { languageHints: ["ko"] },
    })),
  );

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.error("[ocr-vision] fetch fail", err);
    return NextResponse.json({ error: "network_failed" }, { status: 502 });
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("[ocr-vision] upstream", r.status, errText);
    return NextResponse.json(
      { error: "upstream_failed", status: r.status },
      { status: 502 },
    );
  }

  const data = (await r.json()) as VisionResponse;
  if (data.error) {
    console.error("[ocr-vision] api error", data.error);
    return NextResponse.json(
      { error: data.error.message ?? "vision_error" },
      { status: 502 },
    );
  }

  // 여러 장 OCR 결과를 페이지 구분자와 함께 합침. 구조화 단계에서 페이지 경계 인식 힌트.
  const pages = (data.responses ?? []).map((res, i) => {
    if (res.error) {
      console.warn("[ocr-vision] page", i, "error", res.error);
      return "";
    }
    return res.fullTextAnnotation?.text ?? "";
  });

  const merged = pages
    .map((t, i) => `[목차 이미지 ${i + 1}]\n${t}`)
    .join("\n\n---\n\n");

  const totalLen = merged.length;
  console.log("[ocr-vision] done", { images: images.length, totalLen });

  if (totalLen === 0) {
    return NextResponse.json({ error: "empty_ocr" }, { status: 422 });
  }

  return NextResponse.json({ text: merged, pages: pages.length });
}
