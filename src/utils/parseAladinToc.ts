import { BookPart, BookSection } from "@/types/book";

// 알라딘 ItemLookUp 의 toc 필드는 HTML 문자열. 보통 형태는:
//   "프롤로그 ... 7<br/>1부 시작<br/>제1장 어쩌고 ... 15<br/>제2장 저쩌고 ... 45<br/>..."
// 포맷이 책마다 조금씩 달라서(점선 개수, 공백, 구분자), 느슨한 regex 로 뽑는다.
// 실패 시 빈 배열 반환 → 상위에서 Gemini Vision 으로 fallback.

export interface ParsedToc {
  parts: BookPart[];
  // 목차 마지막 줄의 페이지가 총쪽수보다 작은 게 정상이라 따로 돌려줌.
  lastPage: number;
}

interface RawEntry {
  title: string;
  startPage: number;
  depth: number; // 0 = 파트, 1 = 섹션. 제목 패턴으로 추정.
}

// HTML 태그 제거 + 엔티티 정리 + <br> 을 줄바꿈으로.
function htmlToLines(html: string): string[] {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<\/?div[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  return normalized
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// 파트(상위) 헤더 패턴 — 한국 책이 쓰는 다양한 변형 커버.
// 1부·제1부·Part 1·PART I 기본 + "나침반1" · "챕터 1" · "CHAPTER 2" · "장 1" 등 커스텀 파트 이름.
// 뒤에 공백/숫자/한자/영문 등 토큰이 붙으면 상위 헤더로 취급.
const PART_PATTERN =
  /^(제\s*\d+\s*부|\d+\s*부|part\s*\d+|part\s+[ivx]+|chapter\s*\d+|나침반\s*\d+|챕터\s*\d+|섹션\s*\d+|파트\s*\d+)\b/i;

// 라인 끝의 페이지 번호 — 점선/공백 뒤 2~4자리 숫자. 없으면 null.
function extractPage(line: string): { title: string; page: number | null } {
  // "제1장 제목 ........... 15" / "제1장 제목 … 15" / "제1장 제목   15"
  const m = line.match(/^(.*?)[\s.…·・\-–—]{1,}(\d{1,4})\s*$/);
  if (m) {
    return { title: m[1].trim(), page: Number(m[2]) };
  }
  return { title: line, page: null };
}

function classifyDepth(title: string): number {
  if (PART_PATTERN.test(title)) return 0;
  return 1;
}

export function parseAladinToc(html: string): ParsedToc {
  if (!html || html.trim().length === 0) return { parts: [], lastPage: 0 };

  const lines = htmlToLines(html);
  const entries: RawEntry[] = [];

  for (const line of lines) {
    const { title, page } = extractPage(line);
    if (title.length === 0) continue;
    // 페이지 없는 줄도 파트 헤더일 수 있음 — depth 분류만 해서 들고 간다.
    entries.push({
      title,
      startPage: page ?? -1,
      depth: classifyDepth(title),
    });
  }

  if (entries.length === 0) return { parts: [], lastPage: 0 };

  // 페이지가 없는 엔트리는 바로 다음 페이지-있는 엔트리의 startPage 를 빌려 쓴다.
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].startPage === -1) {
      const next = entries.slice(i + 1).find((e) => e.startPage !== -1);
      entries[i].startPage = next?.startPage ?? -1;
    }
  }
  // 여전히 -1 인 꼬리는 버린다.
  const cleaned = entries.filter((e) => e.startPage !== -1);
  if (cleaned.length === 0) return { parts: [], lastPage: 0 };

  // 파트 헤더가 하나도 없으면 전체를 단일 파트로 묶고 섹션만 나열.
  const hasPartHeaders = cleaned.some((e) => e.depth === 0);
  const parts: BookPart[] = [];

  if (!hasPartHeaders) {
    const sections: BookSection[] = cleaned.map((e, i) => ({
      title: e.title,
      startPage: e.startPage,
      endPage:
        i + 1 < cleaned.length ? cleaned[i + 1].startPage - 1 : e.startPage,
    }));
    const last = sections[sections.length - 1];
    parts.push({
      index: 1,
      title: "본문",
      startPage: sections[0].startPage,
      endPage: last.endPage,
      sections,
    });
    return { parts, lastPage: last.endPage };
  }

  // 파트 헤더 기준으로 그룹핑.
  let currentPart: BookPart | null = null;
  for (const e of cleaned) {
    if (e.depth === 0) {
      if (currentPart) parts.push(currentPart);
      currentPart = {
        index: parts.length + 1,
        title: e.title,
        startPage: e.startPage,
        endPage: e.startPage,
        sections: [],
      };
    } else {
      if (!currentPart) {
        // 첫 파트 헤더 전에 나오는 섹션은 "서두" 파트로 묶는다.
        currentPart = {
          index: 1,
          title: "서두",
          startPage: e.startPage,
          endPage: e.startPage,
          sections: [],
        };
      }
      currentPart.sections.push({
        title: e.title,
        startPage: e.startPage,
        endPage: e.startPage,
      });
    }
  }
  if (currentPart) parts.push(currentPart);

  // 각 섹션/파트의 endPage 를 다음 것의 startPage - 1 로 확정.
  const allSections: BookSection[] = [];
  for (const p of parts) allSections.push(...p.sections);
  for (let i = 0; i < allSections.length; i++) {
    const next = allSections[i + 1];
    if (next) {
      allSections[i].endPage = Math.max(
        allSections[i].startPage,
        next.startPage - 1,
      );
    }
  }

  // 파트 경계 정리 — 내부 섹션의 마지막으로.
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const lastSec = p.sections[p.sections.length - 1];
    if (lastSec) {
      p.endPage = lastSec.endPage;
    }
    const nextPart = parts[i + 1];
    if (nextPart) {
      // 파트간 공백 없도록.
      p.endPage = Math.max(p.endPage, nextPart.startPage - 1);
      if (lastSec) lastSec.endPage = p.endPage;
    }
    p.index = i + 1;
  }

  const lastPart = parts[parts.length - 1];
  const lastPage = lastPart?.endPage ?? 0;
  return { parts, lastPage };
}
