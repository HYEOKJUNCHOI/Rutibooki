import { NextRequest, NextResponse } from "next/server";

// 알라딘 ItemLookUp — ISBN 으로 목차 HTML 을 받아온다.
// Gemini Vision 대비 정확도·비용 모두 유리. 출판사 등록본이라 페이지 번호가 정확.
// 실패 시 빈 toc 반환 → 상위 흐름에서 Gemini Vision 으로 fallback.

interface AladinLookupResponse {
  item?: Array<{
    isbn13?: string;
    title?: string;
    author?: string;
    publisher?: string;
    cover?: string;
    subInfo?: {
      toc?: string;
      itemPage?: number;
    };
  }>;
  errorCode?: number;
  errorMessage?: string;
}

export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get("isbn")?.trim();
  if (!isbn) {
    return NextResponse.json({ error: "isbn_required" }, { status: 400 });
  }

  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) {
    return NextResponse.json({ toc: "", skipped: "no_key" });
  }

  const url =
    `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx` +
    `?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&itemIdType=ISBN13` +
    `&ItemId=${encodeURIComponent(isbn)}` +
    `&output=js` +
    `&Version=20131101` +
    // Toc: 목차 HTML, Packing: itemPage(총쪽수). 둘 다 대문자 시작 — 알라딘 문서 표기 기준.
    // 이전 "packing" 소문자 버전은 itemPage 가 종종 0 으로 리턴되던 원인.
    `&OptResult=Toc,Packing`;

  let r: Response;
  try {
    r = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error("[fetch-toc] network fail", err);
    return NextResponse.json({ toc: "", error: "network_failed" });
  }

  if (!r.ok) {
    return NextResponse.json({
      toc: "",
      error: "upstream_failed",
      status: r.status,
    });
  }

  const raw = await r.text();
  let data: AladinLookupResponse;
  try {
    data = JSON.parse(stripJsonpWrapper(raw));
  } catch {
    return NextResponse.json({ toc: "", error: "parse_failed" });
  }

  if (data.errorCode) {
    return NextResponse.json({ toc: "", error: data.errorMessage });
  }

  const item = data.item?.[0];
  if (!item) {
    return NextResponse.json({ toc: "", error: "no_match" });
  }
  const toc = item.subInfo?.toc ?? "";
  const itemPage = Number(item.subInfo?.itemPage ?? 0) || 0;

  return NextResponse.json({
    toc,
    itemPage,
    title: item.title ?? "",
    author: item.author ?? "",
    publisher: item.publisher ?? "",
    cover: item.cover ?? "",
    isbn13: item.isbn13 ?? "",
  });
}

function stripJsonpWrapper(raw: string): string {
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}
