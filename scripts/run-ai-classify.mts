// 12권 raw TOC 를 AI 분류기에 태워 .ai.parsed.json 으로 저장.
// 실행: npx tsx scripts/run-ai-classify.mts
// 중단 금지 — 실패한 책은 에러만 기록하고 다음으로.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// src/lib 를 상대경로로 — @/ alias 는 tsx 기본에서 안 먹음.
import { classifyTocLines } from "../src/lib/tocClassifierAI.ts";
import { buildTocTreeFromAI } from "../src/lib/buildTocTree.ts";
import { judgeTocAccuracy, badgeEmoji } from "../src/utils/tocAccuracy.ts";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".omc", "research", "toc-corpus");

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

// Gemini 2.5 Flash 단가 — input $0.075 / 1M, output $0.30 / 1M (2026-04 기준 프로토타입 가정).
// 환율 1USD = 1400원.
const PRICE_INPUT_USD_PER_M = 0.075;
const PRICE_OUTPUT_USD_PER_M = 0.3;
const KRW_PER_USD = 1400;

function costKrw(inputTok: number, outputTok: number): number {
  const usd =
    (inputTok * PRICE_INPUT_USD_PER_M + outputTok * PRICE_OUTPUT_USD_PER_M) /
    1_000_000;
  return usd * KRW_PER_USD;
}

interface Row {
  isbn13: string;
  title: string;
  inputTokens: number;
  outputTokens: number;
  krw: number;
  ok: boolean;
  reason?: string;
  badge: "green" | "yellow" | "red" | "N/A";
  partCount: number;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[ai-classify] ✗ GEMINI_API_KEY 없음 — .env.local 확인");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const rows: Row[] = [];

  for (const isbn13 of ISBNS) {
    const rawPath = path.join(OUT_DIR, `${isbn13}.raw.txt`);
    const parsedPath = path.join(OUT_DIR, `${isbn13}.parsed.json`);
    const aiOutPath = path.join(OUT_DIR, `${isbn13}.ai.parsed.json`);

    let raw = "";
    try {
      raw = await fs.readFile(rawPath, "utf-8");
    } catch {
      console.log(`[ai-classify] ${isbn13} SKIP — raw 없음`);
      rows.push({
        isbn13,
        title: "(raw 없음)",
        inputTokens: 0,
        outputTokens: 0,
        krw: 0,
        ok: false,
        reason: "no_raw",
        badge: "N/A",
        partCount: 0,
      });
      continue;
    }

    const parsedRaw = await fs.readFile(parsedPath, "utf-8");
    const parsed = JSON.parse(parsedRaw);
    const title: string = parsed?.meta?.title ?? "";
    const totalPages: number = parsed?.meta?.itemPage ?? 0;

    const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
    process.stdout.write(
      `[ai-classify] ${isbn13} (${lines.length} lines) "${title.slice(0, 30)}" ... `,
    );

    const result = await classifyTocLines(lines, { apiKey, maxAttempts: 2 });
    const usage = result.usage ?? { promptTokens: 0, outputTokens: 0 };
    const krw = costKrw(usage.promptTokens, usage.outputTokens);

    if (!result.ok) {
      console.log(`FALLBACK (${result.reason}) | 비용 ${krw.toFixed(1)}원`);
      rows.push({
        isbn13,
        title,
        inputTokens: usage.promptTokens,
        outputTokens: usage.outputTokens,
        krw,
        ok: false,
        reason: result.reason,
        badge: "N/A",
        partCount: 0,
      });
      // 폴백 결과 저장 — 원본 parts 복사.
      await fs.writeFile(
        aiOutPath,
        JSON.stringify(
          {
            isbn13,
            generatedAt: new Date().toISOString(),
            source: "rule_fallback",
            reason: result.reason,
            parts: parsed?.kyobo?.parts ?? [],
          },
          null,
          2,
        ),
        "utf-8",
      );
      continue;
    }

    const parts = buildTocTreeFromAI(lines, result.classifications, {
      totalPages,
    });
    const acc = judgeTocAccuracy(parts);
    console.log(
      `OK ${parts.length} parts ${badgeEmoji(acc.level)} | 비용 ${krw.toFixed(1)}원`,
    );

    rows.push({
      isbn13,
      title,
      inputTokens: usage.promptTokens,
      outputTokens: usage.outputTokens,
      krw,
      ok: true,
      badge: acc.level,
      partCount: parts.length,
    });

    await fs.writeFile(
      aiOutPath,
      JSON.stringify(
        {
          isbn13,
          generatedAt: new Date().toISOString(),
          source: "gemini-2.5-flash",
          title,
          totalPages,
          classifications: result.classifications,
          parts,
          usage,
          costKrw: krw,
        },
        null,
        2,
      ),
      "utf-8",
    );
  }

