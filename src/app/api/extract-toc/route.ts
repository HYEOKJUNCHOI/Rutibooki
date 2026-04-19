import { NextRequest, NextResponse } from "next/server";

// T-37: Gemini Vision 으로 책 목차 이미지를 파트/섹션 JSON 으로 변환.
// 프롬프트는 지시서 고정. 사용자 입력 없이 고정값 → 프롬프트 인젝션 위험 낮음.

const PROMPT = `너는 책 목차 이미지에서 구조를 추출하는 OCR/구조화 도구다.
다음 이미지는 한국어 책의 목차 페이지다.
규칙:
1) "파트" / "Part" / "제1부" / "1부" 단위를 parts[].title 로 추출. 없으면 전체를 parts[0]로 묶어라.
2) "장" / "챕터" / "Chapter" 단위를 해당 파트의 sections[] 로 추출.
3) 각 항목의 페이지 번호를 startPage/endPage 에 넣어라. endPage 는 다음 항목의 startPage - 1.
4) 마지막 항목의 endPage 는 마지막으로 보이는 페이지 번호 또는 totalPages.
5) 확신도 0~1 을 confidence 에 반환. 페이지 번호를 하나도 읽지 못하면 0.
오직 아래 JSON 스키마만 응답하라. 설명·코드블록 금지.
{
  "parts": [
    { "index": 1, "title": "...", "startPage": 1, "endPage": 52,
      "sections": [{ "title": "...", "startPage": 1, "endPage": 28 }] }
  ],
  "totalPages": 312,
  "confidence": 0.87
}`;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const images = form.getAll("image") as File[];
  if (images.length === 0) {
    return NextResponse.json(
      { error: "no_images" },
      { status: 400 },
    );
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
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

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
