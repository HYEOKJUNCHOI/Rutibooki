"use client";

import { useEffect, useRef, useState } from "react";

// Phase 1: 전체화면 라이브 스캐너.
// - 후면 카메라 stream 으로 라이브 프리뷰
// - jscanify 로 종이 가장자리 4점 실시간 감지 → SVG 오버레이로 표시
// - 셔터 버튼(수동) → perspective 보정된 깨끗한 페이지 이미지를 File 로 반환
//
// OpenCV.js 는 첫 마운트 시에만 7MB 다운로드. 이후 캐시.
// SSR 회피 위해 cv/jscanify 는 useEffect 안에서만 접근.

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
  // 멀티샷 진행도 표시용 (예: "1 / 3"). 안 주면 표시 안 함.
  shotIndex?: number;
  shotTotal?: number;
}

interface Corners {
  topLeftCorner: { x: number; y: number };
  topRightCorner: { x: number; y: number };
  bottomRightCorner: { x: number; y: number };
  bottomLeftCorner: { x: number; y: number };
}

// 가장자리 감지 주기 (ms). 너무 자주면 모바일에서 발열, 너무 가끔이면 잔상.
const DETECT_INTERVAL_MS = 250;

// 결과 이미지의 기본 longest edge (px). OCR 정확도와 용량 사이 절충.
const OUTPUT_LONGEST_EDGE = 1600;

declare global {
  interface Window {
    cv?: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jscanify?: any;
  }
}

