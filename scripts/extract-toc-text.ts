// 이미지 없이, 책 제목만 주고 Gemini에게 목차 생성시키기 — 환각 테스트용
// 사용: npx tsx scripts/extract-toc-text.ts "책제목" "저자"
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const title = process.argv[2];
  const author = process.argv[3] ?? "";
  if (!title) {
    console.error('사용: npx tsx scripts/extract-toc-text.ts "책제목" "저자"');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `책 "${title}"${author ? ` (저자: ${author})` : ""}의 실제 목차를 JSON으로 알려줘.

규칙:
- 파트(Part)와 그 아래 소제목 구조
- 각 항목에 시작 페이지 번호 포함
- 모르면 추측하지 말고 "unknown"으로 표시
- 할루시네이션 금지. 실제 목차가 아니면 "uncertain": true 플래그 붙여
- JSON만 응답

형식:
{
  "source": "training_data" | "uncertain",
  "uncertain": boolean,
  "parts": [
    {
      "number": 1,
      "title": "...",
      "startPage": 12,
      "sections": [
        { "title": "...", "startPage": 14 }
      ]
    }
  ]
}`;

  console.log(`[Gemini 2.5 Flash · 텍스트만] "${title}" 목차 생성 중...`);
  const t0 = Date.now();

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" },
  });

  const elapsed = Date.now() - t0;
  const usage = res.usageMetadata;
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
