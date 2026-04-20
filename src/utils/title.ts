// 책 제목을 "메인 - 부제" 꼴로 쪼갬.
// 알라딘 응답이 "밤과 나침반 - 목표는 크게, 실행은 작게" 식으로 붙여서 오는 경우가 많아
// 서재엔 메인만 노출, 상세 화면엔 메인+부제 두 줄로 보여주려고 공통화.
// 구분자: ASCII hyphen(-), en dash(–), em dash(—). 앞뒤 공백 필수(단어 내 하이픈 오탐 방지).

const SEP_RE = /\s[-–—]\s/;

export function splitTitle(title: string): { main: string; sub: string } {
  const trimmed = title.trim();
  const m = SEP_RE.exec(trimmed);
  if (!m) return { main: trimmed, sub: "" };
  return {
    main: trimmed.slice(0, m.index).trim(),
    sub: trimmed.slice(m.index + m[0].length).trim(),
  };
}
