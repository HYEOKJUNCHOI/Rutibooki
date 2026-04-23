// AI 분류 결과 + raw 줄을 합쳐 BookPart[] 형태로 재조립.
// 페이지 번호는 AI 가 아니라 여기서 룰 기반(줄 끝 숫자 + 균등 분배)으로 채움 — 할루시네이션 차단.

import type { BookPart, BookSection } from "../types/book.ts";
import type { LineClassification } from "./tocClassifierAI.ts";

// "... 123" 처럼 줄 끝 페이지 숫자가 있으면 추출. 없으면 0.
// 괄호/점 뒤에 붙은 "p.12" 같은 표기도 수용.
function extractTailPage(line: string): { cleanTitle: string; page: number } {
  const m = line.match(/^(.*?)(?:[\s\u00a0.·_\-]+)(?:p\.?\s*)?(\d{1,4})\s*$/);
  if (!m) return { cleanTitle: line.trim(), page: 0 };
  const page = Number(m[2]);
  if (!Number.isFinite(page) || page < 1 || page > 9999) {
    return { cleanTitle: line.trim(), page: 0 };
  }
  return { cleanTitle: m[1].trim(), page };
}

// "LEVEL 1: 생존" → label: "LEVEL 1", title: "생존"
// "1장. 거짓말" → label: "1장", title: "거짓말"
// "BUTTON 3. 5초의 마법, 호흡" → label: "BUTTON 3", title: "5초의 마법, 호흡"
// 패턴에 안 걸리면 전체를 title 로 두고 label 빈값.
function splitLabelTitle(line: string): { label: string; title: string } {
  const patterns: Array<RegExp> = [
    /^(LEVEL\s+\d+)\s*[:：]\s*(.+)$/,
    /^(BUTTON\s+\d+)\s*[.。]\s*(.+)$/,
    /^(START|END|ERROR)\s*[:：]\s*(.+)$/,
    /^(제?\s*\d+\s*부)\s*[:：.\s]?\s*(.+)$/,
    /^(제?\s*\d+\s*장)\s*[:：.\s]?\s*(.+)$/,
    /^(\d+장)\s*[.。]\s*(.+)$/,
    /^(HOW\s+TO\s+\d+|WHAT\s+TO\s+\d+|DIARY\s+\d+)\s+(.+)$/,
    /^(나침반\s*\d+|키워드\s*\d+)\s*[:：.\s]?\s*(.+)$/,
    /^(생각의\s*화두\s*\d+)\s*[:：]\s*(.+)$/,
    /^(\d+)\.\s+(.+)$/,
    /^(프롤로그|에필로그|서문|서론|머리말|맺음말|들어가는\s*글|들어가며|나오며|추천사|감사의\s*글|옮긴이의?\s*말|후기|부록|찾아보기)\s*[:：\-\s]*\s*(.*)$/,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) {
      const label = m[1].replace(/\s+/g, " ").trim();
      const title = (m[2] ?? "").trim() || label;
      return { label, title };
    }
  }
  return { label: "", title: line.trim() };
}

// 균등 분배 — kyoboScraper 와 동일 로직.
function fillPages(parts: BookPart[], totalPages: number) {
  if (totalPages <= 0 || parts.length === 0) {
    parts.forEach((p) => {
      if (p.sections.length === 0) {
        p.sections.push({ title: p.title, startPage: 0, endPage: 0 });
      }
    });
    return;
  }
  const per = Math.floor(totalPages / parts.length);
  let cursor = 1;
  parts.forEach((p, i) => {
    p.startPage = cursor;
    p.endPage = i === parts.length - 1 ? totalPages : cursor + per - 1;
    cursor = p.endPage + 1;
    if (p.sections.length > 0) {
      const secPer = Math.max(
        1,
        Math.floor((p.endPage - p.startPage + 1) / p.sections.length),
      );
      let secCursor = p.startPage;
      p.sections.forEach((s, si) => {
        s.startPage = secCursor;
        s.endPage =
          si === p.sections.length - 1 ? p.endPage : secCursor + secPer - 1;
        secCursor = s.endPage + 1;
      });
    } else {
      p.sections.push({
        title: p.title,
        startPage: p.startPage,
        endPage: p.endPage,
      });
    }
  });
}

