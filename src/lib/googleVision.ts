// Google Cloud Vision API — DOCUMENT_TEXT_DETECTION 클라이언트.
// 공식 문서: https://cloud.google.com/vision/docs/ocr
//
// API key 방식 사용 (service account JSON 불필요).
//   POST https://vision.googleapis.com/v1/images:annotate?key=API_KEY
//
// 필요 env:
//   GCP_VISION_API_KEY  — Google Cloud Console > APIs & Services > Credentials
//
// 반환: 줄 단위 병합 텍스트 + 블록별 bounding box.
// bbox 좌표로 나중에 룰베이스 파서가 들여쓰기·계층·페이지번호 분리.

export interface VisionVertex {
  x: number;
  y: number;
}

export interface VisionBlock {
  text: string;
  vertices: VisionVertex[]; // 4개 꼭짓점 (좌상 → 우상 → 우하 → 좌하)
  confidence: number;
}

export interface VisionResult {
  text: string; // fullTextAnnotation.text — 줄바꿈 포함 원본
  lines: string[]; // paragraph 단위 분할
  blocks: VisionBlock[]; // 좌표 포함 블록 배열
  raw: unknown; // 디버깅용
}

interface VisionApiResponse {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{
        blocks?: Array<{
          paragraphs?: Array<{
            words?: Array<{
              symbols?: Array<{ text?: string }>;
              boundingBox?: { vertices?: VisionVertex[] };
            }>;
            boundingBox?: { vertices?: VisionVertex[] };
            confidence?: number;
          }>;
          boundingBox?: { vertices?: VisionVertex[] };
        }>;
      }>;
    };
    error?: { message?: string };
  }>;
}

export async function visionOcr(input: { base64: string }): Promise<VisionResult> {
  const apiKey = process.env.GCP_VISION_API_KEY;
  if (!apiKey) throw new Error("GCP_VISION_API_KEY 미설정 — .env.local 확인");

  const body = {
    requests: [
      {
        image: { content: input.base64 },
        features: [
          // DOCUMENT_TEXT_DETECTION — 조밀한 본문/목차에 최적화.
          // TEXT_DETECTION 보다 구조(paragraph/block) 정보 풍부.
          { type: "DOCUMENT_TEXT_DETECTION" },
        ],
        imageContext: {
          // 한국어 + 영어 혼합 목차 대응.
          languageHints: ["ko", "en"],
        },
      },
    ],
  };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Vision HTTP ${res.status}: ${err.slice(0, 400)}`);
  }

  const json = (await res.json()) as VisionApiResponse;
  const r0 = json.responses?.[0];
  if (r0?.error?.message) {
    throw new Error(`Vision API 에러: ${r0.error.message}`);
  }

  const ann = r0?.fullTextAnnotation;
  const fullText = ann?.text ?? "";

  // paragraph 단위로 블록 추출 — 목차 한 줄 = 대개 paragraph 1개.
  const blocks: VisionBlock[] = [];
  const pages = ann?.pages ?? [];
  for (const page of pages) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        const text = (para.words ?? [])
          .map((w) => (w.symbols ?? []).map((s) => s.text ?? "").join(""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (!text) continue;
        blocks.push({
          text,
          vertices: para.boundingBox?.vertices ?? [],
          confidence: para.confidence ?? 0,
        });
      }
    }
  }

  // 줄 단위 fallback — fullText 의 \n 기준 분할. 파서는 blocks 쪽 쓰는 걸 권장.
  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return { text: fullText, lines, blocks, raw: json };
}
