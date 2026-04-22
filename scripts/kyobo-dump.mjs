// 교보 목차 원문 텍스트 덤프 — 파서 개선용 분석 도구.
// 사용: node scripts/kyobo-dump.mjs <ISBN13>
//      node scripts/kyobo-dump.mjs 9788934972464

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

function extractCookies(h) {
  if (!h) return "";
  return h
    .split(/,(?=\s*[A-Za-z0-9_\-]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

const isbn13 = process.argv[2];
if (!isbn13) {
  console.error("usage: node kyobo-dump.mjs <ISBN13>");
  process.exit(1);
}

const searchUrl = `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(isbn13)}&gbCode=TOT&target=total`;
const sr = await fetch(searchUrl, {
  headers: { ...BASE_BROWSER_HEADERS, "Sec-Fetch-Site": "none", Referer: "https://www.kyobobook.co.kr/" },
});
const cookie = extractCookies(sr.headers.get("set-cookie"));
const html = await sr.text();
const m = html.match(/product\.kyobobook\.co\.kr\/detail\/([A-Z0-9]+)/);
if (!m) {
  console.error("no product");
  process.exit(1);
}
const productUrl = `https://product.kyobobook.co.kr/detail/${m[1]}`;
const pr = await fetch(productUrl, {
  headers: { ...BASE_BROWSER_HEADERS, "Sec-Fetch-Site": "same-site", Referer: searchUrl, Cookie: cookie },
});
const productHtml = await pr.text();
console.error(`productCode=${m[1]} htmlLen=${productHtml.length}`);

const li = productHtml.match(/<li class="book_contents_item">([\s\S]*?)<\/li>/);
if (!li) {
  console.error("no TOC li");
  process.exit(1);
}
const tocText = li[1]
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .trim();

console.log("==========RAW==========");
console.log(tocText);
console.log("==========END==========");
console.log("\n=====LINE ANALYSIS=====");
tocText.split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
  const first = line.codePointAt(0);
  console.log(`[${i + 1}] U+${first.toString(16).padStart(4, "0")} "${line.slice(0, 60)}${line.length > 60 ? "…" : ""}"`);
});
