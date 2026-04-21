// 교보 스크래핑 프록시 — 혁준님 집 PC 에서 상시 구동.
// Vercel(AWS) IP 는 교보 CloudFront 가 차단해서, 한국 주거 IP 에서 도는
// 이 프록시를 ngrok 등으로 터널링해 Vercel 이 KYOBO_PROXY_URL 로 호출.
//
// 실행:  node scripts/kyobo-proxy.mjs
// 기본 포트 5678. 환경변수 KYOBO_PROXY_PORT 로 변경 가능.
//
// TypeScript 원본(src/lib/kyoboScraper.ts)을 그대로 재사용하기 위해 .mjs 는
// 런타임에 가벼운 JS 포트를 인라인 유지. 원본이 바뀌면 이 파일도 동기화 필요.
// (공용 로직을 두 곳에 두는 건 번거롭지만, 프록시는 tsx/빌드 없이 돌리는 게 우선.)

import http from "node:http";

const BASE_BROWSER_HEADERS = {
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

function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return "";
  return setCookieHeader
    .split(/,(?=\s*[A-Za-z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function scrapeKyoboToc(isbn13, totalPages = 0) {
  if (!isbn13) return { unknown: true, parts: [], totalPages: 0, error: "isbn_required" };

  const searchUrl = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(
    isbn13,
  )}&gbCode=TOT&target=total`;
  let productCode = null;
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
    console.error("[kyobo-proxy] search throw", e);
    return { unknown: true, parts: [], totalPages: 0, error: "search_network" };
  }
  if (!productCode) return { unknown: true, parts: [], totalPages: 0 };

  const productUrl = `https://product.kyobobook.co.kr/detail/${productCode}`;
  let productHtml = "";
  try {
    const productHeaders = {
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
    console.error("[kyobo-proxy] product throw", e);
    return { unknown: true, parts: [], totalPages: 0, error: "product_network" };
  }

  if (productHtml.length === 0) {
    return {
      unknown: true,
      parts: [],
      totalPages: 0,
      error: "blocked_by_cloudfront",
      productCode,
    };
  }

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

  const parts = [];
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

// ── HTTP 서버 ──────────────────────────────────────────────
const PORT = Number(process.env.KYOBO_PROXY_PORT) || 5678;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // 1MB 상한 — 악의적 요청 차단.
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error("body_too_large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    // 프록시라 CORS 열어도 됨 (Vercel 에서만 호출).
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  // 헬스체크.
  if (req.method === "GET" && req.url === "/") {
    return sendJson(res, 200, { ok: true, service: "kyobo-proxy" });
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "invalid_json" });
  }

  const isbn13 = body?.isbn13;
  if (!isbn13) return sendJson(res, 400, { error: "isbn_required" });
  const totalPages = Number(body?.totalPages) || 0;

  console.log(`[kyobo-proxy] ← ISBN ${isbn13} (total=${totalPages})`);
  try {
    const result = await scrapeKyoboToc(isbn13, totalPages);
    console.log(
      `[kyobo-proxy] → ${result.unknown ? "unknown" : `${result.parts.length} parts`}` +
        (result.error ? ` err=${result.error}` : ""),
    );
    return sendJson(res, 200, result);
  } catch (e) {
    console.error("[kyobo-proxy] fatal", e);
    return sendJson(res, 500, { error: "internal" });
  }
});

server.listen(PORT, () => {
  console.log(`[kyobo-proxy] listening on :${PORT}`);
  console.log(`[kyobo-proxy] test: curl -X POST http://localhost:${PORT} -H "Content-Type: application/json" -d '{"isbn13":"9788934972464"}'`);
});
