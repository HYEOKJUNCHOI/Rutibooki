"use client";

// 문서 스캔 테스트 페이지.
// 플로우 : 카메라 → 셔터 → 엣지감지 + 원근보정 → (왼쪽 완료) → 오른쪽 페이지 → OCR
//
// 핵심 개선점 (ocr-test 대비):
// 1) 인앱 카메라 — 배경(책상/키보드) 깔끔하게 뺄 수 있게 가이드 프레임
// 2) jscanify 로 네 꼭짓점 자동 감지 + 원근 왜곡 보정
// 3) 좌/우 펼침면을 한 장에 찍지 말고 한 페이지씩 2스텝으로

import { useCallback, useEffect, useRef, useState } from "react";
import CropEditor from "@/components/scan/CropEditor";

type Step = "left" | "right" | "done";
type Engine = "vision" | "paddle";

interface PageCapture {
  blob: Blob;
  previewUrl: string;
}

interface PendingRaw {
  canvas: HTMLCanvasElement;
  // [tl, tr, br, bl] — source 픽셀 좌표계, 가이드 박스 초기 위치
  initialCorners: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ];
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
  // 셔터 직후 크롭 에디터에 넘길 원본 프레임 + 초기 꼭짓점.
  const [pendingRaw, setPendingRaw] = useState<PendingRaw | null>(null);

  // 카메라 시작 — 후면카메라 우선 (모바일), 데스크탑은 기본캠.
  // step 이 촬영 단계(left/right)로 돌아올 때마다 실행 — 다시 찍기 시 video 요소가
  // 새로 마운트되기 때문에 srcObject 재연결이 필요함.
  useEffect(() => {
    if (step === "done") return;
    let aborted = false;

    const attach = async (stream: MediaStream) => {
      if (aborted || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // iOS 가 autoplay 막아도 muted + playsInline 이면 대개 OK. 실패해도 화면은 뜸.
      }
      setCameraReady(true);
    };

    (async () => {
      try {
        // 기존 stream 재활용 — 권한 다이얼로그 재노출 방지 + 지연 0.
        if (streamRef.current && streamRef.current.active) {
          await attach(streamRef.current);
          return;
        }
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
        await attach(stream);
      } catch (e) {
        setCameraError(e instanceof Error ? e.message : "camera_failed");
      }
    })();

    return () => {
      aborted = true;
    };
  }, [step]);

  // 페이지 언마운트 시에만 stream 정리 — step 바뀔 때는 유지.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // 셔터 — 비디오 풀프레임을 canvas 로 캡처하고 CropEditor 띄움.
  // 가이드 박스는 초기 꼭짓점 위치로만 사용 (source 픽셀 좌표로 역매핑).
  const shoot = useCallback(async () => {
    if (!videoRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const video = videoRef.current;
      const container = video.parentElement as HTMLElement | null;
      if (!container) throw new Error("container_null");

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) throw new Error("video_not_ready");

      // object-fit: cover 역매핑 — 가이드 박스 4 꼭짓점을 원본 픽셀 좌표로.
      const scale = Math.max(cw / vw, ch / vh);
      const displayedW = vw * scale;
      const displayedH = vh * scale;
      const offsetX = (displayedW - cw) / 2;
      const offsetY = (displayedH - ch) / 2;

      const guide = { topPct: 0.03, bottomPct: 0.03, leftPct: 0.16, rightPct: 0.16 };
      const gLeft = cw * guide.leftPct;
      const gTop = ch * guide.topPct;
      const gRight = cw * (1 - guide.rightPct);
      const gBottom = ch * (1 - guide.bottomPct);

      const toSrc = (x: number, y: number) => ({
        x: (x + offsetX) / scale,
        y: (y + offsetY) / scale,
      });

      // 원본 전체 프레임을 canvas 에 저장 — CropEditor 에서 꼭짓점 조정.
      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas_ctx_null");
      ctx.drawImage(video, 0, 0, vw, vh);

      setPendingRaw({
        canvas,
        initialCorners: [
          toSrc(gLeft, gTop),
          toSrc(gRight, gTop),
          toSrc(gRight, gBottom),
          toSrc(gLeft, gBottom),
        ],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "shoot_failed");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // CropEditor 확정 — 원근보정된 blob 을 현재 step 에 저장 + 다음 step 으로.
  const onCropConfirm = useCallback(
    (blob: Blob) => {
      const capture: PageCapture = {
        blob,
        previewUrl: URL.createObjectURL(blob),
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
      setPendingRaw(null);
    },
    [step, leftPage, rightPage],
  );

  const onCropCancel = useCallback(() => setPendingRaw(null), []);

  // 뒤로가기 — 오른쪽에서 왼쪽, done 에서 오른쪽 으로 이전 step 복귀.
  // 현재 step 의 캡처를 지우고 재촬영 모드로.
  const goBack = useCallback(() => {
    if (pendingRaw) {
      setPendingRaw(null);
      return;
    }
    if (step === "right") {
      if (leftPage) URL.revokeObjectURL(leftPage.previewUrl);
      setLeftPage(null);
      setStep("left");
    } else if (step === "done") {
      if (rightPage) URL.revokeObjectURL(rightPage.previewUrl);
      setRightPage(null);
      setStep("right");
    }
    setOcrResult(null);
  }, [step, leftPage, rightPage, pendingRaw]);

  const canGoBack = pendingRaw !== null || step === "right" || step === "done";

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
      const raw = e instanceof Error ? e.message : "ocr_failed";
      // fetch failed / ECONNREFUSED → Paddle 서버 미구동 상황으로 해석.
      const friendly =
        engine === "paddle" && /fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(raw)
          ? "Paddle 서버에 연결 실패 — 배포본에선 집 PC 서버(:8765) 접근 불가. Vision 으로 전환해주세요."
          : raw;
      setError(friendly);
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

  const capturing = step !== "done";

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        // 상단 safe-area — iOS 노치/다이내믹 아일랜드 회피.
        padding: "max(env(safe-area-inset-top, 0px), 12px) 14px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* 촬영 단계에선 제목·설명 숨김. 결과 단계에서만 작게 노출. */}
      {!capturing && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>📷 문서 스캔 테스트</h1>
          <p style={{ color: "#666", fontSize: 12, marginBottom: 14 }}>
            자동 가장자리 검출 + 원근 보정. OCR 엔진 골라서 바로 비교.
          </p>
        </>
      )}

      {/* 엔진 선택 — OCR 돌리기 직전에만 필요하므로 결과 단계에서만.
          Paddle 은 로컬 Python 사이드카(:8765) 필요 — Vercel 배포본에선 안됨. */}
      {!capturing && (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 6,
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
                {e === "vision" ? "☁️ Vision" : "🖥️ Paddle (로컬)"}
              </button>
            ))}
          </div>
          {engine === "paddle" && (
            <div style={{ fontSize: 11, color: "#c80", marginBottom: 14 }}>
              ⚠️ Paddle 은 집 PC 의 Python 서버(:8765) 에서만 돎. Vercel 배포본에선 Vision 을 써주세요.
            </div>
          )}
        </>
      )}

      {/* 스텝 인디케이터 — 항상 노출 */}
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

      {/* 스텝별 화면 — 크롭 에디터가 열려있으면 카메라 대신 그걸 보여줌 */}
      {step !== "done" && !pendingRaw && (
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
          onBack={canGoBack ? goBack : undefined}
          rightAction={
            step === "right" && !rightPage ? (
              <button onClick={skipRight} style={ghostBtn}>
                오른쪽 스킵 (왼쪽만 OCR)
              </button>
            ) : null
          }
        />
      )}

      {/* 크롭 에디터 — 셔터 직후 꼭짓점 조정 */}
      {pendingRaw && (
        <CropEditor
          source={pendingRaw.canvas}
          initialCorners={pendingRaw.initialCorners}
          onConfirm={onCropConfirm}
          onCancel={onCropCancel}
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
  onBack,
  rightAction,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  busy: boolean;
  label: string;
  hint: string;
  onShoot: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <div>
      {/* 한 줄로 압축 — 스텝 + 짧은 힌트 (폰 화면 높이 절약) */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 6,
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: "#888", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hint}
        </span>
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
          // 폰 세로 화면 가득 채우지 않게 — 뷰포트 높이의 62% 상한.
          maxHeight: "62vh",
          maxWidth: 360,
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

        {/* 셔터 — 오른쪽 벽면에 바짝, 세로 중앙보다 살짝 아래 */}
        {cameraReady && (
          <button
            onClick={onShoot}
            disabled={busy}
            aria-label="셔터"
            style={{
              position: "absolute",
              right: 6,
              top: "62%",
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

        {/* 뒤로가기 — 좌상단 떠있는 버튼 (이전 step 복귀) */}
        {onBack && (
          <button
            onClick={onBack}
            aria-label="뒤로"
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            ‹
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
