// 파서 결과 품질을 3단계 뱃지로 판정.
// 판정 기준: 섹션이 2개 이상인 파트 비율 — "계층이 잘 잡혔는가"를 간접 측정.
// "섹션=1개" = 파트가 자기 자신만 가리키는 평탄 상태(파서가 계층을 못 캔 것).
//
// AI 도입 여부 결정을 위해 룰베이스 파서의 실제 한계를 수치로 보여주는 것이 목적.

import type { BookPart } from "../types/book.ts";

export type TocAccuracy = "green" | "yellow" | "red";

export interface TocAccuracyResult {
  level: TocAccuracy;
  reason: string;
}

export function judgeTocAccuracy(parts: BookPart[]): TocAccuracyResult {
  if (parts.length === 0) {
    return { level: "red", reason: "파트 0개 — 파싱 실패 또는 목차 없음" };
  }

  // 섹션이 2개 이상인 파트(계층이 잡힌 파트) 개수 산정.
  // sections 가 비어있거나 1개뿐이면 평탄 파트로 분류.
  const hierarchical = parts.filter((p) => p.sections.length >= 2).length;
  const ratio = hierarchical / parts.length;

  const avgSections =
    parts.reduce((sum, p) => sum + p.sections.length, 0) / parts.length;

  const flatCount = parts.length - hierarchical;
  const ratioPercent = Math.round(ratio * 100);
  const avgStr = avgSections.toFixed(1);

  const reason = `평균 섹션 ${avgStr}개, 계층 파트 ${hierarchical}/${parts.length}개 (${ratioPercent}%), 평탄 파트 ${flatCount}개`;

  if (ratio >= 0.5) {
    return { level: "green", reason };
  }
  if (ratio >= 0.2) {
    return { level: "yellow", reason };
  }
  return { level: "red", reason };
}

// 뱃지 이모지 헬퍼 — 갤러리 UI 에서 표시용.
export function badgeEmoji(level: TocAccuracy): string {
  if (level === "green") return "🟢";
  if (level === "yellow") return "🟡";
  return "🔴";
}