  // ── 비용 리포트 ──
  const totalKrw = rows.reduce((s, r) => s + r.krw, 0);
  let md = "# AI TOC 분류 비용 리포트\n\n";
  md += `- 생성 시각: ${new Date().toISOString()}\n`;
  md += `- 모델: gemini-2.5-flash (input $${PRICE_INPUT_USD_PER_M}/1M, output $${PRICE_OUTPUT_USD_PER_M}/1M)\n`;
  md += `- 환율: 1 USD = ${KRW_PER_USD}원\n\n`;
  md += `| ISBN | 제목 | input | output | 원화 | 검증 | 뱃지 |\n`;
  md += `|------|------|-------|--------|------|------|------|\n`;
  for (const r of rows) {
    md += `| ${r.isbn13} | ${(r.title || "").replace(/\|/g, "/").slice(0, 30)} | ${r.inputTokens} | ${r.outputTokens} | ${r.krw.toFixed(1)} | ${r.ok ? "OK" : `FALLBACK(${r.reason})`} | ${r.badge === "N/A" ? "—" : badgeEmoji(r.badge as "green" | "yellow" | "red")} |\n`;
  }
  md += `\n**총 비용: ${totalKrw.toFixed(1)}원**\n`;
  await fs.writeFile(path.join(OUT_DIR, "ai-cost-report.md"), md, "utf-8");

  // ── 룰 vs AI 비교 ──
  let cmp = "# AI vs 룰 비교 리포트\n\n";
  cmp += `- 생성 시각: ${new Date().toISOString()}\n\n`;
  cmp += `| ISBN | 제목 | 룰 뱃지 | AI 뱃지 | 비용 | 비고 |\n`;
  cmp += `|------|------|---------|---------|------|------|\n`;

  const counts = { rule: { green: 0, yellow: 0, red: 0 }, ai: { green: 0, yellow: 0, red: 0 } };
  let fallbackCount = 0;
  for (const r of rows) {
    const parsed = JSON.parse(
      await fs.readFile(path.join(OUT_DIR, `${r.isbn13}.parsed.json`), "utf-8"),
    );
    const ruleParts = parsed?.kyobo?.parts ?? [];
    const ruleAcc = judgeTocAccuracy(ruleParts);
    counts.rule[ruleAcc.level]++;
    if (r.ok && r.badge !== "N/A") counts.ai[r.badge as "green" | "yellow" | "red"]++;
    if (!r.ok) fallbackCount++;
    cmp += `| ${r.isbn13} | ${(r.title || "").replace(/\|/g, "/").slice(0, 25)} | ${badgeEmoji(ruleAcc.level)} | ${r.ok ? badgeEmoji(r.badge as "green" | "yellow" | "red") : "⚠ 폴백"} | ${r.krw.toFixed(1)}원 | ${r.ok ? `${r.partCount}파트` : r.reason ?? ""} |\n`;
  }
  cmp += `\n## 분포 비교\n`;
  cmp += `- 룰: 🟢 ${counts.rule.green} / 🟡 ${counts.rule.yellow} / 🔴 ${counts.rule.red}\n`;
  cmp += `- AI: 🟢 ${counts.ai.green} / 🟡 ${counts.ai.yellow} / 🔴 ${counts.ai.red} (폴백 ${fallbackCount}권)\n`;
  cmp += `- **총 비용: ${totalKrw.toFixed(1)}원 (책당 평균 ${(totalKrw / rows.length).toFixed(1)}원)**\n\n`;
  cmp += `## 성공 기준 체크\n`;
  cmp += `- 🟢 ≥ 8권: ${counts.ai.green >= 8 ? "O" : "X"} (${counts.ai.green})\n`;
  cmp += `- 🔴 = 0권: ${counts.ai.red === 0 ? "O" : "X"} (${counts.ai.red})\n`;
  cmp += `- 총비용 ≤ 60원: ${totalKrw <= 60 ? "O" : "X"} (${totalKrw.toFixed(1)}원)\n`;
  cmp += `- 책당 평균 ≤ 3원: ${totalKrw / rows.length <= 3 ? "O" : "X"}\n`;

  await fs.writeFile(path.join(OUT_DIR, "ai-vs-rule-report.md"), cmp, "utf-8");

  // ── 갤러리용 TS 데이터 생성 ──
  // 클라이언트 번들에 포함될 수 있도록 JSON 을 TS 상수로 직렬화.
  const aiDataPath = path.join(ROOT, "src", "data", "tocCorpusAiResults.ts");
  const resultEntries: Record<string, unknown> = {};
  for (const r of rows) {
    const aiOutPath = path.join(OUT_DIR, `${r.isbn13}.ai.parsed.json`);
    try {
      const aiJson = JSON.parse(await fs.readFile(aiOutPath, "utf-8"));
      resultEntries[r.isbn13] = {
        isbn13: r.isbn13,
        title: r.title,
        source: r.ok ? "gemini-2.5-flash" : "rule_fallback",
        parts: aiJson.parts ?? [],
        costKrw: r.krw,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        reason: r.reason,
      };
    } catch {
      // 파일이 없으면 건너뜀.
    }
  }
  const tsOut = `// 자동 생성 — scripts/run-ai-classify.mts 가 덮어씀. 수동 수정 금지.
// 생성 시각: ${new Date().toISOString()}

import type { BookPart } from "@/types/book";

export interface AiBookResult {
  isbn13: string;
  title: string;
  source: "gemini-2.5-flash" | "rule_fallback";
  parts: BookPart[];
  costKrw: number;
  inputTokens: number;
  outputTokens: number;
  reason?: string;
}

export const AI_RESULTS: Record<string, AiBookResult> = ${JSON.stringify(resultEntries, null, 2)};
`;
  await fs.writeFile(aiDataPath, tsOut, "utf-8");

  console.log(`\n총 비용 ${totalKrw.toFixed(1)}원 | 리포트 → ${OUT_DIR}`);
  console.log(`갤러리 데이터 → ${aiDataPath}`);
}

main().catch((e) => {
  console.error("[ai-classify] fatal", e);
  process.exit(1);
});
