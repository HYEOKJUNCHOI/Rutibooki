"use client";

import { useEffect, useRef, useState } from "react";

// 카드 스캐너 방식 + 수동 4점 보정 (CamScanner 정공법).
// 1) 라이브: 고정 점선 가이드 표시
// 2) 셔터: 프레임 정지 + 4코너 핸들 표시 (자동 검출 성공 시 그 좌표, 실패 시 가이드 모서리)
// 3) 사용자가 코너 4개를 책 모서리에 드래그 → "보정" → perspective warp → 평면 출력

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
  shotIndex?: number;
  shotTotal?: number;
}

interface Pt {
  x: number;
  y: number;
}
interface Corners {
  tl: Pt;
  tr: Pt;
  br: Pt;
  bl: Pt;
}

// 결과 이미지 longest edge (px). OCR 정확도/용량 절충.
const OUTPUT_LONGEST_EDGE = 1600;
// 가이드 사각형 — 화면 너비/높이 대비 비율. 책 펼침은 가로가 더 김.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  const [stage, setStage] = useState<"live" | "preview">("live");
  const [status, setStatus] = useState<
    "requesting-camera" | "ready" | "capturing" | "error"
  >("requesting-camera");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cvReady, setCvReady] = useState(false);

  // 프리뷰 단계 데이터
  const [previewCanvas, setPreviewCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const [corners, setCorners] = useState<Corners | null>(null);
  // SVG 화면 크기 — 코너 좌표를 화면 픽셀 ↔ 캔버스 픽셀 변환할 때 필요.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const draggingRef = useRef<keyof Corners | null>(null);

  // 1) 카메라 먼저.
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

  // 2) OpenCV/jscanify 백그라운드 로드.
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
        // cv 실패해도 수동 보정은 동작 (가이드 모서리로 시작).
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

  // 3) 셔터 — 프레임 정지 + 코너 초기화.
  const handleShutter = () => {
    const video = videoRef.current;
    if (!video) return;
    setStatus("capturing");
    try {
      const cap = document.createElement("canvas");
      cap.width = video.videoWidth;
      cap.height = video.videoHeight;
      const ctx = cap.getContext("2d");
      if (!ctx) throw new Error("ctx_unavailable");
      ctx.drawImage(video, 0, 0);

      // 자동 검출 시도 — 그럴듯한 4코너면 그 좌표, 아니면 가이드 직사각형.
      const auto = cvReady
        ? tryAutoCorners(scannerRef.current, cap)
        : null;
      const init = auto ?? guideCorners(cap.width, cap.height);

      setPreviewCanvas(cap);
      setCorners(init);
      setStage("preview");
      setStatus("ready");
    } catch (e) {
      setErrorMsg((e as Error).message || "capture_failed");
      setStatus("error");
    }
  };

  // 4) 보정 확정 — perspective warp → JPEG → onCapture.
  const handleConfirm = async () => {
    if (!previewCanvas || !corners) return;
    setStatus("capturing");
    try {
      // 출력 비율은 사용자가 잡은 4코너의 평균 가로/세로 비율 따라감.
      const wTop = dist(corners.tl, corners.tr);
      const wBot = dist(corners.bl, corners.br);
      const hLeft = dist(corners.tl, corners.bl);
      const hRight = dist(corners.tr, corners.br);
      const aspect = (wTop + wBot) / 2 / Math.max(1, (hLeft + hRight) / 2);
      const outW = OUTPUT_LONGEST_EDGE;
      const outH = Math.round(outW / Math.max(0.3, aspect));

      let outCanvas: HTMLCanvasElement | null = null;
      const scanner = scannerRef.current;
      if (scanner) {
        // jscanify extractPaper 는 cornerPoints 직접 전달 가능 — auto 검출 우회.
        outCanvas = scanner.extractPaper(previewCanvas, outW, outH, {
          topLeftCorner: corners.tl,
          topRightCorner: corners.tr,
          bottomLeftCorner: corners.bl,
          bottomRightCorner: corners.br,
        });
      }

      // cv 없으면 단순 4점 둘러싼 bounding box 크롭으로 fallback.
      if (!outCanvas) {
        const minX = Math.min(corners.tl.x, corners.bl.x);
        const maxX = Math.max(corners.tr.x, corners.br.x);
        const minY = Math.min(corners.tl.y, corners.tr.y);
        const maxY = Math.max(corners.bl.y, corners.br.y);
        const cropW = maxX - minX;
        const cropH = maxY - minY;
        const fallback = document.createElement("canvas");
        fallback.width = outW;
        fallback.height = Math.round((outW * cropH) / cropW);
        const fc = fallback.getContext("2d");
        if (!fc) throw new Error("out_ctx_unavailable");
        fc.drawImage(
          previewCanvas,
          minX, minY, cropW, cropH,
          0, 0, fallback.width, fallback.height,
        );
        outCanvas = fallback;
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

  // 5) 다시 찍기 — 라이브로 복귀.
  const handleRetake = () => {
    setPreviewCanvas(null);
    setCorners(null);
    setStage("live");
  };

  // 스테이지 크기 측정 — 코너 좌표 매핑용.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);

  // 코너 드래그 핸들러 — 캔버스 좌표계로 변환해서 저장.
  const onPointerDown = (key: keyof Corners) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = key;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !previewCanvas || !stageSize) return;
    const rect = stageRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // SVG 는 object-fit: contain 으로 캔버스 비율 유지 → 좌표 변환에 이미지 표시 영역 계산 필요.
    const view = computeContainView(
      previewCanvas.width,
      previewCanvas.height,
      stageSize.w,
      stageSize.h,
    );
    const cx = ((sx - view.left) / view.width) * previewCanvas.width;
    const cy = ((sy - view.top) / view.height) * previewCanvas.height;
    const clamped: Pt = {
      x: Math.max(0, Math.min(previewCanvas.width, cx)),
      y: Math.max(0, Math.min(previewCanvas.height, cy)),
    };
    setCorners((prev) =>
      prev ? { ...prev, [draggingRef.current!]: clamped } : prev,
    );
  };
  const onPointerUp = () => {
    draggingRef.current = null;
  };

  // ── 라이브 단계 ──
  if (stage === "live") {
    return (
      <div style={fullscreenStyle}>
        <video ref={videoRef} playsInline muted style={videoStyle} />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={overlaySvgStyle}
        >
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

        <div style={topBarStyle}>
          <button onClick={onCancel} style={closeBtnStyle} aria-label="닫기">
            ×
          </button>
          <div style={topHintStyle}>
            {status === "requesting-camera" && "카메라 권한 요청 중…"}
            {status === "ready" && "📄 책 펼침을 점선 안에 맞춰 주세요"}
            {status === "capturing" && "캡처 중…"}
            {status === "error" && (errorMsg ?? "오류")}
          </div>
          {shotIndex && shotTotal && (
            <div style={shotCounterStyle}>
              {shotIndex} / {shotTotal}
            </div>
          )}
        </div>

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

  // ── 프리뷰 단계 — 4점 보정 ──
  const view =
    previewCanvas && stageSize
      ? computeContainView(
          previewCanvas.width,
          previewCanvas.height,
          stageSize.w,
          stageSize.h,
        )
      : null;
  // 코너 → 화면 좌표.
  const screenPt = (p: Pt) =>
    view && previewCanvas
      ? {
          x: view.left + (p.x / previewCanvas.width) * view.width,
          y: view.top + (p.y / previewCanvas.height) * view.height,
        }
      : { x: 0, y: 0 };

  const sTl = corners ? screenPt(corners.tl) : null;
  const sTr = corners ? screenPt(corners.tr) : null;
  const sBr = corners ? screenPt(corners.br) : null;
  const sBl = corners ? screenPt(corners.bl) : null;

  return (
    <div
      ref={stageRef}
      style={fullscreenStyle}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {previewCanvas && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewCanvas.toDataURL("image/jpeg", 0.85)}
          alt="capture"
          style={previewImgStyle}
          draggable={false}
        />
      )}

      {sTl && sTr && sBr && sBl && (
        <svg style={overlaySvgStyle}>
          <path
            d={`M ${sTl.x} ${sTl.y} L ${sTr.x} ${sTr.y} L ${sBr.x} ${sBr.y} L ${sBl.x} ${sBl.y} Z`}
            fill="rgba(0, 255, 122, 0.10)"
            stroke="#00FF7A"
            strokeWidth={2}
          />
        </svg>
      )}

      {sTl && (
        <Handle pos={sTl} onPointerDown={onPointerDown("tl")} label="↖" />
      )}
      {sTr && (
        <Handle pos={sTr} onPointerDown={onPointerDown("tr")} label="↗" />
      )}
      {sBr && (
        <Handle pos={sBr} onPointerDown={onPointerDown("br")} label="↘" />
      )}
      {sBl && (
        <Handle pos={sBl} onPointerDown={onPointerDown("bl")} label="↙" />
      )}

      <div style={topBarStyle}>
        <button onClick={handleRetake} style={closeBtnStyle} aria-label="다시">
          ←
        </button>
        <div style={topHintStyle}>
          📐 4개 점을 책 모서리에 맞춰 주세요
        </div>
      </div>

      <div style={previewBottomStyle}>
        <button onClick={handleRetake} style={secondaryBtnStyle}>
          다시 찍기
        </button>
        <button
          onClick={handleConfirm}
          disabled={status === "capturing"}
          style={primaryBtnStyle(status !== "capturing")}
        >
          {status === "capturing" ? "보정 중…" : "보정하기"}
        </button>
      </div>
    </div>
  );
}

// ── helpers ──

function Handle({
  pos,
  onPointerDown,
  label,
}: {
  pos: Pt;
  onPointerDown: (e: React.PointerEvent) => void;
  label: string;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left: pos.x - 22,
        top: pos.y - 22,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "rgba(0, 255, 122, 0.25)",
        border: "2px solid #00FF7A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00FF7A",
        fontSize: 16,
        fontWeight: 700,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        backdropFilter: "blur(4px)",
      }}
    >
      {label}
    </div>
  );
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function guideCorners(canvasW: number, canvasH: number): Corners {
  const gw = canvasW * GUIDE_W_RATIO;
  const gh = canvasH * GUIDE_H_RATIO;
  const gx = (canvasW - gw) / 2;
  const gy = (canvasH - gh) / 2;
  return {
    tl: { x: gx, y: gy },
    tr: { x: gx + gw, y: gy },
    br: { x: gx + gw, y: gy + gh },
    bl: { x: gx, y: gy + gh },
  };
}

