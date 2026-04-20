// 알라딘 TTB API 응답에서 우리 화면이 실제로 쓰는 필드만 추려둔 타입.
// 백그라운드 메타 보강용 — UI 에 검색창은 노출하지 않는다(헌법: 사진 입력만).

export interface AladinBook {
  isbn13: string;
  title: string;
  author: string;
  publisher: string;
  cover: string;
  pubDate: string;
  itemPage: number;
}
