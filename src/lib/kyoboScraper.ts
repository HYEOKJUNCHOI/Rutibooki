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
  // 섹션 라벨(예: "BUTTON 14"). 4단계 목차에서만 채워짐. 2/1단계는 생략.
  label?: string;
  // 섹션 부제목 — 4단계 목차의 BUTTON 제목 다음 줄.
  subtitle?: string;
}
export interface KyoboPart {
  index: number;
  label: string;
  title: string;
  startPage: number;
  endPage: number;
  sections: KyoboSection[];
  // 대파트 부제목 — 4단계 목차(LEVEL N) 의 제목 다음 줄.
  subtitle?: string;
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
  //
  // 핵심 판별 키 — 교보 목차는 "챕터 사이 경구(에피그래프)"를 자주 끼워넣음.
  //   챕터 제목:  "평화가 혼돈의 씨앗을 뿌린다"     ← 마침표 없음
  //   경구/인용:  "미친 듯한 과열은 정상이다. ~"   ← 마침표 있음
  // 또는 따옴표로 시작하는 인용구도 경구.
  // 경구는 직전 챕터의 section 으로 흡수해서 PART 카운트에서 제외.
  const parts: KyoboPart[] = [];
  const lines = tocText.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const QUOTE_PREFIX = /^[""''""‹›«»„‚"'„‟""‹›]/;
  const DASH_PREFIX = /^[-‐‑‒–—―]\s*/;
  const SENTENCE_END = /[.!?。!?．]\s*$/;
  // 다중 문장 신호 — 마침표+공백+한글/영문 (prose 의 결정적 단서).
  const MULTI_SENTENCE = /[.!?。!?．]\s+\S/;
  // "제1부 인지혁명", "1부 인지혁명" 형태.
  const BU_PATTERN = /^(제?\s*\d+\s*부)\s*[:\s]?\s*(.+)$/;
  // [2026-04-22] 4단계 목차 (완벽한 원시인 등) — LEVEL N / BUTTON N / START·END·ERROR.
  // LEVEL = 대파트(BookPart), BUTTON = 섹션(sections[i]), SPECIAL = 프롤로그/에필로그급 대파트.
  const LEVEL_HEADER = /^LEVEL\s+(\d+)\s*[:：]\s*(.+)$/;
  const BUTTON_HEADER = /^BUTTON\s+(\d+)\s*[.。]\s*(.+)$/;
  const SPECIAL_HEADER = /^(START|END|ERROR)\s*[:：]\s*(.+)$/;
  // 알려진 라벨 — 서문·프롤로그·부록 등. 라벨 뒤에 내용 붙는 경우 많음.
  const LABEL_PATTERN = /^(출간\s*\d+주년\s*기념\s*특별\s*서문|특별\s*서문|개정판\s*서문|서문|서론|프롤로그|에필로그|머리말|맺음말|들어가며|나오며|들어가는\s*글|감사의\s*글|감사의말|추천사|추천의\s*글|주석|부록|참고문헌|찾아보기|옮긴이의?\s*말|옮긴이\s*후기|번역과\s*관련하여|후기|독자에게|저자의\s*말|역사연대표)\s*[_:\-\s]*\s*(.*)$/;
  // 진짜 노이즈만 — 구분자·공백뿐인 줄, 또는 1-2자 단독 토큰.
  // [2026-04-22] 기존 \S{0,4} 는 "탓하기"(3자) 같은 한국어 챕터 제목까지 먹어서 축소.
  const NOISE_PATTERN = /^[-‐‑‒–—―=·•\s]+$/;

  function isEpigraph(line: string, prevPart: KyoboPart | undefined): boolean {
    // 따옴표 시작 — 에피그래프 확정.
    if (QUOTE_PREFIX.test(line)) return true;
    if (!SENTENCE_END.test(line)) return false;
    // 다중 문장 = prose 확정 (예: "정상이다. 더 미친...").
    if (MULTI_SENTENCE.test(line)) return true;
    // 충분히 길면(30자+) prose 가능성 높음.
    if (line.length >= 30) return true;
    // 직전이 번호 챕터(label 이 숫자) 면 그 챕터의 경구로 간주.
    if (prevPart && /^\d+$/.test(prevPart.label)) return true;
    // 짧은 ? 종결 (예: "왜 지금은 못 하는가?") 은 챕터 제목 가능성 — epigraph 거부.
    return false;
  }

  // [2026-04-22] "다음 라인을 subtitle 로 흡수" 규칙 때문에 인덱스 루프로 전환.
  // 흡수 조건: 다음 라인이 epigraph 아니고 LEVEL/BUTTON/SPECIAL/숫자챕터/제N부/라벨 도 아니며
  // 60자 이하 + 마침표로 안 끝남(부제는 보통 짧고 마침표 없음).
  // 기존 2단계 흐름 영향 없도록 LEVEL/BUTTON/SPECIAL 매치된 경우에만 흡수 시도.
  function isStructuralHeader(s: string): boolean {
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
  function canAbsorbSubtitle(next: string | undefined): boolean {
    if (!next) return false;
    const t = next.trim();
    if (!t) return false;
    if (NOISE_PATTERN.test(t)) return false;
    if (isStructuralHeader(t)) return false;
    if (QUOTE_PREFIX.test(t)) return false; // 인용/에피그래프는 부제 아님.
    if (t.length > 60) return false;
    if (SENTENCE_END.test(t)) return false;
    return true;
  }

  let index = 0;
  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li];
    const line = rawLine.trim();
    if (!line) continue;

    // 0. 꼬리 노이즈 스킵 — 구분자/공백뿐인 줄만.
    if (NOISE_PATTERN.test(line)) continue;

    // ── 4단계 목차 분기 (완벽한 원시인 등) ──
    // LEVEL N: 제목  →  새 대파트. 다음 줄이 subtitle 조건 맞으면 흡수.
    const levelMatch = line.match(LEVEL_HEADER);
    if (levelMatch) {
      index++;
      const p: KyoboPart = {
        index,
        label: `LEVEL ${levelMatch[1]}`,
        title: levelMatch[2].trim(),
        startPage: 0,
        endPage: 0,
        sections: [],
      };
      if (canAbsorbSubtitle(lines[li + 1])) {
        p.subtitle = lines[li + 1].trim();
        li++; // 다음 라인 소비.
      }
      parts.push(p);
      continue;
    }
    // BUTTON N. 제목 → 현재 대파트의 섹션. 대파트 없으면 독립 섹션으로 새 파트 생성 방지
    // → 그대로 기타 분기로 떨어뜨리지 않고, 안전하게 라벨 없는 파트로 승격.
    const buttonMatch = line.match(BUTTON_HEADER);
    if (buttonMatch) {
      const sec: KyoboSection = {
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
        // 대파트 없이 BUTTON 만 떠 있는 상황 — 드물지만 방어적으로 자체 파트화.
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
    // START: / END: / ERROR: → 프롤로그/에필로그급 대파트. 원문 키워드 유지.
    const specialMatch = line.match(SPECIAL_HEADER);
    if (specialMatch) {
      index++;
      const p: KyoboPart = {
        index,
        label: specialMatch[1], // START / END / ERROR 원문.
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

    // 1. 대시 접두 — 전통적인 epigraph 표기. 섹션 병합.
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

    // 2. 숫자 챕터 — "1. 제목".
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

    // 3. 에피그래프 (따옴표 시작 / 마침표 종결) — 직전 챕터 섹션으로.
    //    직전 챕터가 없으면(예: 맨 앞) 독립 PART 로 떨어뜨림.
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

    // 4. "제N부 X" 패턴.
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

    // 5. 알려진 라벨 (서문 / 감사의 글 / 부록 등).
    const labelMatch = line.match(LABEL_PATTERN);
    if (labelMatch) {
      index++;
      const label = labelMatch[1].replace(/\s+/g, " ").trim();
      const rest = labelMatch[2].trim();
      // 라벨만 단독이면 라벨을 title 로 두고 label 은 비움 — UI 중복 표시 방지.
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

    // 6. 기타 — 독립 PART (역사연대표 같은 무라벨 항목).
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
