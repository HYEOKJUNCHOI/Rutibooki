import { NextRequest, NextResponse } from "next/server";
import { scrapeKyoboToc } from "@/lib/kyoboScraper";

// 교보 스크래핑 라우트.
// Vercel(AWS) IP 는 교보 CloudFront 가 0-byte 로 차단함.
// 해결: KYOBO_PROXY_URL 환경변수를 걸어서 한국 주거 IP(혁준님 집 PC)에서 도는
// 프록시 스크립트로 요청을 포워딩. 프록시 setup 은 docs/kyobo-proxy-setup.md 참고.
// 프록시 env 없으면 라우트가 직접 스크래핑 — 로컬 dev 에선 정상 동작, 프로덕션에선 fail.

export const maxDuration = 15;

interface Body {
  isbn13?: string;
  totalPages?: number;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.isbn13) {
    return NextResponse.json({ error: "isbn_required" }, { status: 400 });
  }

  // 프록시 모드 — 설정돼 있으면 전부 위임.
  const proxyUrl = process.env.KYOBO_PROXY_URL;
  const proxyToken = process.env.KYOBO_PROXY_TOKEN;
  if (proxyUrl) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // 토큰 등록돼 있으면 헤더에 실어 보냄 — 프록시의 x-proxy-token 검증과 대응.
      if (proxyToken) headers["x-proxy-token"] = proxyToken;
      const r = await fetch(proxyUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          isbn13: body.isbn13,
          totalPages: body.totalPages ?? 0,
        }),
        // 프록시가 혁준님 집 PC 라 ngrok 터널 딜레이 감안 — 12초 컷.
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) {
        console.warn("[fetch-toc-kyobo] proxy !ok", r.status);
        return NextResponse.json(
          { error: "proxy_failed", status: r.status },
          { status: 502 },
        );
      }
      const data = await r.json();
      return NextResponse.json(data);
    } catch (e) {
      console.error("[fetch-toc-kyobo] proxy throw", e);
      return NextResponse.json({ error: "proxy_network" }, { status: 502 });
    }
  }

  // 직접 모드 — 로컬 dev 전용 경로.
  const result = await scrapeKyoboToc(body.isbn13, body.totalPages ?? 0);
  return NextResponse.json(result);
}
