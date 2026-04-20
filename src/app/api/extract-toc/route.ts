import { NextRequest, NextResponse } from "next/server";

// T-37: Gemini Vision 으로 책 목차 이미지를 파트/섹션 JSON 으로 변환.
// 프롬프트는 지시서 고정. 사용자 입력 없이 고정값 → 프롬프트 인젝션 위험 낮음.

// 웹앱에서 "책 목차 json형식으로 정리해줘" 만으로 잘 나왔음 — 같은 톤 재현.
// 스키마 강제·규칙 길게 넣으면 모델이 구조 맞추느라 텍스트를 놓침.
// 후처리(normalizeTocResponse)에서 우리 구조로 변환.
const PROMPT = `책 목차 json형식으로 정리해줘`;

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
    const parsed = JSON.parse(stripped);
    const normalized = normalizeTocResponse(parsed);
    if ((normalized.confidence ?? 0) < 0.4) normalized.warning = "low-confidence";
    return NextResponse.json(normalized);
  } catch (e) {
    console.error("[extract-toc] parse fail", e, stripped);
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }
}

// ── 어댑터 ──────────────────────────────────────────
// Gemini 가 자유 프롬프트에 자주 내뱉는 웹앱 스타일 포맷
//   { book_title, sections: [{ section_title, page } | { section_id, section_title, items: [...] }] }
// 을 우리 포맷
//   { parts: [{ index, title, startPage, endPage, sections: [{title, startPage, endPage}] }] }
// 으로 변환.
// 이미 우리 포맷이면 그대로 통과.

interface RawSectionItem {
  title?: string;
  page?: number;
}
// Gemini 가 프롬프트에 따라 필드명을 바꿔버림 — 별칭 다 받기.
//   (section_title | title) · (section_id | chapter) · (items | subsections | children)
interface RawSection {
  section_id?: string;
  chapter?: string;
  section_title?: string;
  title?: string;
  page?: number;
  items?: RawSectionItem[];
  subsections?: RawSectionItem[];
  children?: RawSectionItem[];
}
interface RawResponse {
  book_title?: string;
  sections?: RawSection[];
  parts?: unknown[];
  totalPages?: number;
  confidence?: number;
}

interface OurSection {
  title: string;
  startPage: number;
  endPage: number;
}
interface OurPart {
  index: number;
  title: string;
  startPage: number;
  endPage: number;
  sections: OurSection[];
}
interface OurResponse {
  parts: OurPart[];
  totalPages: number;
  confidence?: number;
  warning?: string;
}

function normalizeTocResponse(raw: RawResponse): OurResponse {
  // 이미 우리 포맷이면 그대로 반환.
  if (Array.isArray(raw.parts) && raw.parts.length > 0) {
    return raw as unknown as OurResponse;
  }

  const webSections = Array.isArray(raw.sections) ? raw.sections : [];
  if (webSections.length === 0) {
    return { parts: [], totalPages: raw.totalPages ?? 0, confidence: 0 };
  }

  // 웹앱 포맷 → 우리 포맷.
  // 규칙:
  // - items 있으면 파트로 승격, items → sections.
  // - items 없는 최상위(프롤로그·에필로그) 는 단독 파트로 (sections 1개).
  const parts: OurPart[] = [];
  for (const s of webSections) {
    const tag = s.section_id ?? s.chapter ?? "";
    const name = s.section_title ?? s.title ?? "";
    const rawTitle = (tag ? `${tag}: ` : "") + name;
    const title = rawTitle.trim() || "무제";
    const items = s.items ?? s.subsections ?? s.children;
    if (Array.isArray(items) && items.length > 0) {
      const sections: OurSection[] = items.map((it) => ({
        title: it.title ?? "",
        startPage: it.page ?? 0,
        endPage: it.page ?? 0,
      }));
      parts.push({
        index: parts.length + 1,
        title,
        startPage: sections[0].startPage,
        endPage: sections[sections.length - 1].endPage,
        sections,
      });
    } else if (typeof s.page === "number") {
      parts.push({
        index: parts.length + 1,
        title,
        startPage: s.page,
        endPage: s.page,
        sections: [{ title, startPage: s.page, endPage: s.page }],
      });
    }
  }

  // endPage 보정 — 각 섹션/파트의 endPage 를 다음 것의 startPage - 1 로.
  const allSections: OurSection[] = [];
  for (const p of parts) allSections.push(...p.sections);
  for (let i = 0; i < allSections.length - 1; i++) {
    const next = allSections[i + 1];
    allSections[i].endPage = Math.max(
      allSections[i].startPage,
      next.startPage - 1,
    );
  }
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const last = p.sections[p.sections.length - 1];
    if (last) p.endPage = last.endPage;
    p.endPage = Math.max(p.endPage, parts[i + 1].startPage - 1);
  }
  const lastPart = parts[parts.length - 1];
  const totalPages =
    raw.totalPages && raw.totalPages > 0
      ? raw.totalPages
      : lastPart?.endPage ?? 0;

  return {
    parts,
    totalPages,
    confidence: raw.confidence ?? 0.8,
  };
}
