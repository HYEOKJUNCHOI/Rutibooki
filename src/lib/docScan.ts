// 문서 스캔 유틸 — jscanify(OpenCV.js 래퍼) 로 엣지 감지 + 원근 보정.
//
// 주의: jscanify 는 전역 `cv` (OpenCV.js) 가 로드돼 있어야 동작.
// Next.js 클라이언트 컴포넌트에서 `loadOpenCv()` 먼저 await 한 뒤 사용.
//
// 번들 부담 회피 — 이 모듈은 /dev/scan-test 에서만 dynamic import.

const OPENCV_SRC = "https://docs.opencv.org/4.10.0/opencv.js";

let cvPromise: Promise<void> | null = null;

/** OpenCV.js 를 <script> 로 한 번만 로드. 브라우저 전용. */
export function loadOpenCv(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadOpenCv: browser only"));
  }
  if (cvPromise) return cvPromise;

  cvPromise = new Promise<void>((resolve, reject) => {
    // 이미 전역에 있으면 바로 성공
    // (개발 중 HMR 로 재실행될 때 대비)
    const w = window as unknown as { cv?: { onRuntimeInitialized?: () => void; Mat?: unknown } };
    if (w.cv && w.cv.Mat) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${OPENCV_SRC}"]`);
    if (existing) {
      // 스크립트는 있는데 아직 초기화 콜백 대기 중.
      const poll = setInterval(() => {
        const c = (window as unknown as { cv?: { Mat?: unknown } }).cv;
        if (c && c.Mat) {
          clearInterval(poll);
          resolve();
        }
      }, 50);
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_SRC;
    script.async = true;
    script.onload = () => {
      const c = (window as unknown as {
        cv?: { onRuntimeInitialized?: () => void; Mat?: unknown };
      }).cv;
      if (!c) {
        reject(new Error("opencv_not_found"));
        return;
      }
      // OpenCV.js 는 WASM 초기화 후에 Mat 가 생김.
      if (c.Mat) {
        resolve();
      } else {
        c.onRuntimeInitialized = () => resolve();
      }
    };
    script.onerror = () => reject(new Error("opencv_script_failed"));
    document.body.appendChild(script);
  });

  return cvPromise;
}

// jscanify 는 default export 인 클래스.
// 타입 선언이 없어서 느슨하게 any 에 가깝게 처리.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Jscanify = any;

let scannerPromise: Promise<Jscanify> | null = null;

/** jscanify 스캐너 싱글턴. OpenCV 선행 로드 포함. */
export async function getScanner(): Promise<Jscanify> {
  if (scannerPromise) return scannerPromise;
  scannerPromise = (async () => {
    await loadOpenCv();
    // NOTE: jscanify 기본 export 는 Node 전용(jsdom 포함)이라 클라이언트 번들에서 터짐.
    // `jscanify/client` 서브패스가 브라우저용 빌드(전역 cv 필요).
    const mod = await import("jscanify/client");
    // jscanify 패키지는 default export 가 클래스. 일부 번들에선 .default 가 필요.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Cls = (mod as any).default ?? (mod as any);
    return new Cls();
  })();
  return scannerPromise;
}

// ---- 공개 API --------------------------------------------------------------

export interface ScanResult {
  /** 원근 보정된 깨끗한 페이지 이미지 (jpeg) */
  blob: Blob;
  /** 보정 결과 canvas width/height */
  width: number;
  height: number;
}

/**
 * 입력 캔버스/이미지에서 종이 네 꼭짓점 감지 → 원근 보정 → jpeg blob 반환.
 * 감지 실패 시엔 원본 그대로 반환 (fallback).
 */
export async function scanDocument(
  source: HTMLCanvasElement | HTMLImageElement,
  opts?: { outWidth?: number; outHeight?: number; quality?: number },
): Promise<ScanResult> {
  const scanner = await getScanner();

  // 입력을 canvas 로 통일
  const srcCanvas = toCanvas(source);

  // 출력 해상도 — 지정 안 하면 원본 유지 (A4 비율 아님 주의)
  const outW = opts?.outWidth ?? srcCanvas.width;
  const outH = opts?.outHeight ?? srcCanvas.height;

  let resultCanvas: HTMLCanvasElement;
  try {
    // jscanify API: extractPaper(source, targetWidth, targetHeight)
    resultCanvas = scanner.extractPaper(srcCanvas, outW, outH);
    // 감지가 부분 실패하면 0×0 이나 비정상 canvas 가 나와서 toBlob 이 null 을 뱉음.
    // 사이즈 체크로 명시적 fallback.
    if (!resultCanvas || !resultCanvas.width || !resultCanvas.height) {
      resultCanvas = srcCanvas;
    }
  } catch {
    // 감지 실패 — 원본 그대로
    resultCanvas = srcCanvas;
  }

  let blob: Blob;
  try {
    blob = await canvasToBlob(resultCanvas, "image/jpeg", opts?.quality ?? 0.92);
  } catch {
    // 마지막 안전망 — 변형 canvas 가 tainted/0-size 여도 원본에서 다시 시도.
    blob = await canvasToBlob(srcCanvas, "image/jpeg", opts?.quality ?? 0.92);
    resultCanvas = srcCanvas;
  }
  return { blob, width: resultCanvas.width, height: resultCanvas.height };
}

/**
 * 실시간 가이드용 — 감지된 네 꼭짓점을 오버레이한 canvas 반환.
 * 실패 시 원본 그대로.
 */
export async function highlightPaper(
  source: HTMLCanvasElement | HTMLImageElement,
): Promise<HTMLCanvasElement> {
  const scanner = await getScanner();
  const srcCanvas = toCanvas(source);
  try {
    return scanner.highlightPaper(srcCanvas);
  } catch {
    return srcCanvas;
  }
}

// ---- helpers ---------------------------------------------------------------

function toCanvas(src: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  if (src instanceof HTMLCanvasElement) return src;
  const c = document.createElement("canvas");
  c.width = src.naturalWidth || src.width;
  c.height = src.naturalHeight || src.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas_ctx_null");
  ctx.drawImage(src, 0, 0);
  return c;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob_null"))), type, quality);
  });
}
