import { NextRequest, NextResponse } from "next/server";

// OCR 으로 추출된 raw 텍스트를 받아 Gemini Flash (텍스트-전용 모드) 로 parts/sections 구조화.
// 왜 분리했냐: 이미지 토큰은 해상도 기반으로 비쌈. Cloud Vision 이 OCR 전담하고
// 여기선 텍스트 토큰만 다루므로 입력 비용이 1/10 수준. 구조화 정확도는 Vision 한 방 대비 동등 이상.

// 구조는 responseSchema 가 강제하므로 여기선 "행동 규칙"만. 필드 설명 중복 제거 = 입력 토큰 절약.
const PROMPT = `책 목차 OCR 결과를 구조화.
- 프롤로그·에필로그도 part.
- label: 책이 쓰는 호칭("나침반 1","Chapter 3","프롤로그"). 없으면 "".
- title: label 뺀 내용 제목. label 없으면 전체.
- 하위 섹션 없으면 part 자신을 sections 한 개로.
- endPage 모르면 startPage 와 동일.
- 추측 금지, 누락 금지. OCR 오타만 자연스럽게 교정.`;

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
      // 큰 목차(10+ 파트, 수십 섹션) 는 JSON 출력이 7~12KB 까지 나옴.
      // 기본 한도(~8192) 로 잘려 "Unterminated string" 파싱 실패가 났었음 (시작의 기술 케이스).
      maxOutputTokens: 16384,
    },
  };

  // gemini-flash-latest 는 구글이 최신 Flash(3.x) 로 자동 승격 — 3 Flash 는 2.5 대비 토큰 단가 훨씬 비쌈.
  // 목차 구조화는 2.5 로도 충분하므로 명시적으로 2.5 로 고정.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

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
