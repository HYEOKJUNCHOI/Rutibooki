"use client";

// 문서 스캔 테스트 페이지 — 한 페이지씩 N장 자유 캡처.
// 플로우: 카메라 → 셔터 → 크롭 에디터 → 슬롯에 저장 → 다음 슬롯 → ... → 촬영 완료 → OCR

import { useCallback, useEffect, useRef, useState } from "react";
import CropEditor from "@/components/scan/CropEditor";

type Engine = "vision" | "paddle";

// 한 번에 받을 수 있는 최대 페이지 수. 6장이면 보통 단편 챕터 하나는 커버.
const MAX_SLOTS = 6;
const ACCENT = "#00FF7A";

interface PageCapture {
  blob: Blob;
  previewUrl: string;
}

interface PendingRaw {
  canvas: HTMLCanvasElement;
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
  // 페이지 슬롯 — 인덱스 = 슬롯 번호(0-based). 비어있으면 null.
  const [pages, setPages] = useState<(PageCapture | null)[]>(() =>
    Array(MAX_SLOTS).fill(null),
  );
  // 현재 촬영하려는 슬롯 인덱스. null = 촬영 종료(OCR 단계).
  const [activeSlot, setActiveSlot] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<Engine>("vision");
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRaw, setPendingRaw] = useState<PendingRaw | null>(null);

  const capturedCount = pages.filter((p) => p !== null).length;
  const capturing = activeSlot !== null;

  // 카메라 시작 — activeSlot 변경마다 video 요소가 재마운트되므로 srcObject 재연결.
  useEffect(() => {
    if (activeSlot === null) return;
    let aborted = false;

    const attach = async (stream: MediaStream) => {
      if (aborted || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // iOS autoplay 막힘은 muted+playsInline 으로 대부분 해결됨.
      }
      setCameraReady(true);
    };

    (async () => {
      try {
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
  }, [activeSlot]);

  // 페이지 unmount 시에만 stream 정리.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // 셔터 — 비디오 풀프레임을 canvas 로 저장하고 CropEditor 띄움.
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

      // object-fit: cover 역매핑 — 가이드 박스 좌표 → 원본 픽셀 좌표.
      const scale = Math.max(cw / vw, ch / vh);
      const offsetX = (vw * scale - cw) / 2;
      const offsetY = (vh * scale - ch) / 2;

      const guide = { topPct: 0.03, bottomPct: 0.03, leftPct: 0.16, rightPct: 0.16 };
      const gLeft = cw * guide.leftPct;
      const gTop = ch * guide.topPct;
      const gRight = cw * (1 - guide.rightPct);
      const gBottom = ch * (1 - guide.bottomPct);
      const toSrc = (x: number, y: number) => ({
        x: (x + offsetX) / scale,
        y: (y + offsetY) / scale,
      });

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

  // CropEditor 확정 — 현재 슬롯에 저장 후 다음 빈 슬롯으로 이동.
  // 마지막 슬롯이면 자동으로 OCR 단계로.
  const onCropConfirm = useCallback(
    (blob: Blob) => {
      if (activeSlot === null) return;
      const capture: PageCapture = {
        blob,
        previewUrl: URL.createObjectURL(blob),
      };
      setPages((prev) => {
        const next = [...prev];
        const old = next[activeSlot];
        if (old) URL.revokeObjectURL(old.previewUrl);
        next[activeSlot] = capture;
        return next;
      });
      // 다음 빈 슬롯 찾기. 없으면 OCR 단계로.
      const nextEmpty = pages.findIndex((p, i) => i > activeSlot && p === null);
      if (nextEmpty >= 0) {
        setActiveSlot(nextEmpty);
      } else if (activeSlot + 1 < MAX_SLOTS) {
        setActiveSlot(activeSlot + 1);
      } else {
        setActiveSlot(null); // OCR 단계
      }
      setPendingRaw(null);
    },
    [activeSlot, pages],
  );

  const onCropCancel = useCallback(() => setPendingRaw(null), []);

  // 슬롯 재촬영 — 해당 슬롯 비우고 그 슬롯으로 이동.
  const retakeSlot = (idx: number) => {
    setPages((prev) => {
      const next = [...prev];
      const old = next[idx];
      if (old) URL.revokeObjectURL(old.previewUrl);
      next[idx] = null;
      return next;
    });
    setActiveSlot(idx);
    setOcrResult(null);
  };

  // 촬영 완료 — OCR 단계로 강제 이동 (1장 이상 있어야).
  const finishCapture = () => {
    if (capturedCount === 0) return;
    setActiveSlot(null);
  };

  // 추가 촬영 — OCR 단계에서 다시 촬영 모드로.
  const addMoreCapture = () => {
    const nextEmpty = pages.findIndex((p) => p === null);
    if (nextEmpty < 0) return;
    setActiveSlot(nextEmpty);
    setOcrResult(null);
  };

  // 뒤로가기 — 크롭 에디터 → 카메라, 카메라 → 이전 슬롯/OCR단계 → 마지막 슬롯.
  const goBack = useCallback(() => {
    if (pendingRaw) {
      setPendingRaw(null);
      return;
    }
    if (activeSlot !== null && activeSlot > 0) {
      // 직전 슬롯 비우고 그 자리로 — 직전을 다시 찍게 함.
      const target = activeSlot - 1;
      setPages((prev) => {
        const next = [...prev];
        const old = next[target];
        if (old) URL.revokeObjectURL(old.previewUrl);
        next[target] = null;
        return next;
      });
      setActiveSlot(target);
    }
    setOcrResult(null);
  }, [activeSlot, pendingRaw]);

  const canGoBack =
    pendingRaw !== null || (activeSlot !== null && activeSlot > 0 && capturedCount > 0);

  // OCR 실행 — 채워진 슬롯만 순서대로.
  const runOcr = async () => {
    const filled = pages
      .map((p, i) => (p ? { p, i } : null))
      .filter((x): x is { p: PageCapture; i: number } => x !== null);
    if (filled.length === 0) return;

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

      const results = await Promise.all(
        filled.map((f) => callOne(f.p.blob, `page-${f.i + 1}.jpg`)),
      );
      const combined = results
        .map((r, idx) => `━━━ ${filled[idx].i + 1}번 ━━━\n${r.text}`)
        .join("\n\n");
      setOcrResult(combined);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "ocr_failed";
      const friendly =
        engine === "paddle" && /fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(raw)
          ? "Paddle 서버에 연결 실패 — 배포본에선 집 PC 서버(:8765) 접근 불가. Vision 으로 전환해주세요."
          : raw;
      setError(friendly);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    pages.forEach((p) => p && URL.revokeObjectURL(p.previewUrl));
    setPages(Array(MAX_SLOTS).fill(null));
    setActiveSlot(0);
    setOcrResult(null);
    setError(null);
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "max(env(safe-area-inset-top, 0px), 12px) 14px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {!capturing && (
        <>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            📷 문서 스캔 테스트
          </h1>
          <p style={{ color: "#666", fontSize: 12, marginBottom: 14 }}>
            한 페이지씩 따로 찍어주세요. 촬영 완료 후 한꺼번에 OCR.
          </p>
        </>
      )}

      {/* 엔진 선택 */}
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
              ⚠️ Paddle 은 집 PC 의 Python 서버(:8765) 에서만 돎.
            </div>
          )}
        </>
      )}

      {/* 슬롯 인디케이터 — 1..6 도트 */}
      <SlotIndicator pages={pages} activeSlot={activeSlot} />

      {cameraError && (
        <div style={errorBox}>카메라 접근 실패: {cameraError}</div>
      )}
      {error && <div style={errorBox}>{error}</div>}

      {/* 카메라 (촬영 중 + 크롭 에디터 안 떠있을 때) */}
      {capturing && !pendingRaw && (
        <CameraPanel
          videoRef={videoRef}
          cameraReady={cameraReady}
          busy={busy}
          slotNumber={(activeSlot ?? 0) + 1}
          totalCaptured={capturedCount}
          onShoot={shoot}
          onBack={canGoBack ? goBack : undefined}
          onFinish={capturedCount > 0 ? finishCapture : undefined}
        />
      )}

      {/* 크롭 에디터 */}
      {pendingRaw && (
        <CropEditor
          source={pendingRaw.canvas}
          initialCorners={pendingRaw.initialCorners}
          onConfirm={onCropConfirm}
          onCancel={onCropCancel}
        />
      )}

      {/* 캡처 결과 — 1..N 슬롯 그리드 */}
      {capturedCount > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            캡처된 페이지 ({capturedCount}장)
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {pages.map((p, i) => (
              <CaptureCard
                key={i}
                slotNumber={i + 1}
                page={p}
                onRetake={p ? () => retakeSlot(i) : undefined}
                isActive={activeSlot === i}
              />
            ))}
          </div>
        </div>
      )}

      {/* OCR + 추가촬영 + 리셋 */}
      {!capturing && capturedCount > 0 && (
        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={runOcr}
            disabled={busy}
            style={{
              ...primaryBtn,
              opacity: busy ? 0.5 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy
              ? "인식 중..."
              : `${engine === "vision" ? "Vision" : "Paddle"} 으로 ${capturedCount}장 OCR`}
          </button>
          {capturedCount < MAX_SLOTS && (
            <button onClick={addMoreCapture} style={ghostBtn}>
              + 추가 촬영
            </button>
          )}
          <button onClick={resetAll} style={ghostBtn}>
            처음부터
          </button>
        </div>
      )}

      {ocrResult && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            OCR 결과 [{engine}]
          </h2>
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

function SlotIndicator({
  pages,
  activeSlot,
}: {
  pages: (PageCapture | null)[];
  activeSlot: number | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 14,
        flexWrap: "wrap",
      }}
    >
      {pages.map((p, i) => {
        const filled = !!p;
        const active = activeSlot === i;
        return (
          <div
            key={i}
            style={{
              minWidth: 28,
              height: 28,
              padding: "0 8px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: filled ? ACCENT : active ? "#222" : "#eee",
              color: filled ? "#000" : active ? "#fff" : "#999",
              border: active && !filled ? `2px solid ${ACCENT}` : "none",
            }}
          >
            {filled ? "✓" : i + 1}
          </div>
        );
      })}
      <span
        style={{
          marginLeft: 6,
          padding: "0 10px",
          height: 28,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          background: activeSlot === null ? ACCENT : "#eee",
          color: activeSlot === null ? "#000" : "#999",
        }}
      >
        OCR
      </span>
    </div>
  );
}

