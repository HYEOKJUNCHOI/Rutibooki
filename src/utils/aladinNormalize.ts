// 알라딘 응답 정제 유틸. 원본은 부제·역할라벨이 지저분하게 붙어오므로
// 사용자에게 노출되기 전 깎아낸다.

// "스위치 - 손쉽게 극적인 변화를 이끌어내는 행동설계의 힘" → "스위치"
// 알라딘은 주제목과 부제를 " - " (스페이스-하이픈-스페이스) 로 구분한다.
// 첫 " - " 기준으로 자르는 게 체감상 가장 깔끔.
export function stripSubtitle(title: string): string {
  const i = title.indexOf(" - ");
  if (i > 0) return title.slice(0, i).trim();
  return title.trim();
}

// "칩 히스, 댄 히스 (지은이), 안진환 (옮긴이)" → "칩 히스, 댄 히스"
// 1) 콤마 분리
// 2) "(옮긴이)" 토큰은 통째로 버림
// 3) "(지은이)" 등 역할 라벨은 괄호째 제거
// 4) 빈 값/중복 제거 후 ", " 로 재조립
export function normalizeAuthors(author: string): string {
  if (!author) return "";
  const tokens = author.split(",").map((t) => t.trim());
  const cleaned: string[] = [];
  for (const t of tokens) {
    if (/\(\s*옮긴이\s*\)/.test(t)) continue;
    const stripped = t
      .replace(
        /\(\s*(지은이|엮은이|편저|편|감수|저|글|그림|사진)\s*\)/g,
        "",
      )
      .replace(/\s+/g, " ")
      .trim();
    if (stripped && !cleaned.includes(stripped)) cleaned.push(stripped);
  }
  return cleaned.join(", ");
}
