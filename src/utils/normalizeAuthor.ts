// 알라딘/네이버 API 가 반환하는 저자 문자열은 "홍길동 (지은이), 김철수 (옮긴이)" 형식.
// 우리 카드엔 '작가' 만 보이면 충분 → 옮긴이·엮은이·그림만 담당은 제거, 저자 역할만 남김.

// 저자 역할로 인정할 키워드. 나머지는 필터링 대상.
const AUTHOR_ROLES = ["지은이", "저자", "저", "원저", "공저", "글", "글·그림"];

// 제거 대상 역할 — 목록에 없으면 그냥 괄호만 벗겨서 남김 (보수적).
const EXCLUDE_ROLES = ["옮긴이", "역자", "역", "엮은이", "편", "편저", "감수", "그림"];

export function normalizeAuthor(raw: string): string {
  if (!raw) return "";
  const entries = raw
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const authors: string[] = [];
  for (const entry of entries) {
    const roleMatch = entry.match(/\(([^)]+)\)\s*$/);
    const name = entry.replace(/\s*\(([^)]+)\)\s*$/, "").trim();
    if (!name) continue;
    if (!roleMatch) {
      // 역할 표기 없음 — 원작자로 간주.
      authors.push(name);
      continue;
    }
    const role = roleMatch[1].trim();
    // 역할이 "옮긴이·엮은이·감수·그림" 단독이면 제외.
    // "지은이·저자" 등이면 포함. 모호하면(기타 역할) 포함하는 쪽으로 관대.
    const onlyExcluded =
      EXCLUDE_ROLES.some((r) => role.includes(r)) &&
      !AUTHOR_ROLES.some((r) => role.includes(r));
    if (onlyExcluded) continue;
    authors.push(name);
  }

  return authors.join(", ");
}