// jscanify 자동 검출 시도 — 너무 작거나 마름모면 null 반환해서 가이드 모서리 쓰게.
function tryAutoCorners(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scanner: any,
  cap: HTMLCanvasElement,
): Corners | null {
  try {
    const contour = scanner.findPaperContour(cap);
    if (!contour) return null;
    const c = scanner.getCornerPoints(contour, cap);
    if (!c?.topLeftCorner || !c?.topRightCorner || !c?.bottomLeftCorner || !c?.bottomRightCorner) {
      return null;
    }
    const corners: Corners = {
      tl: c.topLeftCorner,
      tr: c.topRightCorner,
      br: c.bottomRightCorner,
      bl: c.bottomLeftCorner,
    };
    // 너무 작으면 (전체 면적의 10% 미만) — 노이즈로 보고 거부.
    const w = (dist(corners.tl, corners.tr) + dist(corners.bl, corners.br)) / 2;
    const h = (dist(corners.tl, corners.bl) + dist(corners.tr, corners.br)) / 2;
    if (w * h < cap.width * cap.height * 0.1) return null;
    return corners;
  } catch {
    return null;
  }
}

// object-fit: contain 으로 표시할 때 이미지가 차지하는 영역을 stage 안에서 계산.
function computeContainView(
  imgW: number,
  imgH: number,
  stageW: number,
  stageH: number,
): { left: number; top: number; width: number; height: number } {
  const imgAspect = imgW / imgH;
  const stageAspect = stageW / stageH;
  if (imgAspect > stageAspect) {
    const w = stageW;
    const h = w / imgAspect;
    return { left: 0, top: (stageH - h) / 2, width: w, height: h };
  } else {
    const h = stageH;
    const w = h * imgAspect;
    return { left: (stageW - w) / 2, top: 0, width: w, height: h };
  }
}

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

// ── styles ──

const fullscreenStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#000",
  zIndex: 10000,
  overflow: "hidden",
  touchAction: "none",
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000",
};

const previewImgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "#000",
  pointerEvents: "none",
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
  fontSize: 20,
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

const previewBottomStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "20px 18px 28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  height: 50,
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  color: "#FFF",
  border: "1px solid rgba(255,255,255,0.2)",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const primaryBtnStyle = (enabled: boolean): React.CSSProperties => ({
  flex: 2,
  height: 50,
  borderRadius: 12,
  background: enabled ? "#00FF7A" : "#2A4A38",
  color: enabled ? "#000" : "#5A5A5A",
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: enabled ? "pointer" : "not-allowed",
  fontFamily: "inherit",
});
