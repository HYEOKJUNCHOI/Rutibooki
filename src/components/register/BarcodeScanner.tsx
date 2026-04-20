"use client";

import { useEffect, useRef, useState } from "react";

// BarcodeDetector 로 EAN-13 스캔 — ISBN-13 은 EAN-13 의 부분집합(978/979 접두).
// iOS Safari 17+, Chrome/Edge 최근 버전 지원. 미지원 브라우저는 바로 에러 안내.
// 카메라 접근 실패 / 거절 시 onClose 호출해 상위에서 사진 경로로 유도.

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorConstructor {
  new (opts: { formats: string[] }): {
    detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
  };
}

interface Props {
  onDetect: (isbn13: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("바코드를 사각형 안에 맞춰주세요");

  useEffect(() => {
    // 지원 여부 확인 — 미지원이면 즉시 안내.
    const Detector = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;
    if (!Detector) {
      setError(
        "이 브라우저에서는 바코드 스캔이 안 됩니다. 사진으로 등록해주세요.",
      );
      return;
    }

    const detector = new Detector({ formats: ["ean_13"] });
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const loop = async () => {
          if (cancelled || firedRef.current) return;
          try {
            const results = await detector.detect(video);
            const hit = results.find(
              (b) =>
                b.format === "ean_13" &&
                /^(978|979)\d{10}$/.test(b.rawValue.replace(/\D/g, "")),
            );
            if (hit) {
              firedRef.current = true;
              const isbn = hit.rawValue.replace(/\D/g, "");
              setHint(`감지됨: ${isbn}`);
              // 햅틱 피드백.
              if ("vibrate" in navigator) {
                try {
                  navigator.vibrate(30);
                } catch {
                  /* no-op */
                }
              }
              onDetect(isbn);
              return;
            }
          } catch {
            // detect 실패는 프레임 단위라 조용히 무시, 다음 프레임 재시도.
          }
          rafRef.current = window.requestAnimationFrame(loop);
        };
        rafRef.current = window.requestAnimationFrame(loop);
      } catch (e) {
        setError(
          (e as Error).message === "Permission denied" ||
            (e as Error).name === "NotAllowedError"
            ? "카메라 권한이 거부됐습니다"
            : "카메라를 열 수 없습니다",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onDetect]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#1A1A1A",
          border: "1px solid #2A2A2A",
          color: "#E8E8E8",
          fontSize: 18,
          cursor: "pointer",
        }}
        aria-label="닫기"
      >
        ✕
      </button>

      {error ? (
        <div
          style={{
            color: "#FF6B6B",
            fontSize: 14,
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      ) : (
        <>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 360,
              aspectRatio: "4 / 3",
              borderRadius: 12,
              overflow: "hidden",
              background: "#000",
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
              }}
            />
            {/* 가이드 박스 — 중앙 가로 긴 영역(바코드는 가로로 길다) */}
            <div
              style={{
                position: "absolute",
                left: "10%",
                right: "10%",
                top: "40%",
                bottom: "40%",
                border: "2px solid #00FF7A",
                borderRadius: 8,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 13,
              color: "#E8E8E8",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {hint}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#7A7A7A",
              textAlign: "center",
            }}
          >
            책 뒷면 ISBN 바코드를 비춰주세요
          </div>
        </>
      )}
    </div>
  );
}
