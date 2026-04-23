// 교보 프록시에 raw TOC 줄을 요청해서 .omc/research/toc-corpus/<ISBN>.raw.txt 로 저장.
// 이미 parsed.json 은 있으니 여기서는 rawLines 만 뽑아 파일로 떨군다.
//
// 실행: node scripts/build-toc-raw.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".omc", "research", "toc-corpus");
const PROXY_URL = "http://localhost:5678";
const PROXY_TOKEN = process.env.KYOBO_PROXY_TOKEN || "";

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

async function fetchRaw(isbn13) {
  const headers = { "Content-Type": "application/json" };
  if (PROXY_TOKEN) headers["x-proxy-token"] = PROXY_TOKEN;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ isbn13, totalPages: 0 }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { error: `status_${r.status}`, rawLines: [] };
    const j = await r.json();
    return { rawLines: j.rawLines ?? [], error: j.error };
  } catch (e) {
    return { error: e?.name === "AbortError" ? "timeout" : e.message, rawLines: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const isbn13 of ISBNS) {
    process.stdout.write(`[raw] ${isbn13} ... `);
    const { rawLines, error } = await fetchRaw(isbn13);
    if (error || rawLines.length === 0) {
      console.log(`FAIL (${error ?? "empty"})`);
      continue;
    }
    const outPath = path.join(OUT_DIR, `${isbn13}.raw.txt`);
    await fs.writeFile(outPath, rawLines.join("\n"), "utf-8");
    console.log(`OK ${rawLines.length} lines`);
  }
}

main().catch((e) => {
  console.error("[raw] fatal", e);
  process.exit(1);
});
