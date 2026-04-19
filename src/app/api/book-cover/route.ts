import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  // non-null 단언(!) 대신 런타임 체크 — 환경변수 미설정 시 500 대신 400 으로 명시.
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    return NextResponse.json({ error: "Naver creds missing" }, { status: 400 });
  }

  const res = await fetch(
    `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(title)}&display=1`,
    {
      headers: {
        "X-Naver-Client-Id": id,
        "X-Naver-Client-Secret": secret,
      },
    }
  );

  const data = await res.json();
  const item = data.items?.[0];

  return NextResponse.json({
    image: item?.image ?? null,
    title: item?.title ?? title,
    author: item?.author ?? "",
  });
}
