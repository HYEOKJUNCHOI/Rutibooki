// Gemini 2.5 Flash로 목차 이미지에서 파트/소제목 추출
// 사용: npx tsx scripts/extract-toc-gemini.ts <이미지경로>
import { GoogleGenAI } from "@google/genai";
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
    console.error("사용: npx tsx scripts/extract-toc-gemini.ts <이미지경로>");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const ext = path.extname(imagePath).slice(1).toLowerCase() || "jpeg";
  const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  const image = fs.readFileSync(imagePath).toString("base64");

  console.log(`[Gemini 2.5 Flash] 추출 중: ${imagePath}`);
  const t0 = Date.now();

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data: image } },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const elapsed = Date.now() - t0;
  const usage = res.usageMetadata;
  // Gemini 2.5 Flash 단가 — input $0.3/1M, output $2.5/1M (2025-04)
  const cost =
    ((usage?.promptTokenCount ?? 0) * 0.3 + (usage?.candidatesTokenCount ?? 0) * 2.5) /
    1_000_000;

  console.log(`⏱️  ${elapsed}ms | 💰 $${cost.toFixed(4)} (~${Math.round(cost * 1400)}원)`);
  console.log(res.text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
