import { NextRequest, NextResponse } from "next/server";

// T-37: Gemini Vision 으로 책 목차 이미지를 파트/섹션 JSON 으로 변환.
// 프롬프트는 지시서 고정. 사용자 입력 없이 고정값 → 프롬프트 인젝션 위험 낮음.

// 엄격한 스키마 강제 → Flash 가 내용 놓침. Pro 로 바꾸고 프롬프트도 풀어서
// 모델이 자연스럽게 구조 뽑게 하고, 후처리로 우리 스키마에 맞춘다.
const PROMPT = `이 이미지들은 한국어 책의 목차 페이지다.
모든 파트/장/섹션 제목과 페이지 번호를 정확히 읽어서 JSON 으로 정리하라.
- 상위 단위(부·파트·Part·나침반N·챕터N 등)는 parts[] 에,
  그 아래 세부 항목(장·절·소제목)은 해당 파트의 sections[] 에 넣는다.
- 상위 단위가 없으면 전체를 parts[0] 하나로 묶는다.
- 각 항목의 시작 페이지는 startPage, endPage 는 다음 항목의 startPage - 1.
  마지막 항목은 본인 startPage 와 같게 둬도 된다(서버가 보정).
- 페이지 번호를 하나도 못 읽으면 confidence 를 0 으로.
오직 JSON 만 응답. 설명·코드블록 금지.
{
  "parts": [
    { "index": 1, "title": "...", "startPage": 1, "endPage": 52,
      "sections": [{ "title": "...", "startPage": 1, "endPage": 28 }] }
  ],
  "totalPages": 312,
  "confidence": 0.87
}`;

// [Security HIGH #4] 파일 업로드 검증 — 크기·MIME·개수 제한으로 DoS/비용 공격 차단.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — 고해상도 스캔 허용
const MAX_FILES = 3;

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
      return NextResponse.json(
        { error: "file_too_large" },
        { status: 413 },
      );
    }
    // type 이 비어있으면(일부 카메라) 거부. 빈 값 폴백하지 않음.
    if (!ALLOWED_MIME.includes(img.type)) {
      return NextResponse.json(
        { error: "unsupported_media_type" },
        { status: 415 },
      );
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY missing" },
      { status: 400 },
    );
  }

  // 이미지를 base64 inline 으로 첨부. 파일 크기 여러 장이면 요청 무거워질 수 있음.
  const inlineData = await Promise.all(
    images.map(async (f) => ({
      inline_data: {
        mime_type: f.type || "image/jpeg",
        data: Buffer.from(await f.arrayBuffer()).toString("base64"),
      },
    })),
  );

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, ...inlineData],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  // 키는 쿼리스트링 대신 헤더로 — 서버 액세스로그/프록시 캐시에 키가 남지 않게.
  // Pro 필수 — Flash 는 목차를 "본인이 자연스럽다 싶은 단어" 로 환각 보정.
  // 실측: "별이 없는 밤, 부의 방향" → "빛이 없는 밤, 빛의 방향" 식으로 절반 오역.
  // 비용 10배지만 한 권 3~5원 수준이라 감수할 만함.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`;

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[extract-toc] fetch fail", err);
    return NextResponse.json({ error: "network_failed" }, { status: 502 });
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("[extract-toc] upstream", r.status, errText);
    return NextResponse.json(
      { error: "upstream_failed", status: r.status },
      { status: 502 },
    );
  }

  const json = await r.json();
  // Gemini 응답에서 텍스트 파트 추출. 응답 스키마 보장 없음 → 방어적 접근.
  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text);
    if ((parsed.confidence ?? 0) < 0.4) parsed.warning = "low-confidence";
    return NextResponse.json(parsed);
  } catch {
    console.error("[extract-toc] parse fail", text);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
