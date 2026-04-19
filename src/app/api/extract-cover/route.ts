import { NextRequest, NextResponse } from "next/server";

// T-37b: Gemini Vision 으로 책 표지 이미지에서 메타데이터 추출.
// 목차 추출과 달리 단일 이미지 + base64 data URL 을 JSON body 로 받는다
// (클라이언트에서 카메라로 찍은 한 장을 바로 전송하는 흐름에 맞춤).

const PROMPT = `이 책 표지 이미지에서 제목, 부제, 저자, 출판사를 추출해줘.
JSON으로만 응답해:
{"title":"...", "subtitle":"...", "author":"...", "publisher":"..."}
찾지 못한 필드는 빈 문자열. 설명·코드블록 금지.`;

interface ExtractCoverBody {
  image?: string; // base64 data URL (e.g. "data:image/jpeg;base64,...")
}

export async function POST(req: NextRequest) {
  let body: ExtractCoverBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const image = body.image;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "no_image" }, { status: 400 });
  }

  // data URL 파싱. 포맷: data:<mime>;base64,<data>
  const match = image.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "invalid_data_url" }, { status: 400 });
  }
  const mimeType = match[1];
  const base64 = match[2];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY missing" },
      { status: 400 },
    );
  }

  const reqBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });
  } catch (err) {
    console.error("[extract-cover] fetch fail", err);
    return NextResponse.json({ error: "network_failed" }, { status: 502 });
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("[extract-cover] upstream", r.status, errText);
    return NextResponse.json(
      { error: "upstream_failed", status: r.status },
      { status: 502 },
    );
  }

  const json = await r.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json({
      title: typeof parsed.title === "string" ? parsed.title : "",
      subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : "",
      author: typeof parsed.author === "string" ? parsed.author : "",
      publisher: typeof parsed.publisher === "string" ? parsed.publisher : "",
    });
  } catch {
    console.error("[extract-cover] parse fail", text);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
