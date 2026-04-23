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
import { spawn } from "node:child_process";

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

  // 파서 — src/lib/kyoboScraper.ts 와 동기화. 원본 주석 참조.
  const parts = [];
  const lines = tocText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  // [2026-04-22] AI 하이브리드 파서 프로토타입용 — 파서 진입 전 줄 배열을 응답에 포함.
  const rawLines = lines.slice();

  const QUOTE_PREFIX = /^[""''""‹›«»„‚"'„‟""‹›]/;
  const DASH_PREFIX = /^[-‐‑‒–—―]\s*/;
  const SENTENCE_END = /[.!?。!?．]\s*$/;
  const MULTI_SENTENCE = /[.!?。!?．]\s+\S/;
  const BU_PATTERN = /^(제?\s*\d+\s*부)\s*[:\s]?\s*(.+)$/;
  // [2026-04-22] 4단계 목차 — LEVEL=대파트, BUTTON=섹션, SPECIAL=프롤로그/에필로그급.
  const LEVEL_HEADER = /^LEVEL\s+(\d+)\s*[:：]\s*(.+)$/;
  const BUTTON_HEADER = /^BUTTON\s+(\d+)\s*[.。]\s*(.+)$/;
  const SPECIAL_HEADER = /^(START|END|ERROR)\s*[:：]\s*(.+)$/;
  const LABEL_PATTERN = /^(출간\s*\d+주년\s*기념\s*특별\s*서문|특별\s*서문|개정판\s*서문|서문|서론|프롤로그|에필로그|머리말|맺음말|들어가며|나오며|들어가는\s*글|감사의\s*글|감사의말|추천사|추천의\s*글|주석|부록|참고문헌|찾아보기|옮긴이의?\s*말|옮긴이\s*후기|번역과\s*관련하여|후기|독자에게|저자의\s*말|역사연대표)\s*[_:\-\s]*\s*(.*)$/;
  // [2026-04-22] 한국어 짧은 챕터 제목(예: "탓하기"·"불안") 보호 — 구분자뿐인 줄만 노이즈.
  const NOISE_PATTERN = /^[-‐‑‒–—―=·•\s]+$/;

  function isEpigraph(line, prevPart) {
    if (QUOTE_PREFIX.test(line)) return true;
    if (!SENTENCE_END.test(line)) return false;
    if (MULTI_SENTENCE.test(line)) return true;
    if (line.length >= 30) return true;
    if (prevPart && /^\d+$/.test(prevPart.label)) return true;
    return false;
  }

  // [2026-04-22] 4단계 목차 subtitle 흡수용 — 인덱스 루프. 원본 TS 와 동일 로직.
  function isStructuralHeader(s) {
    return (
      LEVEL_HEADER.test(s) ||
      BUTTON_HEADER.test(s) ||
      SPECIAL_HEADER.test(s) ||
      /^\d+\.\s+/.test(s) ||
      BU_PATTERN.test(s) ||
      LABEL_PATTERN.test(s) ||
      DASH_PREFIX.test(s)
    );
  }
  function canAbsorbSubtitle(next) {
    if (!next) return false;
    const t = next.trim();
    if (!t) return false;
    if (NOISE_PATTERN.test(t)) return false;
    if (isStructuralHeader(t)) return false;
    if (QUOTE_PREFIX.test(t)) return false;
    if (t.length > 60) return false;
    if (SENTENCE_END.test(t)) return false;
    return true;
  }

  let index = 0;
  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li];
    const line = rawLine.trim();
    if (!line) continue;

    // 0. 노이즈 스킵 — 구분자/공백뿐인 줄만.
    if (NOISE_PATTERN.test(line)) continue;

    // ── 4단계 목차 분기 (LEVEL / BUTTON / SPECIAL) ──
    const levelMatch = line.match(LEVEL_HEADER);
    if (levelMatch) {
      index++;
      const p = {
        index,
        label: `LEVEL ${levelMatch[1]}`,
        title: levelMatch[2].trim(),
        startPage: 0,
        endPage: 0,
        sections: [],
      };
      if (canAbsorbSubtitle(lines[li + 1])) {
        p.subtitle = lines[li + 1].trim();
        li++;
      }
      parts.push(p);
      continue;
    }
    const buttonMatch = line.match(BUTTON_HEADER);
    if (buttonMatch) {
      const sec = {
        title: buttonMatch[2].trim(),
        startPage: 0,
        endPage: 0,
        label: `BUTTON ${buttonMatch[1]}`,
      };
      if (canAbsorbSubtitle(lines[li + 1])) {
        sec.subtitle = lines[li + 1].trim();
        li++;
      }
      if (parts.length > 0) {
        parts[parts.length - 1].sections.push(sec);
      } else {
        index++;
        parts.push({
          index,
          label: sec.label ?? "",
          title: sec.title,
          startPage: 0,
          endPage: 0,
          sections: [],
          subtitle: sec.subtitle,
        });
      }
      continue;
    }
    const specialMatch = line.match(SPECIAL_HEADER);
    if (specialMatch) {
      index++;
      const p = {
        index,
        label: specialMatch[1],
        title: specialMatch[2].trim(),
        startPage: 0,
        endPage: 0,
        sections: [],
      };
      if (canAbsorbSubtitle(lines[li + 1])) {
        p.subtitle = lines[li + 1].trim();
        li++;
      }
      parts.push(p);
      continue;
    }

    // 1. 대시 접두 — 섹션 병합.
    if (DASH_PREFIX.test(line)) {
      const sectionText = line.replace(DASH_PREFIX, "").trim();
      if (parts.length > 0 && sectionText) {
        parts[parts.length - 1].sections.push({
          title: sectionText,
          startPage: 0,
          endPage: 0,
        });
      }
      continue;
    }

    // 2. 숫자 챕터.
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
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

    // 3. 에피그래프 — 직전 챕터 섹션 병합.
    if (isEpigraph(line, parts[parts.length - 1]) && parts.length > 0) {
      const clean = line
        .replace(QUOTE_PREFIX, "")
        .replace(/[""''""]+\s*$/, "")
        .trim();
      parts[parts.length - 1].sections.push({
        title: clean || line,
        startPage: 0,
        endPage: 0,
      });
      continue;
    }

    // 4. "제N부 X".
    const buMatch = line.match(BU_PATTERN);
    if (buMatch) {
      index++;
      parts.push({
        index,
        label: buMatch[1].replace(/\s+/g, " ").trim(),
        title: buMatch[2].trim(),
        startPage: 0,
        endPage: 0,
        sections: [],
      });
      continue;
    }

    // 5. 알려진 라벨.
    const labelMatch = line.match(LABEL_PATTERN);
    if (labelMatch) {
      index++;
      const label = labelMatch[1].replace(/\s+/g, " ").trim();
      const rest = labelMatch[2].trim();
      parts.push({
        index,
        label: rest ? label : "",
        title: rest || label,
        startPage: 0,
        endPage: 0,
        sections: [],
      });
      continue;
    }

    // 6. 기타 — 독립 PART.
    index++;
    parts.push({
      index,
      label: "",
      title: line,
      startPage: 0,
      endPage: 0,
      sections: [],
    });
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
    return { unknown: true, parts: [], totalPages: total, productCode, rawLines };
  }
  return {
    unknown: false,
    parts,
    totalPages: total,
    source: "kyobo",
    productCode,
    rawLines,
  };
}

