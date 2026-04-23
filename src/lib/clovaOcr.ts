// CLOVA OCR General API 클라이언트.
// 공식 문서: https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocr
//
// 필요 env:
//   CLOVA_OCR_INVOKE_URL  — apigw.ntruss.com 으로 끝나는 도메인의 /general 엔드포인트
//   CLOVA_OCR_SECRET      — X-OCR-SECRET 헤더에 넣을 시크릿
//
// 반환: 줄 단위로 병합된 plain text + 박스 좌표 포함 원본 필드.

export interface OcrField {
  inferText: string;
  inferConfidence: number;
  boundingPoly: { vertices: Array<{ x: number; y: number }> };
  // lineBreak: true 면 이 필드 뒤에서 줄 바꿈.
  lineBreak?: boolean;
}

export interface OcrResult {
  text: string; // 줄 단위로 병합된 전체 텍스트
  lines: string[]; // 줄 배열
  fields: OcrField[]; // 원본 필드 (좌표 보존)
  raw: unknown; // CLOVA 응답 원본 — 디버깅용
}

interface ImageInput {
  base64: string; // data URI prefix 없는 순수 base64
  format?: "jpg" | "png" | "pdf";
  name?: string;
}

export async function ocrImage(input: ImageInput): Promise<OcrResult> {
  const url = process.env.CLOVA_OCR_INVOKE_URL;
  const secret = process.env.CLOVA_OCR_SECRET;
  if (!url) throw new Error("CLOVA_OCR_INVOKE_URL 미설정 — .env.local 확인");
  if (!secret) throw new Error("CLOVA_OCR_SECRET 미설정 — .env.local 확인");

  const body = {
    // V2: lineBreak 플래그·tableDetection 등 최신 기능 포함.
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format: input.format ?? "jpg",
        name: input.name ?? "toc",
        data: input.base64,
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OCR-SECRET": secret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`CLOVA OCR HTTP ${res.status}: ${err.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    images?: Array<{ fields?: OcrField[]; inferResult?: string }>;
  };

  const img0 = json.images?.[0];
  if (!img0 || img0.inferResult !== "SUCCESS") {
    throw new Error(`CLOVA OCR 실패: ${img0?.inferResult ?? "no_image"}`);
  }

  const fields = img0.fields ?? [];

  // 줄 단위로 병합 — lineBreak=true 지점에서 개행, 나머지는 공백.
  const lines: string[] = [];
  let buf: string[] = [];
  for (const f of fields) {
    buf.push(f.inferText);
    if (f.lineBreak) {
      lines.push(buf.join(" ").replace(/\s+/g, " ").trim());
      buf = [];
    }
  }
  if (buf.length) lines.push(buf.join(" ").replace(/\s+/g, " ").trim());

  return {
    text: lines.join("\n"),
    lines: lines.filter(Boolean),
    fields,
    raw: json,
  };
}
