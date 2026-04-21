import { NextRequest, NextResponse } from "next/server";

// [실험 2차] 네이버 HyperCLOVA X (HCX-005) 에게 책 메타데이터만 던져 목차 복원 요청.
// 1차 실험 (Gemini 2.5 Pro 텍스트) 는 한국어 번역본 목차 기억 실패 — 원서 목차 번역 창작하는 환각 관찰.
// 가설: 한국 LLM 인 HyperCLOVA 는 네이버 책·출판사 DB 기반 한국 출판 메타데이터에 더 강할 수 있음.
// 가설이 기각되면 이 route 도 폐기, Vision(사진) 경로 단일화.

// HCX-005 응답은 Gemini Pro 보다 빠름(2~4초). Vercel Hobby 60초 상한은 여유.
export const maxDuration = 60;

interface Body {
  isbn13?: string;
  title?: string;
  author?: string;
  publisher?: string;
  pubDate?: string;
  totalPages?: number;
  category?: string;
}

// CLOVA 응답에서 뽑아낼 JSON 구조 — Gemini route 와 호환되게 동일 스키마.
interface ExtractedToc {
  parts: Array<{
    index: number;
    label: string;
    title: string;
    startPage: number;
    endPage: number;
    sections: Array<{
      title: string;
      startPage: number;
      endPage: number;
    }>;
  }>;
  totalPages: number;
  unknown: boolean;
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

  const apiKey = process.env.CLOVA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CLOVA_API_KEY missing" },
      { status: 400 },
    );
  }

  // 프롬프트 — 메타데이터 grounding + JSON 강제 + 모르면 unknown:true.
  // CLOVA 는 responseSchema 가 없어서 프롬프트 레벨에서 JSON 계약 강하게 잡아야 함.
  const systemPrompt = `너는 출판된 한국어 책의 목차를 정확히 기억하는 전문가다.
반드시 JSON 만 출력하라. 설명, 인사, 마크다운 코드 펜스 금지.
형식:
{
  "parts": [
    {
      "index": 1,
      "label": "프롤로그" | "1장" | "PART 1" | "",
      "title": "제목",
      "startPage": 9,
      "endPage": 20,
      "sections": [{ "title": "...", "startPage": 9, "endPage": 20 }]
    }
  ],
  "totalPages": 350,
  "unknown": false
}`;

  const userPrompt = `아래 한국어 책의 목차를 정확히 복원하라.

책 정보:
- 제목: ${body.title}
- 저자: ${body.author ?? "(미상)"}
- 출판사: ${body.publisher ?? "(미상)"}
- 출간: ${body.pubDate ?? "(미상)"}
- ISBN: ${body.isbn13 ?? "(미상)"}
- 총 쪽수: ${body.totalPages ?? "(미상)"}
- 장르: ${body.category ?? "(미상)"}

규칙:
- 실제 한국어 출판본 목차를 기억하는 경우에만 답하라.
- 원서(영문·일문 등) 목차를 번역하지 마라. 번역본은 편집자가 재구성한 경우가 많다.
- 확신 없으면 parts:[] 와 unknown:true 로 응답하라.
- 추측·창작 절대 금지. 기억에 없으면 빈 parts.
- 알고 있다면 모든 챕터/파트를 순서대로 나열하라.
- 프롤로그·에필로그·감사의 글도 포함하라.
- label: 책이 쓰는 호칭 (예: "PART 1", "Chapter 3", "프롤로그"). 없으면 "".
- title: label 을 뺀 내용 제목. label 없으면 전체.
- startPage / endPage: 모르면 근사치로 균등 분배. 총 쪽수 넘지 말 것.
- 하위 섹션 없으면 part 자신을 sections 한 개로.`;

  // HCX-005 엔드포인트 — 2024 개편 후 Bearer 인증.
  // testapp 경로는 테스트 키용. 서비스 키로 바꾸면 /serviceapp/ 로 교체.
  const endpoint =
    "https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-005";

  const reqBody = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    topP: 0.8,
    topK: 0,
    maxTokens: 4096,
    // Gemini 와 동일하게 0 — 환각 줄이고 결정적 응답 유도.
    temperature: 0.0,
    repeatPenalty: 1.0,
    stopBefore: [],
    includeAiFilters: false,
    seed: 0,
  };

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // 요청 추적용 — 선택. UUID 권장이지만 timestamp 로도 충분.
        "X-NCP-CLOVASTUDIO-REQUEST-ID": `rbk-${Date.now()}`,
      },
      body: JSON.stringify(reqBody),
    });
  } catch (err) {
    console.error("[fetch-toc-from-clova] fetch fail", err);
    return NextResponse.json({ error: "network_failed" }, { status: 502 });
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("[fetch-toc-from-clova] upstream", r.status, errText);
    return NextResponse.json(
      { error: "upstream_failed", status: r.status },
      { status: 502 },
    );
  }

  const json = await r.json();

  // CLOVA 응답: { status: {code, message}, result: { message: { content: "..." } } }
  // Gemini 의 candidates[0].content.parts[0].text 와 다른 구조.
  const raw: string = json?.result?.message?.content ?? "{}";
  console.log("[fetch-toc-from-clova] raw response:\n" + raw);

  // CLOVA 는 가끔 ```json ... ``` 펜스 씌워서 주는 경우 있어 stripping.
  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped) as ExtractedToc;
    if (
      parsed.unknown ||
      !Array.isArray(parsed.parts) ||
      parsed.parts.length === 0
    ) {
      console.log("[fetch-toc-from-clova] CLOVA 가 모름", body.title);
      return NextResponse.json({ unknown: true, parts: [], totalPages: 0 });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[fetch-toc-from-clova] parse fail", e, stripped.slice(0, 500));
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}
