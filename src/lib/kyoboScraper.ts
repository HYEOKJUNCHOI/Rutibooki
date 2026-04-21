// 교보문고 상품페이지 스크래핑 — 공통 로직.
// 한국 주거 IP 에서 돌 때만 CloudFront 통과됨. Vercel/AWS IP 는 0-byte 반환 차단.
// 그래서 이 함수는 두 곳에서 씀:
//   1) /api/fetch-toc-kyobo — 로컬 dev 에서는 동작, 프로덕션(Vercel) 에선 차단됨
//   2) scripts/kyobo-proxy.mjs — 혁준님 집 PC 에서 상시 구동 → Vercel 이 이걸 프록시로 호출

const BASE_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Sec-Ch-Ua": '"Chromium";v="120", "Not(A:Brand";v="24", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function extractCookies(setCookieHeader: string | null): string {
  if (!setCookieHeader) return "";
  return setCookieHeader
    .split(/,(?=\s*[A-Za-z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

export interface KyoboSection {
  title: string;
  startPage: number;
  endPage: number;
}
export interface KyoboPart {
  index: number;
  label: string;
  title: string;
  startPage: number;
  endPage: number;
  sections: KyoboSection[];
}

export interface KyoboScrapeResult {
  unknown: boolean;
  parts: KyoboPart[];
  totalPages: number;
  source?: string;
  productCode?: string;
  error?: string;
}

export async function scrapeKyoboToc(
  isbn13: string,
  totalPages = 0,
): Promise<KyoboScrapeResult> {
  if (!isbn13) return { unknown: true, parts: [], totalPages: 0, error: "isbn_required" };

  // 1단계: ISBN 검색 → 상품코드 + 세션 쿠키.
  const searchUrl = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(
    isbn13,
  )}&gbCode=TOT&target=total`;
  let productCode: string | null = null;
  let sessionCookie = "";
  try {
    const r = await fetch(searchUrl, {
      headers: {
        ...BASE_BROWSER_HEADERS,
        "Sec-Fetch-Site": "none",
        Referer: "https://www.kyobobook.co.kr/",
      },
    });
    if (!r.ok) {
      return { unknown: true, parts: [], totalPages: 0, error: `search_status_${r.status}` };
    }
    sessionCookie = extractCookies(r.headers.get("set-cookie"));
    const html = await r.text();
    const m = html.match(/product\.kyobobook\.co\.kr\/detail\/([A-Z0-9]+)/);
    if (m) productCode = m[1];
  } catch (e) {
    console.error("[kyobo-scraper] search throw", e);
    return { unknown: true, parts: [], totalPages: 0, error: "search_network" };
  }
  if (!productCode) return { unknown: true, parts: [], totalPages: 0 };

  // 2단계: 상품페이지 — 검색 쿠키+Referer 로 CloudFront 우회.
  const productUrl = `https://product.kyobobook.co.kr/detail/${productCode}`;
  let productHtml = "";
  try {
    const productHeaders: Record<string, string> = {
      ...BASE_BROWSER_HEADERS,
      "Sec-Fetch-Site": "same-site",
      Referer: searchUrl,
    };
    if (sessionCookie) productHeaders.Cookie = sessionCookie;
    const r = await fetch(productUrl, { headers: productHeaders });
    if (!r.ok) {
      return {
        unknown: true,
        parts: [],
        totalPages: 0,
        error: `product_status_${r.status}`,
      };
    }
    productHtml = await r.text();
  } catch (e) {
    console.error("[kyobo-scraper] product throw", e);
    return { unknown: true, parts: [], totalPages: 0, error: "product_network" };
  }

  if (productHtml.length === 0) {
    // CloudFront 0-byte 차단. 호출측이 프록시 경유로 재시도 여부 판단.
    return {
      unknown: true,
      parts: [],
      totalPages: 0,
      error: "blocked_by_cloudfront",
      productCode,
    };
  }

  // 3단계: <li class="book_contents_item"> 안쪽 텍스트.
  const liMatch = productHtml.match(
    /<li class="book_contents_item">([\s\S]*?)<\/li>/,
  );
  if (!liMatch) {
    return { unknown: true, parts: [], totalPages: 0, productCode };
  }
  const tocText = liMatch[1]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  // 4단계: 줄 단위 파싱.
  const parts: KyoboPart[] = [];
  const lines = tocText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let index = 0;
  for (const line of lines) {
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (/^[-–—]\s*/.test(line)) {
      const sectionText = line.replace(/^[-–—]\s*/, "").trim();
      if (parts.length > 0) {
        parts[parts.length - 1].sections.push({
          title: sectionText,
          startPage: 0,
          endPage: 0,
        });
      }
      continue;
    }
    if (numMatch) {
      index++;
      parts.push({
        index,
        label: numMatch[1],
        title: numMatch[2].trim(),
        startPage: 0,
        endPage: 0,
        sections: [],
      });
      continue;
    }
    const labelMatch = line.match(
      /^(서문|서론|프롤로그|에필로그|머리말|맺음말|들어가며|나오며|감사의 글|감사의말|감사의\s*글|추천사|추천의\s*글|주석|주|부록|참고문헌|옮긴이의?\s*말|옮긴이\s*후기|번역과\s*관련하여|후기|개정판\s*서문|독자에게|저자의\s*말|들어가는\s*글)\s*(.*)$/,
    );
    index++;
    if (labelMatch) {
      parts.push({
        index,
        label: labelMatch[1].trim(),
        title: labelMatch[2].trim() || labelMatch[1].trim(),
        startPage: 0,
        endPage: 0,
        sections: [],
      });
    } else {
      parts.push({
        index,
        label: "",
        title: line,
        startPage: 0,
        endPage: 0,
        sections: [],
      });
    }
  }

  // 5단계: 페이지 균등 분배.
  const total = totalPages ?? 0;
  if (total > 0 && parts.length > 0) {
    const per = Math.floor(total / parts.length);
    let cursor = 1;
    parts.forEach((p, i) => {
      p.startPage = cursor;
      p.endPage = i === parts.length - 1 ? total : cursor + per - 1;
      cursor = p.endPage + 1;
      if (p.sections.length > 0) {
        const secPer = Math.max(
          1,
          Math.floor((p.endPage - p.startPage + 1) / p.sections.length),
        );
        let secCursor = p.startPage;
        p.sections.forEach((s, si) => {
          s.startPage = secCursor;
          s.endPage =
            si === p.sections.length - 1 ? p.endPage : secCursor + secPer - 1;
          secCursor = s.endPage + 1;
        });
      } else {
        p.sections.push({
          title: p.title,
          startPage: p.startPage,
          endPage: p.endPage,
        });
      }
    });
  } else {
    parts.forEach((p) => {
      if (p.sections.length === 0) {
        p.sections.push({ title: p.title, startPage: 0, endPage: 0 });
      }
    });
  }

  if (parts.length === 0) {
    return { unknown: true, parts: [], totalPages: total, productCode };
  }
  return {
    unknown: false,
    parts,
    totalPages: total,
    source: "kyobo",
    productCode,
  };
}
