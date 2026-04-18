import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const res = await fetch(
    `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(title)}&display=1`,
    {
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
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
