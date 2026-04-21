import { NextRequest, NextResponse } from "next/server";

// [실험] Gemini 2.5 Pro 에게 책 메타데이터만 던져서 목차 복원을 요청.
// 사진 OCR 대비 비용·레이턴시 우위 — 훈련 데이터에 있는 책이면 바로 답변.
// 모르면 parts:[] 로 응답 → 호출측에서 사진 경로로 폴백.

// Pro 는 Flash 보다 응답 느림(5~10초). Vercel Hobby 상한 60초 여유롭게.
export const maxDuration = 60;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    parts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          index: { type: "INTEGER" },
          label: { type: "STRING" },
          title: { type: "STRING" },
          startPage: { type: "INTEGER" },
          endPage: { type: "INTEGER" },
          sections: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                startPage: { type: "INTEGER" },
                endPage: { type: "INTEGER" },
              },
              required: ["title", "startPage", "endPage"],
            },
          },
        },
        required: ["index", "title", "startPage", "endPage", "sections"],
      },
    },
    totalPages: { type: "INTEGER" },
    // 훈련 데이터에 없으면 true — 호출측이 이걸로 폴백 판단.
    unknown: { type: "BOOLEAN" },
  },
  required: ["parts", "totalPages", "unknown"],
};

interface Body {
  isbn13?: string;
  title?: string;
  author?: string;
  publisher?: string;
  pubDate?: string;
  totalPages?: number;
  category?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.title) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY missing" },
      { status: 400 },
    );
  }

  // 프롬프트 — 메타데이터 grounding 로 정확도 끌어올림.
  // "모르면 unknown:true" 명시 → Pro 가 창작하는 대신 정직히 포기.
  const prompt = `너는 출판된 책의 목차를 정확히 기억하는 전문가다.

아래 한국어 책의 목차를 정확히 복원하라.

책 정보:
- 제목: ${body.title}
- 저자: ${body.author ?? "(미상)"}
- 출판사: ${body.publisher ?? "(미상)"}
- 출간: ${body.pubDate ?? "(미상)"}
- ISBN: ${body.isbn13 ?? "(미상)"}
- 총 쪽수: ${body.totalPages ?? "(미상)"}
- 장르: ${body.category ?? "(미상)"}

규칙:
- 실제로 알고 있는 경우에만 답하라.
- 모르거나 확신 없으면 unknown:true 로 응답하라.
- 훈련 데이터에 있는 한국어 번역본 목차를 기준으로 하라.
- 추측 절대 금지. 기억에 없으면 빈 parts 와 unknown:true.
- 알고 있다면 모든 챕터/파트를 순서대로 나열하라.
- 프롤로그·에필로그·감사의 글도 포함하라.
- label: 책이 쓰는 호칭(예: "PART 1", "Chapter 3", "프롤로그"). 없으면 "".
- title: label 을 뺀 내용 제목. label 없으면 전체.
- startPage / endPage: 모르면 근사치로 균등 분배. 총 쪽수 넘지 말 것.
- 하위 섹션 없으면 part 자신을 sections 한 개로.`;

  const reqBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 16384,
    },
  };

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(reqBody),
    });
  } catch (err) {
    console.error("[fetch-toc-from-metadata] fetch fail", err);
    return NextResponse.json({ error: "network_failed" }, { status: 502 });
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("[fetch-toc-from-metadata] upstream", r.status, errText);
    return NextResponse.json(
      { error: "upstream_failed", status: r.status },
      { status: 502 },
    );
  }

  const json = await r.json();
  const raw: string =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  console.log("[fetch-toc-from-metadata] raw response:\n" + raw);

  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped) as {
      parts: unknown[];
      totalPages: number;
      unknown: boolean;
    };
    if (parsed.unknown || !Array.isArray(parsed.parts) || parsed.parts.length === 0) {
      console.log("[fetch-toc-from-metadata] Pro 가 모름", body.title);
      return NextResponse.json({ unknown: true, parts: [], totalPages: 0 });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[fetch-toc-from-metadata] parse fail", e, stripped);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