// ── HTTP 서버 ──────────────────────────────────────────────
const PORT = Number(process.env.KYOBO_PROXY_PORT) || 5678;
// 공유 시크릿 — Vercel 라우트가 x-proxy-token 헤더로 같은 값 보낼 때만 통과.
// 미설정이면 경고만 찍고 인증 생략 (로컬 개발용 fallback).
const PROXY_TOKEN = process.env.KYOBO_PROXY_TOKEN || "";

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

  // 시크릿 토큰 검사 — 설정돼 있을 때만.
  if (PROXY_TOKEN) {
    const got = req.headers["x-proxy-token"];
    if (got !== PROXY_TOKEN) {
      console.warn("[kyobo-proxy] ✗ bad token from", req.socket.remoteAddress);
      return sendJson(res, 401, { error: "unauthorized" });
    }
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
  if (PROXY_TOKEN) {
    console.log(`[kyobo-proxy] 🔒 token auth enabled (len=${PROXY_TOKEN.length})`);
  } else {
    console.warn("[kyobo-proxy] ⚠ KYOBO_PROXY_TOKEN 미설정 — 인증 없음");
  }
  console.log(`[kyobo-proxy] test: curl -X POST http://localhost:${PORT} -H "Content-Type: application/json" -d '{"isbn13":"9788934972464"}'`);
  startNgrok();
});

// ── ngrok 자식 프로세스 ─────────────────────────────────────
// KYOBO_NGROK_DOMAIN 이 박혀 있으면 ngrok 도 여기서 같이 띄움 — 터미널 하나로 끝.
// 없으면 순수 프록시만 돌고 사용자가 별도 창에서 ngrok 띄우는 모드.
function startNgrok() {
  const domain = process.env.KYOBO_NGROK_DOMAIN;
  if (!domain) {
    console.log("[ngrok] KYOBO_NGROK_DOMAIN 미설정 — ngrok 자동 기동 생략.");
    return;
  }

  // Windows 는 shell:true 필요 (ngrok.exe / ngrok.cmd 모두 PATH 경유 해석).
  const child = spawn("ngrok", ["http", `--domain=${domain}`, String(PORT)], {
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const prefix = "[ngrok]";
  const relay = (stream) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);
        if (line.trim()) console.log(`${prefix} ${line}`);
      }
    });
  };
  relay(child.stdout);
  relay(child.stderr);

  child.on("exit", (code) => {
    console.error(`${prefix} exited code=${code} — 프록시도 종료합니다.`);
    process.exit(code ?? 1);
  });
  child.on("error", (e) => {
    console.error(`${prefix} spawn error`, e.message);
  });

  // 프록시 먼저 죽으면 ngrok 도 같이 정리.
  const killChild = () => {
    if (!child.killed) child.kill();
  };
  process.on("SIGINT", () => {
    killChild();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    killChild();
    process.exit(0);
  });
  process.on("exit", killChild);

  console.log(`[ngrok] spawning with --domain=${domain} → :${PORT}`);
}
