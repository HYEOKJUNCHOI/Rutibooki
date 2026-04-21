import { NextRequest, NextResponse } from "next/server";

// 교보문고 상품페이지 스크래핑으로 목차 복원.
// LLM 환각 제로, 비용 0원, 1~2초. 출판사가 직접 입력한 실제 인쇄 목차.
// 2단계: (1) ISBN → 상품코드 찾기 (2) 상품페이지 HTML → 목차 <li> 파싱.
//
// 리스크: 교보가 페이지 리뉴얼하면 셀렉터 깨짐 → 3~6개월 주기 점검 필요.
// robots.txt 정책상 개인 사용 범위 내 허용. 상업 대량 배포 시 재검토.

export const maxDuration = 15;

// User-Agent 는 일반 크롬. CloudFront 가 UA·Accept-Language 없으면 200 빈 응답 반환.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  Referer: "https://search.kyobobook.co.kr/",
};

interface Body {
  isbn13: string;
  totalPages?: number;
}

interface Section {
  title: string;
  startPage: number;
  endPage: number;
}
interface Part {
  index: number;
  label: string;
  title: string;
  startPage: number;
  endPage: number;
  sections: Section[];
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

  // 1단계: ISBN 검색 → 상품코드 추출.
  const searchUrl = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(
    body.isbn13,
  )}&gbCode=TOT&target=total`;
  let productCode: string | null = null;
  try {
    const r = await fetch(searchUrl, { headers: BROWSER_HEADERS });
    if (!r.ok) {
      return NextResponse.json(
        { error: "kyobo_search_failed", status: r.status },
        { status: 502 },
      );
    }
    const html = await r.text();
    const m = html.match(/product\.kyobobook\.co\.kr\/detail\/([A-Z0-9]+)/);
    if (m) productCode = m[1];
  } catch (e) {
    console.error("[fetch-toc-kyobo] search throw", e);
    return NextResponse.json({ error: "search_network" }, { status: 502 });
  }
  if (!productCode) {
    console.log("[fetch-toc-kyobo] no product for ISBN", body.isbn13);
    // 디버그: Vercel IP 가 CloudFront 에 차단되는지 판별용. HTML 일부 반환.
    // 원인 좁히면 제거.
    const searchHtml = await (await fetch(searchUrl, { headers: BROWSER_HEADERS })).text();
    return NextResponse.json({
      unknown: true,
      parts: [],
      debug: {
        searchHtmlLength: searchHtml.length,
        searchHtmlHead: searchHtml.slice(0, 500),
        hasProductLink: /product\.kyobobook\.co\.kr/.test(searchHtml),
      },
    });
  }

  // 2단계: 상품페이지 HTML 받아오기.
  const productUrl = `https://product.kyobobook.co.kr/detail/${productCode}`;
  let productHtml = "";
  try {
    const r = await fetch(productUrl, { headers: BROWSER_HEADERS });
    if (!r.ok) {
      return NextResponse.json(
        { error: "kyobo_product_failed", status: r.status },
        { status: 502 },
      );
    }
    productHtml = await r.text();
  } catch (e) {
    console.error("[fetch-toc-kyobo] product throw", e);
    return NextResponse.json({ error: "product_network" }, { status: 502 });
  }

  // 3단계: <li class="book_contents_item"> 안쪽 텍스트 추출.
  const liMatch = productHtml.match(
    /<li class="book_contents_item">([\s\S]*?)<\/li>/,
  );
  if (!liMatch) {
    console.log("[fetch-toc-kyobo] no TOC li — maybe empty 목차 section");
    return NextResponse.json({ unknown: true, parts: [] });
  }
  // <br /> → 줄바꿈, 나머지 태그 제거.
  const tocText = liMatch[1]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  console.log("[fetch-toc-kyobo] raw toc text:\n" + tocText.slice(0, 800));

  // 4단계: 줄 단위로 쪼개서 챕터·섹션 구조 만들기.
  //   "서문 인생의 작은 법칙들"      → label="서문", title="인생의 작은 법칙들"
  //   "1. 이토록 아슬아슬한 세상"   → label="1", title="..."
  //   "- 지나온 과거를 돌아보면..." → 직전 챕터의 section (epigraph)
  //   "감사의 글"                  → label="", title=전체
  const parts: Part[] = [];
  const lines = tocText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let index = 0;
  for (const line of lines) {
    // 숫자 챕터: "1. 제목" / "23. 제목"
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    // 섹션(epigraph): "- 내용..."  — 직전 part 의 sections 로 병합.
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
    // 비숫자 라인(서문/프롤로그/감사의 글/주석/에필로그 등) — label 추출.
    // 라벨 후보: "서문", "프롤로그", "에필로그", "감사의 글", "주석", "부록", "옮긴이의 말"
    const labelMatch = line.match(
      /^(서문|서론|프롤로그|에필로그|머리말|맺음말|들어가며|나오며|감사의 글|감사의말|감사의\s*글|추천사|추천의\s*글|주석|주|부록|참고문헌|옮긴이의?\s*말|옮긴이\s*후기|번역과\s*관련하여|후기|개정판\s*서문|독자에게|저자의\s*말|들어가는\s*글)\s*(.*)$/,
    );
    index++;
    if (labelMatch) {
      const label = labelMatch[1].trim();
      const rest = labelMatch[2].trim();
      parts.push({
        index,
        label,
        title: rest || label,
        startPage: 0,
        endPage: 0,
        sections: [],
      });
    } else {
      // 미지의 패턴 — 통째로 title 로.
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

  // 5단계: 페이지 균등 분배. totalPages 없으면 0 유지 → 호출측에서 처리.
  const total = body.totalPages ?? 0;
  if (total > 0 && parts.length > 0) {
    const per = Math.floor(total / parts.length);
    let cursor = 1;
    parts.forEach((p, i) => {
      p.startPage = cursor;
      p.endPage = i === parts.length - 1 ? total : cursor + per - 1;
      cursor = p.endPage + 1;
      // 섹션도 부모 범위 내에서 균등.
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
        // 섹션 없으면 part 자체를 sections 한 개로 (UI 요구사항).
        p.sections.push({
          title: p.title,
          startPage: p.startPage,
          endPage: p.endPage,
        });
      }
    });
  } else {
    // totalPages 0 — 섹션만 보정.
    parts.forEach((p) => {
      if (p.sections.length === 0) {
        p.sections.push({ title: p.title, startPage: 0, endPage: 0 });
      }
    });
  }

  if (parts.length === 0) {
    return NextResponse.json({ unknown: true, parts: [] });
  }

  return NextResponse.json({
    unknown: false,
    parts,
    totalPages: total,
    source: "kyobo",
    productCode,
  });
}
