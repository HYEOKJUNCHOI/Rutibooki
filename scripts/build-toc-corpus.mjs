// 12권 TOC 코퍼스 수집 스크립트.
// 교보 프록시(localhost:5678) + 알라딘 API 로 파싱 결과를 .omc/research/toc-corpus/<ISBN>.parsed.json 에 저장.
// 실패한 책은 error 기록 후 나머지 진행 — 전체 중단 없음.
//
// 실행: node scripts/build-toc-corpus.mjs
// 전제: 교보 프록시가 localhost:5678 에서 구동 중이어야 함 (PM2 확인).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".omc", "research", "toc-corpus");

const PROXY_URL = "http://localhost:5678";
const PROXY_TOKEN = process.env.KYOBO_PROXY_TOKEN || "";
// 알라딘 API 키 — .env.local 에서 읽음. 없으면 메타 조회 생략.
const ALADIN_TTB_KEY = process.env.ALADIN_TTB_KEY || "";

const ISBNS = [
  "9791158512859",
  "9791139729498",
  "9791198517425",
  "9791199383074",
  "9791158511586",
  "9791193262757",
  "9788997850006",
  "9791188102259",
  "9791192143248",
  "9791193904671",
  "9791194530015",
  "9791196473570",
];

// ── 알라딘 메타 조회 ────────────────────────────────────────
// registerByIsbn 흐름과 동일하게 /ttb/api/ItemLookUp 사용.
async function fetchAladinMeta(isbn13) {
  if (!ALADIN_TTB_KEY) return { title: "", author: "", cover: "", itemPage: 0, toc: "" };

  const url =
    `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx` +
    `?ttbkey=${encodeURIComponent(ALADIN_TTB_KEY)}` +
    `&itemIdType=ISBN13` +
    `&ItemId=${encodeURIComponent(isbn13)}` +
    `&output=js` +
    `&Version=20131101` +
    `&OptResult=Toc,Packing`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return { error: `aladin_status_${r.status}`, title: "", author: "", cover: "", itemPage: 0, toc: "" };

    const raw = await r.text();
    // JSONP 래퍼 제거 — 알라딘은 JSON 앞뒤에 콜백 붙이는 경우가 있음.
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    const jsonStr = firstBrace >= 0 ? raw.slice(firstBrace, lastBrace + 1) : raw;
    const data = JSON.parse(jsonStr);

    if (data.errorCode) return { error: data.errorMessage, title: "", author: "", cover: "", itemPage: 0, toc: "" };
    const item = data.item?.[0];
    if (!item) return { error: "no_match", title: "", author: "", cover: "", itemPage: 0, toc: "" };

    return {
      title: item.title ?? "",
      author: item.author ?? "",
      cover: item.cover ?? "",
      publisher: item.publisher ?? "",
      itemPage: Number(item.subInfo?.itemPage ?? 0) || 0,
      toc: item.subInfo?.toc ?? "",
    };
  } catch (e) {
    const msg = e?.name === "AbortError" ? "aladin_timeout" : e.message;
    return { error: msg, title: "", author: "", cover: "", itemPage: 0, toc: "" };
  } finally {
    clearTimeout(timer);
  }
}

// ── 교보 프록시 호출 ────────────────────────────────────────
async function fetchKyoboProxy(isbn13, totalPages = 0) {
  const headers = { "Content-Type": "application/json" };
  // 토큰이 설정된 경우에만 헤더 포함 — 없으면 로컬 개발 fallback.
  if (PROXY_TOKEN) headers["x-proxy-token"] = PROXY_TOKEN;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ isbn13, totalPages }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { unknown: true, parts: [], totalPages: 0, error: `proxy_status_${r.status}` };
    return await r.json();
  } catch (e) {
    const msg = e?.name === "AbortError" ? "proxy_timeout" : e.message;
    return { unknown: true, parts: [], totalPages: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ── 메인 ────────────────────────────────────────────────────
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`[corpus] 출력 디렉토리: ${OUT_DIR}`);
  console.log(`[corpus] 프록시: ${PROXY_URL} | 알라딘 키: ${ALADIN_TTB_KEY ? "있음" : "없음(메타 생략)"}\n`);

  const results = [];

  for (const isbn13 of ISBNS) {
    process.stdout.write(`[corpus] ${isbn13} 처리 중...`);

    // 알라딘 메타 먼저 — 총 페이지 수를 교보 파서에 넘겨야 page 분배가 됨.
    const aladin = await fetchAladinMeta(isbn13);
    const totalPages = aladin.itemPage ?? 0;

    // 교보 프록시 호출.
    const kyobo = await fetchKyoboProxy(isbn13, totalPages);

    const record = {
      isbn13,
      fetchedAt: new Date().toISOString(),
      meta: {
        title: aladin.title,
        author: aladin.author,
        cover: aladin.cover,
        publisher: aladin.publisher,
        itemPage: aladin.itemPage,
        aladinError: aladin.error,
        aladinTocLength: (aladin.toc ?? "").length,
      },
      kyobo: {
        unknown: kyobo.unknown,
        parts: kyobo.parts ?? [],
        totalPages: kyobo.totalPages ?? 0,
        source: kyobo.source,
        productCode: kyobo.productCode,
        error: kyobo.error,
      },
    };

    const outPath = path.join(OUT_DIR, `${isbn13}.parsed.json`);
    await fs.writeFile(outPath, JSON.stringify(record, null, 2), "utf-8");

    const partCount = (kyobo.parts ?? []).length;
    const status = kyobo.error ? `ERROR(${kyobo.error})` : `${partCount}파트`;
    console.log(` ${status} | "${aladin.title || "(알라딘 없음)"}"`);

    results.push({ isbn13, title: aladin.title, partCount, kyoboError: kyobo.error, parts: kyobo.parts ?? [] });
  }

  // ── 간단 통계 출력 ──
  console.log("\n========== 수집 결과 ==========");
  let ok = 0, fail = 0;
  for (const r of results) {
    const tag = r.kyoboError ? "FAIL" : "OK  ";
    console.log(`[${tag}] ${r.isbn13}  파트:${r.partCount}  "${r.title}"`);
    r.kyoboError ? fail++ : ok++;
  }
  console.log(`\n성공 ${ok}권 / 실패 ${fail}권 / 전체 ${ISBNS.length}권`);
  console.log(`\n파일 저장 위치: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error("[corpus] 치명 오류:", e);
  process.exit(1);
});
