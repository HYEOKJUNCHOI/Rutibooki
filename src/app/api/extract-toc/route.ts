import { NextRequest, NextResponse } from "next/server";

// T-37: Gemini Vision 으로 책 목차 이미지를 파트/섹션 JSON 으로 변환.
// 프롬프트는 지시서 고정. 사용자 입력 없이 고정값 → 프롬프트 인젝션 위험 낮음.

// responseSchema 로 구조 고정 → 어댑터 복잡성 제거.
// 프롬프트는 지침 최소 + 스키마가 구조를 강제.
const PROMPT = `이 이미지들은 한 권의 책 목차입니다. 페이지 순서대로 모든 항목을 추출해 스키마에 맞춰 주세요.
- parts: 최상위 단위(장/파트/챕터). 프롤로그·에필로그도 parts 로 취급.
- part.label: 책이 실제로 쓰는 파트 호칭(예: "나침반 1", "Chapter 3", "PART II", "프롤로그"). 책에 호칭이 없으면 빈 문자열.
- part.title: 파트의 내용 제목(label 을 제외한 본문). label 이 없는 파트는 제목 전체를 title 에 넣어주세요.
- 각 part.sections: 하위 항목(절/섹션). 하위가 없으면 파트 자기 자신을 하나의 section 으로 넣어주세요.
- startPage: 해당 항목이 시작하는 페이지 숫자. endPage 는 알면 적고 모르면 startPage 와 같게.
- totalPages: 목차에서 마지막 항목의 페이지(또는 책 전체 페이지 수).
- 원문 텍스트 그대로, 추측 금지, 누락 금지.`;

// Gemini structured output 스키마 — parts[] 만 받음. 래퍼/별칭 전부 차단.
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
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  // gemini-flash-latest alias — 구글이 최신 Flash(현재 2.5, 나오면 3.0+) 로 자동 연결.
  // 2.5-flash 로 고정하면 향후 업그레이드 수동 반영 필요.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

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
  const text: string =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  // 응답 원문을 항상 로그 — 짧은 프롬프트 실험 중 Gemini 가 내뱉는 구조 확인용.
  console.log("[extract-toc] raw response:\n" + text);

  // 짧은 프롬프트는 ```json 펜스로 감싸서 오기도 함 → 벗겨내기.
  const stripped = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped) as OurResponse;
    // 스키마가 Gemini 단에서 구조 강제 — 여기는 최소 검증만.
    if (!Array.isArray(parsed.parts) || parsed.parts.length === 0) {
      console.error("[extract-toc] empty parts", stripped);
      return NextResponse.json({ error: "empty_parts" }, { status: 422 });
    }
    // index 가 비어오면 채워줌(스키마상 required 지만 방어).
    parsed.parts.forEach((p, i) => {
      if (typeof p.index !== "number") p.index = i + 1;
    });
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("[extract-toc] parse fail", e, stripped);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}

// Gemini responseSchema 로 강제한 출력 구조.
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
