"use client";

// 목차 사진 캡처 → 크롭 → blob 배열을 부모에 전달하는 재사용 컴포넌트.
// scan-test 페이지의 카메라/크롭 로직을 추출해 등록 플로우에서 재사용.
//
// 호출 측 책임 (route page):
//   - blobs 받아서 OCR + AI 분류 + buildTocTree → updateBook 까지 처리

import { useCallback, useEffect, useRef, useState } from "react";
import CropEditor from "@/components/scan/CropEditor";

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

interface Props {
  onComplete: (blobs: Blob[]) => void;
  onCancel: () => void;
  /** 진행/처리 메시지 — 부모가 OCR/AI 진행 중에 셔터 잠그고 싶을 때 */
  externalBusy?: boolean;
  externalBusyMessage?: string;
}

export default function TocCaptureFlow({
  onComplete,
  onCancel,
  externalBusy = false,
  externalBusyMessage,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pages, setPages] = useState<(PageCapture | null)[]>(() =>
    Array(MAX_SLOTS).fill(null),
  );
  const [activeSlot, setActiveSlot] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRaw, setPendingRaw] = useState<PendingRaw | null>(null);

  const capturedCount = pages.filter((p) => p !== null).length;
  const capturing = activeSlot !== null;
  const totalBusy = busy || externalBusy;

  // 카메라 시작 — activeSlot 변경마다 video 재마운트.
  useEffect(() => {
    if (activeSlot === null) return;
    let aborted = false;
    const attach = async (stream: MediaStream) => {
      if (aborted || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        /* iOS autoplay 막힘 — muted+playsInline 으로 대부분 해결 */
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

  // 페이지 unmount 시 stream 정리.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const shoot = useCallback(async () => {
    if (!videoRef.current || totalBusy) return;
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

      const scale = Math.max(cw / vw, ch / vh);
      const offsetX = (vw * scale - cw) / 2;
      const offsetY = (vh * scale - ch) / 2;
      const guide = { topPct: 0.08, bottomPct: 0.08, leftPct: 0.05, rightPct: 0.05 };
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
  }, [totalBusy]);

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
      const nextEmpty = pages.findIndex((p, i) => i > activeSlot && p === null);
      if (nextEmpty >= 0) setActiveSlot(nextEmpty);
      else if (activeSlot + 1 < MAX_SLOTS) setActiveSlot(activeSlot + 1);
      else setActiveSlot(null);
      setPendingRaw(null);
    },
    [activeSlot, pages],
  );

  const onCropCancel = useCallback(() => setPendingRaw(null), []);

  const retakeSlot = (idx: number) => {
    setPages((prev) => {
      const next = [...prev];
      const old = next[idx];
      if (old) URL.revokeObjectURL(old.previewUrl);
      next[idx] = null;
      return next;
    });
    setActiveSlot(idx);
  };

  const finishCapture = () => {
    if (capturedCount === 0) return;
    // OCR 단계로 — 바로 onComplete 콜.
    const blobs = pages.filter((p): p is PageCapture => p !== null).map((p) => p.blob);
    onComplete(blobs);
  };

  const goBack = useCallback(() => {
    if (pendingRaw) {
      setPendingRaw(null);
      return;
    }
    if (activeSlot !== null && activeSlot > 0) {
      const target = activeSlot - 1;
      setPages((prev) => {
        const next = [...prev];
        const old = next[target];
        if (old) URL.revokeObjectURL(old.previewUrl);
        next[target] = null;
        return next;
      });
      setActiveSlot(target);
    } else if (activeSlot !== null && activeSlot === 0 && capturedCount === 0) {
      // 시작 슬롯에서 뒤로 → 전체 취소
      onCancel();
    }
  }, [activeSlot, pendingRaw, capturedCount, onCancel]);

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "max(env(safe-area-inset-top, 0px), 12px) 14px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <SlotIndicator pages={pages} activeSlot={activeSlot} />

      {cameraError && <div style={errorBox}>카메라 접근 실패: {cameraError}</div>}
      {error && <div style={errorBox}>{error}</div>}

      {capturing && !pendingRaw && (
        <CameraPanel
          videoRef={videoRef}
          cameraReady={cameraReady}
          busy={totalBusy}
          busyMessage={externalBusy ? externalBusyMessage : undefined}
          slotNumber={(activeSlot ?? 0) + 1}
          totalCaptured={capturedCount}
          onShoot={shoot}
          onBack={goBack}
          onFinish={capturedCount > 0 ? finishCapture : undefined}
        />
      )}

      {pendingRaw && (
        <CropEditor
          source={pendingRaw.canvas}
          initialCorners={pendingRaw.initialCorners}
          onConfirm={onCropConfirm}
          onCancel={onCropCancel}
        />
      )}

      {capturedCount > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 12,
              color: "#7A7A7A",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            캡처된 페이지 ({capturedCount}장)
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 4,
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
              background: filled ? ACCENT : active ? "#222" : "#1A1A1A",
              color: filled ? "#000" : active ? "#fff" : "#5A5A5A",
              border: active && !filled ? `2px solid ${ACCENT}` : "none",
            }}
          >
            {filled ? "✓" : i + 1}
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
  busyMessage,
  slotNumber,
  totalCaptured,
  onShoot,
  onBack,
  onFinish,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  busy: boolean;
  busyMessage?: string;
  slotNumber: number;
  totalCaptured: number;
  onShoot: () => void;
  onBack: () => void;
  onFinish?: () => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 6,
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 800, color: ACCENT, fontSize: 14 }}>
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
          가이드에 꽉 차게 · 수평으로
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
              top: "8%",
              bottom: "8%",
              left: "5%",
              right: "5%",
              border: `3px solid ${ACCENT}`,
              borderRadius: 4,
              pointerEvents: "none",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            }}
          />
        )}

        {cameraReady && (
          <button
            onClick={onShoot}
            disabled={busy}
            aria-label="셔터"
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              width: 60,
              height: 60,
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
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#fff",
                border: "2px solid #000",
                display: "block",
              }}
            />
          </button>
        )}

        <button
          onClick={onBack}
          aria-label="이전"
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            padding: "9px 14px 9px 11px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.25)",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>‹</span>
          이전
        </button>

        {onFinish && !busy && (
          <button
            onClick={onFinish}
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              padding: "12px 20px",
              borderRadius: 999,
              background: ACCENT,
              color: "#000",
              border: "none",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,255,122,0.5)",
              letterSpacing: "-0.3px",
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              gap: 4,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            <span style={{ opacity: 0.85 }}>카메라 켜는 중</span>
            <span style={{ fontSize: 11, opacity: 0.55 }}>잠시만요</span>
          </div>
        )}

        {busy && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
              gap: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${ACCENT}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "toc-spin 0.9s linear infinite",
              }}
            />
            <span
              style={{
                whiteSpace: "pre-line",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {busyMessage ?? "처리 중..."}
            </span>
            <style>{`@keyframes toc-spin { to { transform: rotate(360deg); } }`}</style>
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
        border: `2px solid ${isActive ? ACCENT : page ? "#dadada" : "#1f1f1f"}`,
        borderRadius: 6,
        padding: 3,
        background: page ? "#fafafa" : "#0E0E0E",
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 4,
          top: 2,
          fontSize: 10,
          fontWeight: 800,
          color: page ? "#000" : isActive ? ACCENT : "#666",
          background: page ? "rgba(255,255,255,0.85)" : "transparent",
          padding: page ? "0 4px" : 0,
          borderRadius: 3,
          zIndex: 1,
          lineHeight: 1.4,
        }}
      >
        {slotNumber}
      </span>
      {onRetake && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetake();
          }}
          aria-label="다시"
          style={{
            position: "absolute",
            right: 2,
            top: 2,
            width: 18,
            height: 18,
            padding: 0,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            fontSize: 10,
            lineHeight: 1,
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          ↺
        </button>
      )}
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
            background: isActive ? `${ACCENT}11` : "#181818",
            borderRadius: 3,
            color: isActive ? ACCENT : "#444",
            fontSize: 18,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isActive ? "●" : ""}
        </div>
      )}
    </div>
  );
}

const errorBox: React.CSSProperties = {
  padding: 12,
  background: "#3a1010",
  color: "#FF8A8A",
  borderRadius: 6,
  marginBottom: 10,
  fontSize: 12,
};
