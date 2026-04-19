// "쉬어가기" 카드에서 돌려쓰는 짧은 권유 문구.
// 책 id -> nudge. MVP는 한 권 모드이므로 books[0] 만 실질적으로 사용됨.
//
// 톤: "시간 N분"으로 부담 주지 않고 "딱 첫 문장/한 장면"처럼 **작고 구체적인 행동** 훅으로.
// 넷플릭스 무의식에 뺏긴 사람에게는 "3분"도 크게 느껴진다.

export const nudgesByBookId: Record<string, string> = {
  primitive: "딱 첫 문장만 읽어볼래요?\n완벽한 원시인이 기다리고 있어요.",
  immutable: "딱 한 줄만요.\n변하지 않는 법칙, 오늘 하나만 가져가실래요?",
  "money-equation": "복리는 오늘 첫 문장부터 시작해요.",
  "money-talk": "돈 얘기, 오늘 한 장면만요.",
  hooked: "딱 한 문단만요. 손이 책에 닿는 그 순간이 시작이에요.",
  system: "시스템은 첫 문장에서 출발해요. 한 줄이면 돼요.",
  gratitude: "감사한 하루, 한 문장이면 충분해요.",
};

// 사용자 등록 책은 nudgesByBookId 에 없으므로 fallback 을 탄다.
// 기존 목업 문구는 모두 2줄("\n") 구성 — fallback 도 같은 리듬으로 맞춰야 RestNudge
// 렌더 시 두 번째 줄 여백이 붕 뜨지 않음.
export function getNudge(bookId: string): string {
  return (
    nudgesByBookId[bookId] ??
    "딱 첫 문장만 읽어볼래요?\n한 줄이면 오늘의 독서가 열려요."
  );
}