export interface BuildTreeOptions {
  totalPages: number;
}

export function buildTocTreeFromAI(
  lines: string[],
  classifications: LineClassification[],
  opts: BuildTreeOptions,
): BookPart[] {
  // lineIndex 기반 맵.
  const byIdx = new Map<number, LineClassification>();
  for (const c of classifications) byIdx.set(c.lineIndex, c);

  const parts: BookPart[] = [];
  // 라인 → part index 매핑 (section 부모 찾을 때 사용).
  const lineToPartIdx = new Map<number, number>();

  // 1 패스: CHAPTER 먼저 등록.
  let partIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const c = byIdx.get(i);
    if (!c || c.kind !== "CHAPTER") continue;
    partIndex++;
    const { label, title } = splitLabelTitle(lines[i]);
    const { cleanTitle, page } = extractTailPage(title);
    parts.push({
      index: partIndex,
      label,
      title: cleanTitle,
      startPage: page,
      endPage: 0,
      sections: [],
    });
    lineToPartIdx.set(i, parts.length - 1);
  }

  // CHAPTER 가 하나도 없으면 LEAF 를 개별 PART 로 승격 — 파싱 완전 실패 방지.
  if (parts.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const c = byIdx.get(i);
      if (!c || c.kind === "SKIP") continue;
      partIndex++;
      const { label, title } = splitLabelTitle(lines[i]);
      const { cleanTitle } = extractTailPage(title);
      parts.push({
        index: partIndex,
        label,
        title: cleanTitle,
        startPage: 0,
        endPage: 0,
        sections: [],
      });
    }
    fillPages(parts, opts.totalPages);
    return parts;
  }

  // 2 패스: SECTION / LEAF 를 parentLineIndex 를 따라 해당 파트에 부착.
  //    - SECTION 이 CHAPTER 의 자식이면 그냥 sections 에 하나 추가.
  //    - LEAF 가 SECTION 의 자식이면 그 SECTION 라벨을 subtitle 로 묶어 LEAF 를 section 으로 둔다.
  //      (Book 타입이 3단 계층을 지원하지 않아 섹션으로 flatten.)
  for (let i = 0; i < lines.length; i++) {
    const c = byIdx.get(i);
    if (!c) continue;
    if (c.kind !== "LEAF" && c.kind !== "SECTION") continue;

    // 조상 CHAPTER 찾기 — parent 가 SECTION 이면 그 SECTION 의 parent 로 올라감.
    let cursor: number | null = c.parentLineIndex;
    let guard = 0;
    while (cursor !== null && guard < 20) {
      const pc = byIdx.get(cursor);
      if (!pc) break;
      if (pc.kind === "CHAPTER") break;
      cursor = pc.parentLineIndex;
      guard++;
    }
    if (cursor === null) continue;
    const partIdx = lineToPartIdx.get(cursor);
    if (partIdx === undefined) continue;

    const { label, title } = splitLabelTitle(lines[i]);
    const { cleanTitle, page } = extractTailPage(title);

    // SECTION 의 경우 단순히 헤더로만 쓰고 자식 LEAF 는 위 로직으로 같은 PART 로 들어옴 —
    // 별도 노드로 저장하지 않으면 LEVEL/BUTTON 구조에서 BUTTON 라벨이 유실됨 → section 으로도 유지.
    const sec: BookSection = {
      title: cleanTitle,
      startPage: page,
      endPage: 0,
      label: label || undefined,
    };
    parts[partIdx].sections.push(sec);
  }

  fillPages(parts, opts.totalPages);
  return parts;
}
