"use client";

// 문서 스캔 테스트 페이지.
// 플로우 : 카메라 → 셔터 → 엣지감지 + 원근보정 → (왼쪽 완료) → 오른쪽 페이지 → OCR
//
// 핵심 개선점 (ocr-test 대비):
// 1) 인앱 카메라 — 배경(책상/키보드) 깔끔하게 뺄 수 있게 가이드 프레임
// 2) jscanify 로 네 꼭짓점 자동 감지 + 원근 왜곡 보정
// 3) 좌/우 펼침면을 한 장에 찍지 말고 한 페이지씩 2스텝으로

import { useCallback, useEffect, useRef, useState } from "react";

type Step = "left" | "right" | "done";
type Engine = "vision" | "paddle";

interface PageCapture {
  blob: Blob;
  previewUrl: string;
}

interface OcrResponse {
  engine: Engine;
  text: string;
  lines: string[];
  blockCount: number;
}

export default function ScanTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("left");
  const [leftPage, setLeftPage] = useState<PageCapture | null>(null);
  const [rightPage, setRightPage] = useState<PageCapture | null>(null);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<Engine>("vision");
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 카메라 시작 — 후면카메라 우선 (모바일), 데스크탑은 기본캠
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (aborted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (e) {
        setCameraError(e instanceof Error ? e.message : "camera_failed");
      }
    })();
    return () => {
      aborted = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // 셔터 — 비디오 프레임 → canvas → jscanify → blob
  const shoot = useCallback(async () => {
    if (!videoRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas_ctx_null");
      ctx.drawImage(video, 0, 0);

      // 동적 import — /dev/scan-test 들어올 때만 OpenCV.js 3MB 로드
      const { scanDocument } = await import("@/lib/docScan");
      const result = await scanDocument(canvas);

      const capture: PageCapture = {
        blob: result.blob,
        previewUrl: URL.createObjectURL(result.blob),
      };

      if (step === "left") {
        if (leftPage) URL.revokeObjectURL(leftPage.previewUrl);
        setLeftPage(capture);
        setStep("right");
      } else if (step === "right") {
        if (rightPage) URL.revokeObjectURL(rightPage.previewUrl);
        setRightPage(capture);
        setStep("done");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "shoot_failed");
    } finally {
      setBusy(false);
    }
  }, [busy, step, leftPage, rightPage]);

  // 재촬영
  const retake = (which: "left" | "right") => {
    if (which === "left") {
      if (leftPage) URL.revokeObjectURL(leftPage.previewUrl);
      setLeftPage(null);
      setStep("left");
    } else {
      if (rightPage) URL.revokeObjectURL(rightPage.previewUrl);
      setRightPage(null);
      setStep("right");
    }
    setOcrResult(null);
  };

  // 단일 페이지만 사용 (오른쪽 스킵)
  const skipRight = () => setStep("done");

  // OCR 실행
  const runOcr = async () => {
    if (!leftPage) return;
    setBusy(true);
    setError(null);
    setOcrResult(null);
    try {
      const callOne = async (blob: Blob, name: string): Promise<OcrResponse> => {
        const fd = new FormData();
        fd.append("file", new File([blob], name, { type: "image/jpeg" }));
        const r = await fetch(`/api/ocr?engine=${engine}`, { method: "POST", body: fd });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || data.error || `HTTP ${r.status}`);
        return data as OcrResponse;
      };

      if (rightPage) {
        const [l, r] = await Promise.all([
          callOne(leftPage.blob, "left.jpg"),
          callOne(rightPage.blob, "right.jpg"),
        ]);
        setOcrResult(`━━━ 왼쪽 ━━━\n${l.text}\n\n━━━ 오른쪽 ━━━\n${r.text}`);
      } else {
        const l = await callOne(leftPage.blob, "page.jpg");
        setOcrResult(l.text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ocr_failed");
    } finally {
      setBusy(false);
    }
  };

  // 전체 리셋
  const resetAll = () => {
    if (leftPage) URL.revokeObjectURL(leftPage.previewUrl);
    if (rightPage) URL.revokeObjectURL(rightPage.previewUrl);
    setLeftPage(null);
    setRightPage(null);
    setStep("left");
    setOcrResult(null);
    setError(null);
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📷 문서 스캔 테스트</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        책 펼침면을 한 페이지씩 찍으면 자동으로 가장자리 검출해서 반듯하게 펴줍니다.
      </p>

      {/* 엔진 선택 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          padding: 4,
          background: "#f3f3f3",
          borderRadius: 8,
          width: "fit-content",
        }}
      >
        {(["vision", "paddle"] as Engine[]).map((e) => (
          <button
            key={e}
            onClick={() => setEngine(e)}
            style={{
              padding: "8px 14px",
              background: engine === e ? "#222" : "transparent",
              color: engine === e ? "#fff" : "#555",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {e === "vision" ? "☁️ Vision" : "🖥️ Paddle"}
          </button>
        ))}
      </div>

      {/* 스텝 인디케이터 */}
      <Stepper step={step} hasLeft={!!leftPage} hasRight={!!rightPage} />

      {cameraError && (
        <div
          style={{
            padding: 12,
            background: "#fee",
            color: "#c00",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          카메라 접근 실패: {cameraError}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            background: "#fee",
            color: "#c00",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* 스텝별 화면 */}
      {step !== "done" && (
        <CameraPanel
          videoRef={videoRef}
          cameraReady={cameraReady}
          busy={busy}
          label={step === "left" ? "1 / 2 · 왼쪽 페이지" : "2 / 2 · 오른쪽 페이지"}
          hint={
            step === "left"
              ? "가이드 안에 왼쪽 페이지를 꽉 차게 맞춰주세요"
              : "이번엔 오른쪽 페이지. 한 페이지만 쓰려면 '오른쪽 스킵'."
          }
          onShoot={shoot}
          rightAction={
            step === "right" && !rightPage ? (
              <button onClick={skipRight} style={ghostBtn}>
                오른쪽 스킵 (왼쪽만 OCR)
              </button>
            ) : null
          }
        />
      )}

      {/* 캡처 결과 */}
      {(leftPage || rightPage) && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>캡처된 페이지</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <CaptureCard
              label="왼쪽"
              page={leftPage}
              onRetake={() => retake("left")}
            />
            <CaptureCard
              label="오른쪽"
              page={rightPage}
              onRetake={rightPage ? () => retake("right") : undefined}
              placeholder={step === "done" && !rightPage ? "스킵됨" : undefined}
            />
          </div>
        </div>
      )}

      {/* OCR + 리셋 */}
      {step === "done" && (
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button
            onClick={runOcr}
            disabled={busy}
            style={{
              ...primaryBtn,
              opacity: busy ? 0.5 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "인식 중..." : `${engine === "vision" ? "Vision" : "Paddle"} 으로 OCR 실행`}
          </button>
          <button onClick={resetAll} style={ghostBtn}>
            처음부터
          </button>
        </div>
      )}

      {/* OCR 결과 */}
      {ocrResult && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>OCR 결과 [{engine}]</h2>
          <pre
            style={{
              background: "#0b0b0b",
              color: "#eaeaea",
              padding: 14,
              borderRadius: 6,
              fontSize: 12,
              maxHeight: 500,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {ocrResult}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---- sub components --------------------------------------------------------

function Stepper({
  step,
  hasLeft,
  hasRight,
}: {
  step: Step;
  hasLeft: boolean;
  hasRight: boolean;
}) {
  const items = [
    { key: "left", label: "왼쪽 페이지", done: hasLeft },
    { key: "right", label: "오른쪽 페이지", done: hasRight },
    { key: "done", label: "OCR", done: step === "done" && !!(hasLeft || hasRight) },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      {items.map((it, i) => {
        const active = step === it.key;
        return (
          <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: it.done ? "#3ddc97" : active ? "#222" : "#eee",
                color: it.done ? "#000" : active ? "#fff" : "#999",
              }}
            >
              <span>{it.done ? "✓" : i + 1}</span>
              <span>{it.label}</span>
            </div>
            {i < items.length - 1 && <span style={{ color: "#ccc" }}>→</span>}
          </div>
        );
      })}
    </div>
  );
}

function CameraPanel({
  videoRef,
  cameraReady,
  busy,
  label,
  hint,
  onShoot,
  rightAction,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  busy: boolean;
  label: string;
  hint: string;
  onShoot: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: "#666" }}>{hint}</span>
      </div>

      {/*
        - 카메라 영역은 세로(포트레이트) — A4 세워놓고 한 페이지씩 찍는 용도.
        - 가이드 프레임은 A4 비율(√2 ≈ 1.414) 근사 → 가로 68%, 세로 약 96%.
          (컨테이너가 3:4 이므로 계산: 68% × 4/3 ≈ 90% → 96%/90% = 1.06, 실사용 OK)
        - 셔터는 오른쪽에 플로팅 원형 버튼 (아이폰 가로모드 카메라 감성).
      */}
      <div
        style={{
          position: "relative",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          aspectRatio: "3 / 4",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* 가이드 프레임 — A4 세로형, 빨간 실선 */}
        {cameraReady && (
          <div
            style={{
              position: "absolute",
              top: "3%",
              bottom: "3%",
              left: "16%",
              right: "16%",
              border: "3px solid #FF3B30",
              borderRadius: 4,
              pointerEvents: "none",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            }}
          />
        )}

        {/* 셔터 — 오른쪽 세로 중앙 플로팅 */}
        {cameraReady && (
          <button
            onClick={onShoot}
            disabled={busy}
            aria-label="셔터"
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#fff",
              border: "4px solid rgba(255,255,255,0.45)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.45 : 1,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "#fff",
                border: "2px solid #000",
                display: "block",
              }}
            />
          </button>
        )}

        {!cameraReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
            }}
          >
            카메라 시작 중...
          </div>
        )}

        {busy && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
            }}
          >
            처리 중...
          </div>
        )}
      </div>

      {rightAction && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          {rightAction}
        </div>
      )}
    </div>
  );
}

function CaptureCard({
  label,
  page,
  onRetake,
  placeholder,
}: {
  label: string;
  page: PageCapture | null;
  onRetake?: () => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 8,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        {onRetake && (
          <button
            onClick={onRetake}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              background: "transparent",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            다시 찍기
          </button>
        )}
      </div>
      {page ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.previewUrl}
          alt={label}
          style={{ width: "100%", display: "block", borderRadius: 4 }}
        />
      ) : (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "#f0f0f0",
            borderRadius: 4,
            color: "#999",
            fontSize: 12,
          }}
        >
          {placeholder ?? "대기 중"}
        </div>
      )}
    </div>
  );
}

// ---- styles ----------------------------------------------------------------

const primaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#3ddc97",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "#444",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};
