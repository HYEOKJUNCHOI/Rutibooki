// PaddleOCR 로컬 사이드카 클라이언트.
// 혁준님 집 PC 에서 FastAPI 서버가 :8765 로 떠있음 (python/ocr_server/main.py).
//
// 필요 env (선택):
//   PADDLE_OCR_URL — 기본값 http://127.0.0.1:8765 (로컬 dev)
//                   배포 시엔 ngrok 터널 URL 로 교체.

export interface PaddleLine {
  text: string;
  confidence: number;
  box: Array<[number, number]>; // 4개 꼭짓점 (좌상→우상→우하→좌하)
}

export interface PaddleResult {
  text: string; // 줄바꿈으로 합친 전체
  lines: PaddleLine[];
  lineCount: number;
  raw: unknown;
}

export async function paddleOcr(input: {
  buffer: Buffer;
  filename?: string;
  mime?: string;
}): Promise<PaddleResult> {
  const base = process.env.PADDLE_OCR_URL ?? "http://127.0.0.1:8765";

  const form = new FormData();
  // Node 20+ FormData 는 Blob 지원. Buffer → Blob 변환.
  const blob = new Blob([new Uint8Array(input.buffer)], {
    type: input.mime ?? "application/octet-stream",
  });
  form.append("file", blob, input.filename ?? "image.jpg");

  const res = await fetch(`${base}/ocr`, {
    method: "POST",
    body: form,
    // PaddleOCR 첫 호출은 모델 로드로 20~30초 걸릴 수 있음. 여유있게.
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Paddle HTTP ${res.status}: ${err.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    lines?: PaddleLine[];
    text?: string;
    line_count?: number;
  };

  return {
    text: json.text ?? "",
    lines: json.lines ?? [],
    lineCount: json.line_count ?? 0,
    raw: json,
  };
}
