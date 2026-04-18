// OpenAI GPT-4o Vision으로 목차 이미지에서 파트/소제목 추출
// 사용: npx tsx scripts/extract-toc-openai.ts <이미지경로>
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PROMPT = `이 이미지는 책의 목차 페이지다.
파트(Part N.)와 그 아래 소제목들을 JSON으로 정확히 추출해라.

규칙:
- 파트 번호, 파트 제목, 시작 페이지 모두 포함
- 각 파트 밑의 소제목과 시작 페이지 포함
- 페이지 번호는 숫자로
- 목차에 없는 내용(참고문헌 등) 제외
- JSON만 응답, 마크다운 코드블록 금지

형식:
{
  "parts": [
    {
      "number": 6,
      "title": "...",
      "startPage": 203,
      "sections": [
        { "title": "...", "startPage": 206 }
      ]
    }
  ]
}`;

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("사용: npx tsx scripts/extract-toc-openai.ts <이미지경로>");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ext = path.extname(imagePath).slice(1).toLowerCase() || "jpeg";
  const image = fs.readFileSync(imagePath).toString("base64");

  console.log(`[OpenAI GPT-4o] 추출 중: ${imagePath}`);
  const t0 = Date.now();

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:image/${ext};base64,${image}` } },
        ],
      },
    ],
  });

  const elapsed = Date.now() - t0;
  const usage = res.usage;
  // GPT-4o 단가 — input $2.5/1M, output $10/1M (2025-04 기준)
  const cost =
    ((usage?.prompt_tokens ?? 0) * 2.5 + (usage?.completion_tokens ?? 0) * 10) / 1_000_000;

  console.log(`⏱️  ${elapsed}ms | 💰 $${cost.toFixed(4)} (~${Math.round(cost * 1400)}원)`);
  console.log(res.choices[0].message.content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
