// jscanify 공식 타입 없음. 실제로 쓰는 메서드만 선언.
// 전역 cv (OpenCV.js) 가 로드돼 있어야 동작.

declare module "jscanify/client" {
  export default class Jscanify {
    constructor();
    highlightPaper(
      source: HTMLCanvasElement | HTMLImageElement,
      options?: { color?: string; thickness?: number },
    ): HTMLCanvasElement;
    extractPaper(
      source: HTMLCanvasElement | HTMLImageElement,
      resultWidth: number,
      resultHeight: number,
    ): HTMLCanvasElement;
  }
}

declare module "jscanify" {
  export default class Jscanify {
    constructor();
    /** 입력 canvas/img 에서 종이 엣지 감지 후 꼭짓점 하이라이트된 canvas 반환 */
    highlightPaper(
      source: HTMLCanvasElement | HTMLImageElement,
      options?: { color?: string; thickness?: number },
    ): HTMLCanvasElement;
    /** 네 꼭짓점 감지 → 원근 보정 → 지정 크기의 canvas 반환 */
    extractPaper(
      source: HTMLCanvasElement | HTMLImageElement,
      resultWidth: number,
      resultHeight: number,
    ): HTMLCanvasElement;
  }
}