export default function ScanCamera({
  onCapture,
  onCancel,
  shotIndex,
  shotTotal,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  // 가장자리 감지용 오프스크린 캔버스 (재사용해서 GC 부담 줄임).
  const detectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // jscanify 인스턴스 — OpenCV 로드 후에만 생성.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const detectTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<
    "loading-cv" | "requesting-camera" | "ready" | "capturing" | "error"
  >("loading-cv");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 마지막으로 감지된 4 코너. SVG 오버레이 + 캡처 시 사용.
  const [corners, setCorners] = useState<Corners | null>(null);
  // 비디오 실제 해상도 — SVG viewport 매핑에 필요.
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(
    null,
  );

  // 1) OpenCV.js + jscanify 로드.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // OpenCV.js 가 이미 있으면 스킵.
        if (!window.cv) {
          await loadOpenCv();
        }
        if (cancelled) return;

        // jscanify 클라이언트 빌드 동적 import.
        const mod = await import("jscanify/client");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Jscanify = (mod.default ?? (mod as any)) as { new (): unknown };
        scannerRef.current = new Jscanify();

        if (cancelled) return;
        setStatus("requesting-camera");
        await startCamera();
        if (cancelled) return;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setErrorMsg((e as Error).message || "load_failed");
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
      stopCamera();
      if (detectTimerRef.current) {
        window.clearInterval(detectTimerRef.current);
        detectTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 비디오 메타 로드되면 감지 루프 시작.
  useEffect(() => {
    if (status !== "ready") return;
    const video = videoRef.current;
    if (!video) return;

    if (!detectCanvasRef.current) {
      detectCanvasRef.current = document.createElement("canvas");
    }

    const tick = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      // 첫 tick 에서 video 해상도 캐시.
      if (!videoSize) {
        setVideoSize({ w: video.videoWidth, h: video.videoHeight });
      }
      detectEdges(video, detectCanvasRef.current!, scannerRef.current).then(
        (c) => setCorners(c),
      );
    };

    detectTimerRef.current = window.setInterval(tick, DETECT_INTERVAL_MS);
    tick(); // 즉시 1회

    return () => {
      if (detectTimerRef.current) {
        window.clearInterval(detectTimerRef.current);
        detectTimerRef.current = null;
      }
    };
  }, [status, videoSize]);

  async function startCamera() {
    // 모바일 후면 카메라 우선. 데스크톱은 기본 웹캠.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play();
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // 3) 셔터: extractPaper 로 perspective 보정 → JPEG File.
  const handleShutter = async () => {
    const video = videoRef.current;
    const scanner = scannerRef.current;
    if (!video || !scanner) return;
    setStatus("capturing");
    try {
      // 캡처 시점의 프레임을 풀 해상도 캔버스에 한 번 더 그린다 (감지용 저해상도와 분리).
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const ctx = captureCanvas.getContext("2d");
      if (!ctx) throw new Error("ctx_unavailable");
      ctx.drawImage(video, 0, 0);

      // jscanify 가 알아서 자기 코너로 왜곡 보정. corners null 이면 이미지 전체 사용.
      // 결과 이미지 크기는 종이 비율 유지하기 어렵지만 OCR 용으론 직사각형 강제로 충분.
      const aspect = 4 / 3; // 책 페이지는 보통 가로:세로 ≈ 3:4. extractPaper 인자는 (w, h)
      const outH = OUTPUT_LONGEST_EDGE;
      const outW = Math.round(outH / aspect);
      const out: HTMLCanvasElement = scanner.extractPaper(
        captureCanvas,
        outW,
        outH,
      );
      const blob: Blob | null = await new Promise((resolve) =>
        out.toBlob((b) => resolve(b), "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("blob_failed");
      const file = new File([blob], `scan-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      onCapture(file);
    } catch (e) {
      setErrorMsg((e as Error).message || "capture_failed");
      setStatus("error");
    }
  };

  // 오버레이 좌표 변환: video 실제 해상도 → SVG viewBox 좌표 그대로 매핑.
  const overlayPath = corners
    ? `M ${corners.topLeftCorner.x} ${corners.topLeftCorner.y}
       L ${corners.topRightCorner.x} ${corners.topRightCorner.y}
       L ${corners.bottomRightCorner.x} ${corners.bottomRightCorner.y}
       L ${corners.bottomLeftCorner.x} ${corners.bottomLeftCorner.y} Z`
    : null;

  return (
    <div style={fullscreenStyle}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={videoStyle}
      />

      {/* 가장자리 오버레이 — video 실제 해상도 좌표계 기준. CSS 로 video 와 같은 box 차지. */}
      {videoSize && (
        <svg
          ref={overlaySvgRef}
          viewBox={`0 0 ${videoSize.w} ${videoSize.h}`}
          preserveAspectRatio="xMidYMid slice"
          style={overlaySvgStyle}
        >
          {overlayPath && (
            <path
              d={overlayPath}
              fill="rgba(0, 255, 122, 0.12)"
              stroke="#00FF7A"
              strokeWidth={Math.max(4, videoSize.w / 200)}
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}

      {/* 상단 힌트 / 진행도 / 닫기 */}
      <div style={topBarStyle}>
        <button onClick={onCancel} style={closeBtnStyle} aria-label="닫기">
          ×
        </button>
        <div style={topHintStyle}>
          {status === "loading-cv" && "스캐너 준비 중…"}
          {status === "requesting-camera" && "카메라 권한 요청 중…"}
          {status === "ready" &&
            (corners
              ? "📄 페이지 감지됨 — 셔터를 누르세요"
              : "📷 책 위에서 페이지를 비춰주세요")}
          {status === "capturing" && "보정 중…"}
          {status === "error" && (errorMsg ?? "오류")}
        </div>
        {shotIndex && shotTotal && (
          <div style={shotCounterStyle}>
            {shotIndex} / {shotTotal}
          </div>
        )}
      </div>

      {/* 셔터 영역 */}
      <div style={bottomBarStyle}>
        <button
          onClick={handleShutter}
          disabled={status !== "ready"}
          style={shutterBtnStyle(status === "ready")}
          aria-label="촬영"
        >
          <span style={shutterInnerStyle} />
        </button>
      </div>
    </div>
  );
}

// OpenCV.js 를 script 태그로 동적 로드. 한 번 로드되면 window.cv 가 onRuntimeInitialized 후 사용 가능.
function loadOpenCv(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.cv) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      "script[data-opencv]",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => waitForRuntime(resolve, reject));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.10.0/opencv.js";
    script.async = true;
    script.dataset.opencv = "1";
    script.onload = () => waitForRuntime(resolve, reject);
    script.onerror = () => reject(new Error("opencv_load_failed"));
    document.head.appendChild(script);
  });
}

function waitForRuntime(resolve: () => void, reject: (e: Error) => void) {
  // OpenCV.js 는 wasm 초기화가 비동기. cv.onRuntimeInitialized 가 한 번만 호출됨.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv = window.cv as any;
  if (!cv) {
    reject(new Error("cv_global_missing"));
    return;
  }
  if (cv.Mat) {
    resolve();
    return;
  }
  cv.onRuntimeInitialized = () => resolve();
}

// 비디오 한 프레임을 작은 캔버스에 그리고 jscanify 로 코너 추출.
async function detectEdges(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scanner: any,
): Promise<Corners | null> {
  // 감지는 저해상도(너비 640)에서 — 모바일 60fps 발열 방지.
  const targetW = 640;
  const scale = targetW / video.videoWidth;
  canvas.width = targetW;
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cv = window.cv as any;
    const img = cv.imread(canvas);
    const contour = scanner.findPaperContour(img);
    if (!contour) {
      img.delete();
      return null;
    }
    const c = scanner.getCornerPoints(contour, img);
    img.delete();
    if (
      !c?.topLeftCorner ||
      !c?.topRightCorner ||
      !c?.bottomLeftCorner ||
      !c?.bottomRightCorner
    ) {
      return null;
    }
    // 저해상도 좌표를 video 실해상도로 다시 스케일.
    const inv = 1 / scale;
    return {
      topLeftCorner: { x: c.topLeftCorner.x * inv, y: c.topLeftCorner.y * inv },
      topRightCorner: {
        x: c.topRightCorner.x * inv,
        y: c.topRightCorner.y * inv,
      },
      bottomRightCorner: {
        x: c.bottomRightCorner.x * inv,
        y: c.bottomRightCorner.y * inv,
      },
      bottomLeftCorner: {
        x: c.bottomLeftCorner.x * inv,
        y: c.bottomLeftCorner.y * inv,
      },
    };
  } catch {
    return null;
  }
}

const fullscreenStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#000",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000",
};

const overlaySvgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

const topBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
  color: "#FFF",
};

const closeBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.45)",
  color: "#FFF",
  border: "1px solid rgba(255,255,255,0.15)",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  fontFamily: "inherit",
};

const topHintStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 13,
  letterSpacing: "-0.2px",
  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
};

const shotCounterStyle: React.CSSProperties = {
  fontSize: 12,
  background: "rgba(0,0,0,0.5)",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.15)",
};

const bottomBarStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "24px 0 36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
};

const shutterBtnStyle = (enabled: boolean): React.CSSProperties => ({
  width: 76,
  height: 76,
  borderRadius: "50%",
  background: enabled ? "#FFF" : "#5A5A5A",
  border: "4px solid rgba(255,255,255,0.4)",
  cursor: enabled ? "pointer" : "not-allowed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: "transform 0.1s ease",
});

const shutterInnerStyle: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  background: "transparent",
  border: "1px solid #000",
};
