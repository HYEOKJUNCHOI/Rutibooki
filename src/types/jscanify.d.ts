declare module "jscanify/client" {
  // jscanify 는 OpenCV.js 가 window.cv 에 로드된 뒤에만 동작.
  // 우리는 ScanCamera 에서만 쓰고 인자/반환 타입은 캔버스/이미지 정도라 최소 선언만.
  export default class JScanify {
    constructor();
    findPaperContour(img: unknown): unknown;
    highlightPaper(
      image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
      options?: { color?: string; thickness?: number },
    ): HTMLCanvasElement;
    extractPaper(
      image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
      resultWidth: number,
      resultHeight: number,
      cornerPoints?: {
        topLeftCorner: { x: number; y: number };
        topRightCorner: { x: number; y: number };
        bottomLeftCorner: { x: number; y: number };
        bottomRightCorner: { x: number; y: number };
      },
    ): HTMLCanvasElement | null;
    getCornerPoints(contour: unknown): {
      topLeftCorner?: { x: number; y: number };
      topRightCorner?: { x: number; y: number };
      bottomLeftCorner?: { x: number; y: number };
      bottomRightCorner?: { x: number; y: number };
    };
  }
}
