// 구현지시서 T-43: icon.svg → PNG 파생본 생성
// maskable은 safe zone 20% 패딩 확보 (Android 홈 아이콘 마스크 대응)
import sharp from "sharp";
import fs from "fs";

const SRC = "public/icon.svg";
const OUT = "public/icons";
fs.mkdirSync(OUT, { recursive: true });

// icon.svg가 public에 없으면 src/app/icon.svg를 fallback
const src = fs.existsSync(SRC) ? SRC : "src/app/icon.svg";

for (const [name, size, pad] of [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["icon-maskable-512.png", 512, 0.2],
  ["../apple-touch-icon.png", 180, 0],
]) {
  const inner = Math.round(size * (1 - pad * 2));
  await sharp(src)
    .resize(inner, inner)
    .extend({
      top: Math.round((size - inner) / 2),
      bottom: Math.round((size - inner) / 2),
      left: Math.round((size - inner) / 2),
      right: Math.round((size - inner) / 2),
      background: "#050505",
    })
    .png()
    .toFile(`${OUT}/${name}`);
  console.log(`✓ ${name} (${size}x${size}, pad ${pad * 100}%)`);
}
