import { NextRequest, NextResponse } from "next/server";
import { AladinBook } from "@/types/aladin";
import { normalizeAuthors, stripSubtitle } from "@/utils/aladinNormalize";

// 알라딘 ItemSearch.aspx 프록시. 표지 OCR 결과(제목)로 백그라운드 자동 호출용.
// ttbkey 는 서버에만 두기 위해 프록시로 분리 — 클라이언트 노출 금지.
// 응답 1순위는 보통 가장 관련도 높은 책. 실패 시 빈 items[] 반환 (graceful).

const MAX_RESULTS = 3;

interface AladinSearchResponse {
  item?: AladinRawItem[];
  errorCode?: number;
  errorMessage?: string;
}

interface AladinRawItem {
  title?: string;
  author?: string;
  publisher?: string;
  isbn13?: string;
  cover?: string;
  pubDate?: string;
  subInfo?: { itemPage?: number };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q_required" }, { status: 400 });
  }

  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) {
    // 키 없으면 메타 보강 자체를 스킵 — 앱이 죽으면 안 됨.
    return NextResponse.json({ items: [], skipped: "no_key" });
  }

  const url =
    `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx` +
    `?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&Query=${encodeURIComponent(q)}` +
    `&QueryType=Keyword` +
    `&MaxResults=${MAX_RESULTS}` +
    `&SearchTarget=Book` +
    `&output=js` +
    `&Version=20131101` +
    // 쪽수(itemPage) 가 packing OptResult 에 들어 있다.
    `&OptResult=packing`;

  let r: Response;
  try {
    r = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error("[search-book] fetch fail", err);
    return NextResponse.json({ items: [], error: "network_failed" });
  }

  if (!r.ok) {
    return NextResponse.json({
      items: [],
      error: "upstream_failed",
      status: r.status,
    });
  }

  const raw = await r.text();
  let data: AladinSearchResponse;
  try {
    data = JSON.parse(stripJsonpWrapper(raw));
  } catch {
    return NextResponse.json({ items: [], error: "parse_failed" });
  }

  if (data.errorCode) {
    return NextResponse.json({ items: [], error: data.errorMessage });
  }

  const items: AladinBook[] = (data.item ?? [])
    .map(normalizeItem)
    .filter((b) => b.isbn13.length === 13);

  return NextResponse.json({ items });
}

function normalizeItem(item: AladinRawItem): AladinBook {
  return {
    isbn13: String(item.isbn13 ?? ""),
    title: stripSubtitle(String(item.title ?? "")),
    author: normalizeAuthors(String(item.author ?? "")),
    publisher: String(item.publisher ?? "").trim(),
    cover: String(item.cover ?? ""),
    pubDate: String(item.pubDate ?? ""),
    itemPage: Number(item.subInfo?.itemPage ?? 0) || 0,
  };
}

// 일부 알라딘 응답이 `callback({...})` JSONP 형태로 와서 괄호 벗겨낸다.
function stripJsonpWrapper(raw: string): string {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}
