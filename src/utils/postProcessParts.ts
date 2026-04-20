import { BookPart } from "@/types/book";

// Gemini OCR 결과 목차의 명백한 오류만 자동 정리.
// 사용자 의도가 의심스러우면 그대로 둔다 — 과도한 보정은 오히려 오답을 만든다.
//
// totalPagesHint: 알라딘 메타에서 가져온 책 전체 쪽수. 마지막 파트 endPage 와 비교해
// 너무 어긋나면 warning 만 띄우고 데이터는 건드리지 않는다.

const APPENDIX_RE =
  /부록|색인|찾아보기|판권|저자\s*소개|역자\s*후기|참고\s*문헌|감사의\s*말/;

export function postProcessParts(
  parts: BookPart[],
  totalPagesHint?: number,
): { parts: BookPart[]; warning?: string } {
  if (!parts.length) return { parts: [] };

  // 1) 양수 페이지 + 시작<=끝 만 통과
  let cleaned = parts.filter(
    (p) => p.startPage > 0 && p.endPage >= p.startPage,
  );

  // 2) startPage 기준 정렬 (Gemini 가 가끔 순서 섞어 보냄)
  cleaned = [...cleaned].sort((a, b) => a.startPage - b.startPage);

  // 3) 부록·색인·판권은 파트가 아니라 "꼬리" — 본문 파트에서 분리
  cleaned = cleaned.filter((p) => !APPENDIX_RE.test(p.title));

  // 4) 인접 파트의 페이지 오버랩만 정리 (i 시작 = i-1 끝 + 1).
  // 갭(틈) 은 절(장) 사이 빈 페이지일 수 있어 건드리지 않는다.
  for (let i = 1; i < cleaned.length; i++) {
    if (cleaned[i].startPage <= cleaned[i - 1].endPage) {
      cleaned[i] = {
        ...cleaned[i],
        startPage: cleaned[i - 1].endPage + 1,
      };
      // 보정 후 시작>끝 이 되면 그 파트는 의미없음 — 끝페이지도 같이 밀어준다.
      if (cleaned[i].startPage > cleaned[i].endPage) {
        cleaned[i] = { ...cleaned[i], endPage: cleaned[i].startPage };
      }
    }
  }

  // 5) index 재부여 + sections 보정.
  // Gemini 가 sections 를 아예 빼먹거나 빈 배열로 주는 경우가 있음 → 파트 전체를
  // 단일 섹션으로 합성. 이거 없으면 reading.ts 의 sections[0] 접근이 터진다.
  cleaned = cleaned.map((p, idx) => ({
    ...p,
    index: idx + 1,
    sections:
      p.sections && p.sections.length > 0
        ? p.sections
        : [{ title: p.title, startPage: p.startPage, endPage: p.endPage }],
  }));

  // 6) 알라딘 totalPages 와 마지막 endPage 비교 — 30쪽 넘게 차이나면 경고
  let warning: string | undefined;
  if (totalPagesHint && totalPagesHint > 0) {
    const last = cleaned[cleaned.length - 1];
    if (last) {
      const diff = Math.abs(last.endPage - totalPagesHint);
      if (diff > 30) {
        warning = `목차 마지막 페이지(${last.endPage})와 책 전체 쪽수(${totalPagesHint})가 ${diff}쪽 차이나요. 목차를 다시 확인해 주세요.`;
      }
    }
  }

  return { parts: cleaned, warning };
}
