// "쉬어가기" 카드에서 돌려쓰는 짧은 권유 문구.
// 책 id -> nudge. MVP는 한 권 모드이므로 books[0] 만 실질적으로 사용됨.

export const nudgesByBookId: Record<string, string> = {
  primitive: "3분만 읽어보는 건 어때요?\n완벽한 원시인이 기다리고 있어요.",
  immutable: "딱 한 챕터예요.\n변하지 않는 법칙, 오늘 확인해보실래요?",
  "money-equation": "복리는 오늘 읽은 페이지부터 시작해요.",
  "money-talk": "돈 얘기, 오늘 딱 10분만요.",
  hooked: "습관은 끊기는 순간 리셋돼요. 3분만요.",
  system: "목표 없이 시스템만 있으면 된대요. 15분이면 충분해요.",
  gratitude: "감사한 하루, 11분으로 완성해볼까요?",
};

export function getNudge(bookId: string): string {
  return nudgesByBookId[bookId] ?? "오늘도, 한 페이지라도 괜찮아요.";
}
