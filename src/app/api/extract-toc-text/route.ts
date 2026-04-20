import { NextRequest, NextResponse } from "next/server";

// OCR 으로 추출된 raw 텍스트를 받아 Gemini Flash (텍스트-전용 모드) 로 parts/sections 구조화.
// 왜 분리했냐: 이미지 토큰은 해상도 기반으로 비쌈. Cloud Vision 이 OCR 전담하고
// 여기선 텍스트 토큰만 다루므로 입력 비용이 1/10 수준. 구조화 정확도는 Vision 한 방 대비 동등 이상.

const PROMPT = `아래 텍스트는 책 목차 이미지를 OCR 한 결과입니다. 페이지 순서대로 모든 항목을 추출해 스키마에 맞춰 주세요.
- parts: 최상위 단위(장/파트/챕터). 프롤로그·에필로그도 parts 로 취급.
- part.label: 책이 실제로 쓰는 파트 호칭(예: "나침반 1", "Chapter 3", "PART II", "프롤로그"). 책에 호칭이 없으면 빈 문자열.
- part.title: 파트의 내용 제목(label 을 제외한 본문). label 이 없는 파트는 제목 전체를 title 에 넣어주세요.
- 각 part.sections: 하위 항목(절/섹션). 하위가 없으면 파트 자기 자신을 하나의 section 으로 넣어주세요.
- startPage: 해당 항목이 시작하는 페이지 숫자. endPage 는 알면 적고 모르면 startPage 와 같게.
- totalPages: 목차에서 마지막 항목의 페이지(또는 책 전체 페이지 수).
- 원문 텍스트 그대로, 추측 금지, 누락 금지.
- OCR 오타(예: 띄어쓰기 붙음, 유사문자 혼동)가 보이면 자연스럽게 교정하되 의미는 바꾸지 마세요.`;

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
  },
  required: ["parts", "totalPages"],
};

const MAX_TEXT_LEN = 30_000;

interface Body {
  text?: unknown;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "no_text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: "text_too_long" }, { status: 413 });
  }

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
        parts: [{ text: PROMPT + "\n\n===== OCR 텍스트 =====\n" + text }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

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
    console.error("[extract-toc-text] fetch fail", err);
    return NextResponse.json({ error: "network_failed" }, { status: 502 });
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("[extract-toc-text] upstream", r.status, errText);
    return NextResponse.json(
      { error: "upstream_failed", status: r.status },
      { status: 502 },
    );
  }

  const json = await r.json();
  const raw: string =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  console.log("[extract-toc-text] raw response:\n" + raw);

  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped) as OurResponse;
    if (!Array.isArray(parsed.parts) || parsed.parts.length === 0) {
      console.error("[extract-toc-text] empty parts", stripped);
      return NextResponse.json({ error: "empty_parts" }, { status: 422 });
    }
    parsed.parts.forEach((p, i) => {
      if (typeof p.index !== "number") p.index = i + 1;
    });
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[extract-toc-text] parse fail", e, stripped);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}

interface OurSection {
  title: string;
  startPage: number;
  endPage: number;
}
interface OurPart {
  index: number;
  label?: string;
  title: string;
  startPage: number;
  endPage: number;
  sections: OurSection[];
}
interface OurResponse {
  parts: OurPart[];
  totalPages: number;
}
