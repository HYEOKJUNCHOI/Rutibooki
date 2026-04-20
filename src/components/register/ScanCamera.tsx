"use client";

import { useEffect, useRef, useState } from "react";

// 신용카드 스캐너 방식 — 라이브 가장자리 감지 대신 고정 가이드 사각형을 보여주고,
// 사용자가 그 안에 책 펼침 페이지를 맞추면 셔터.
// 셔터 시점에 한 번만 jscanify 로 보정 시도 (실패 시 가이드 영역만 크롭).

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
  shotIndex?: number;
  shotTotal?: number;
}

// 결과 이미지 longest edge (px). OCR 정확도/용량 절충.
const OUTPUT_LONGEST_EDGE = 1600;
// 가이드 사각형 — 화면 너비/높이 대비 비율. 책 펼침은 가로가 더 김 → 4:3 가로형.
const GUIDE_W_RATIO = 0.86;
const GUIDE_H_RATIO = 0.55;

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
  const streamRef = useRef<MediaStream | null>(null);
  // jscanify 인스턴스 — OpenCV 로드 후에만 생성.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  const [status, setStatus] = useState<
    "requesting-camera" | "ready" | "capturing" | "error"
  >("requesting-camera");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // OpenCV/jscanify 로드 완료 여부. 카메라는 먼저 띄우고 cv 는 뒤에서 로드.
  const [cvReady, setCvReady] = useState(false);

  // 1) 카메라 먼저 — UX 우선.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await startCamera();
        if (cancelled) return;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setErrorMsg((e as Error).message || "camera_failed");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) OpenCV.js + jscanify 는 백그라운드 로드. 안 끝나도 셔터는 가능 (가이드 크롭 fallback).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!window.cv) await loadOpenCv();
        if (cancelled) return;
        const mod = await import("jscanify/client");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Jscanify = (mod.default ?? (mod as any)) as { new (): unknown };
        scannerRef.current = new Jscanify();
        if (cancelled) return;
        setCvReady(true);
      } catch {
        // cv 로드 실패해도 가이드 크롭으로 동작은 함 — 조용히 넘어감.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCamera() {
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

  // 3) 셔터 — 가이드 영역만 크롭 (cv 가 있고 자동 감지가 그럴듯하면 perspective 보정).
  const handleShutter = async () => {
    const video = videoRef.current;
    if (!video) return;
    setStatus("capturing");
    try {
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const ctx = captureCanvas.getContext("2d");
      if (!ctx) throw new Error("ctx_unavailable");
      ctx.drawImage(video, 0, 0);

      // 가이드 사각형을 video 픽셀 좌표로 환산 — object-fit: cover 매핑은
      // video 가 화면을 가득 채우니 가이드도 화면 기준 비율 그대로 video 좌표에 적용.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const gw = vw * GUIDE_W_RATIO;
      const gh = vh * GUIDE_H_RATIO;
      const gx = (vw - gw) / 2;
      const gy = (vh - gh) / 2;

      const aspect = gw / gh;
      const outW = OUTPUT_LONGEST_EDGE;
      const outH = Math.round(outW / aspect);

      let outCanvas: HTMLCanvasElement | null = null;

      // jscanify 로드되어 있으면 자동 감지 시도. 실패/이상하면 가이드 크롭 fallback.
      const scanner = scannerRef.current;
      if (scanner) {
        outCanvas = tryAutoExtract(scanner, captureCanvas, outW, outH);
      }

      if (!outCanvas) {
        // 가이드 영역 단순 크롭 + 스케일.
        outCanvas = document.createElement("canvas");
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) throw new Error("out_ctx_unavailable");
        outCtx.drawImage(
          captureCanvas,
          gx, gy, gw, gh,
          0, 0, outW, outH,
        );
      }

      const blob: Blob | null = await new Promise((resolve) =>
        outCanvas!.toBlob((b) => resolve(b), "image/jpeg", 0.9),
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

  return (
    <div style={fullscreenStyle}>
      <video ref={videoRef} playsInline muted style={videoStyle} />

      {/* 고정 가이드 — 화면 좌표계 기준. SVG viewBox = 100×100 으로 잡고 ratio 그대로. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={overlaySvgStyle}
      >
        {/* 어두운 마스크 + 가운데만 비움 */}
        <defs>
          <mask id="cutout">
            <rect width="100" height="100" fill="white" />
            <rect
              x={(100 - GUIDE_W_RATIO * 100) / 2}
              y={(100 - GUIDE_H_RATIO * 100) / 2}
              width={GUIDE_W_RATIO * 100}
              height={GUIDE_H_RATIO * 100}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100"
          height="100"
          fill="rgba(0,0,0,0.45)"
          mask="url(#cutout)"
        />
        {/* 가이드 테두리 — 점선 */}
        <rect
          x={(100 - GUIDE_W_RATIO * 100) / 2}
          y={(100 - GUIDE_H_RATIO * 100) / 2}
          width={GUIDE_W_RATIO * 100}
          height={GUIDE_H_RATIO * 100}
          fill="none"
          stroke="#00FF7A"
          strokeWidth="0.4"
          strokeDasharray="1.5 1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* 상단 — 닫기 / 힌트 / 진행도 */}
      <div style={topBarStyle}>
        <button onClick={onCancel} style={closeBtnStyle} aria-label="닫기">
          ×
        </button>
        <div style={topHintStyle}>
          {status === "requesting-camera" && "카메라 권한 요청 중…"}
          {status === "ready" && "📄 책 펼침을 점선 안에 맞춰 주세요"}
          {status === "capturing" && "보정 중…"}
          {status === "error" && (errorMsg ?? "오류")}
        </div>
        {shotIndex && shotTotal && (
          <div style={shotCounterStyle}>
            {shotIndex} / {shotTotal}
          </div>
        )}
      </div>

      {/* 셔터 */}
      <div style={bottomBarStyle}>
        <button
          onClick={handleShutter}
          disabled={status !== "ready"}
          style={shutterBtnStyle(status === "ready")}
          aria-label="촬영"
        >
          <span style={shutterInnerStyle} />
        </button>
        {!cvReady && status === "ready" && (
          <div style={cvHintStyle}>고급 보정 준비 중 — 지금 찍어도 OK</div>
        )}
      </div>
    </div>
  );
}

// jscanify 자동 감지 시도. 그럴듯한 사각형이면 보정된 캔버스 반환, 아니면 null.
function tryAutoExtract(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scanner: any,
  captureCanvas: HTMLCanvasElement,
  outW: number,
  outH: number,
): HTMLCanvasElement | null {
  try {
    const out = scanner.extractPaper(captureCanvas, outW, outH);
    return out ?? null;
  } catch {
    return null;
  }
}

// OpenCV.js script 동적 로드. 한 번 로드되면 window.cv 가 onRuntimeInitialized 후 사용 가능.
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
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
};

const cvHintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.6)",
  letterSpacing: "-0.2px",
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