// 책 모양 가이드 — "한 장씩 따로 찍어주세요" 시각화.
// 1번 (왼쪽) 다 찍고 2번 (오른쪽) 으로 페이지 넘긴 뒤 다시 찍는 식.
function BookGuide({ slotNumber }: { slotNumber: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "8px 0",
      }}
    >
      <div
        style={{
          width: 38,
          height: 50,
          border: `2px solid ${ACCENT}`,
          borderRight: "none",
          borderRadius: "4px 0 0 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
          color: ACCENT,
          background: slotNumber === 1 ? `${ACCENT}22` : "transparent",
        }}
      >
        1
      </div>
      <div style={{ width: 1, height: 50, background: ACCENT, opacity: 0.5 }} />
      <div
        style={{
          width: 38,
          height: 50,
          border: `2px solid ${ACCENT}`,
          borderLeft: "none",
          borderRadius: "0 4px 4px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
          color: ACCENT,
          background: slotNumber === 2 ? `${ACCENT}22` : "transparent",
        }}
      >
        2
      </div>
      <span style={{ color: "#888", fontSize: 11, marginLeft: 10 }}>
        한 장씩 따로 ↑
      </span>
    </div>
  );
}

function CameraPanel({
  videoRef,
  cameraReady,
  busy,
  slotNumber,
  totalCaptured,
  onShoot,
  onBack,
  onFinish,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  busy: boolean;
  slotNumber: number;
  totalCaptured: number;
  onShoot: () => void;
  onBack?: () => void;
  onFinish?: () => void;
}) {
  return (
    <div>
      {/* 책모양 가이드 + 슬롯 번호 안내 한 줄 */}
      <BookGuide slotNumber={slotNumber} />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 6,
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 800, color: ACCENT }}>
          {slotNumber}번째 페이지
        </span>
        <span
          style={{
            color: "#888",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          가이드 안에 한 페이지를 꽉 차게
        </span>
      </div>

      <div
        style={{
          position: "relative",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          aspectRatio: "3 / 4",
          maxHeight: "62vh",
          maxWidth: 360,
          margin: "0 auto",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {cameraReady && (
          <div
            style={{
              position: "absolute",
              top: "3%",
              bottom: "3%",
              left: "16%",
              right: "16%",
              border: `3px solid ${ACCENT}`,
              borderRadius: 4,
              pointerEvents: "none",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            }}
          />
        )}

        {/* 셔터 — 오른쪽 벽면, 살짝 아래 */}
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

        {/* 뒤로가기 좌상단 */}
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

        {/* 촬영 완료 우상단 — 1장 이상일 때만 */}
        {onFinish && (
          <button
            onClick={onFinish}
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              padding: "8px 14px",
              borderRadius: 999,
              background: ACCENT,
              color: "#000",
              border: "none",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            완료 ({totalCaptured})
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
    </div>
  );
}

function CaptureCard({
  slotNumber,
  page,
  onRetake,
  isActive,
}: {
  slotNumber: number;
  page: PageCapture | null;
  onRetake?: () => void;
  isActive?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${isActive ? ACCENT : "#eee"}`,
        borderRadius: 8,
        padding: 6,
        background: page ? "#fafafa" : "#f5f5f5",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: page ? "#000" : "#aaa" }}>
          {slotNumber}
        </span>
        {onRetake && (
          <button
            onClick={onRetake}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              background: "transparent",
              border: "1px solid #ccc",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            다시
          </button>
        )}
      </div>
      {page ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.previewUrl}
          alt={`${slotNumber}번 페이지`}
          style={{
            width: "100%",
            display: "block",
            borderRadius: 3,
            aspectRatio: "3 / 4",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            aspectRatio: "3 / 4",
            background: "#eaeaea",
            borderRadius: 3,
            color: "#bbb",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          비어있음
        </div>
      )}
    </div>
  );
}

// ---- styles ----------------------------------------------------------------

const primaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: ACCENT,
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontWeight: 700,
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

const errorBox: React.CSSProperties = {
  padding: 12,
  background: "#fee",
  color: "#c00",
  borderRadius: 6,
  marginBottom: 16,
  fontSize: 13,
};
