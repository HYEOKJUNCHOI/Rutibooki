// "쉬어가기" 카드에서 돌려쓰는 짧은 권유 문구.
// 사용자 등록 책은 모두 여기로 흘러와 fallback 을 탄다.
// 톤: "시간 N분" 부담 대신 "딱 첫 문장/한 장면" 같은 **작고 구체적인 행동** 훅.
// 2줄("\n") 구성 — RestNudge 레이아웃이 두 줄 전제.

export function getNudge(_bookId: string): string {
  return "딱 첫 문장만 읽어볼래요?\n한 줄이면 오늘의 독서가 열려요.";
}
