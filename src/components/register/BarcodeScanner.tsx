"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

// 바코드 스캐너 — 네이티브 BarcodeDetector 우선, 미지원(iOS Safari) 이면 ZXing 폴백.
// EAN-13 만 허용. ISBN-13 은 978/979 접두의 EAN-13.
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

// ISBN-13 구조 — 978/979 접두 + 10자리.
const ISBN13_RE = /^(978|979)\d{10}$/;

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null);
  const firedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("바코드를 사각형 안에 맞춰주세요");

  useEffect(() => {
    let cancelled = false;

    const fire = (raw: string) => {
      if (firedRef.current) return;
      const isbn = raw.replace(/\D/g, "");
      if (!ISBN13_RE.test(isbn)) return; // ISBN 이 아니면 무시 (상품 바코드 등).
      firedRef.current = true;
      setHint(`감지됨: ${isbn}`);
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(30);
        } catch {
          /* no-op */
        }
      }
      onDetect(isbn);
    };

    (async () => {
      // 카메라 스트림 먼저 확보 — 두 경로(Native/ZXing) 공통.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e) {
        setError(
          (e as Error).name === "NotAllowedError"
            ? "카메라 권한이 거부됐습니다"
            : "카메라를 열 수 없습니다",
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // iOS Safari 는 playsInline 없으면 전체화면 강제.
      video.setAttribute("playsinline", "true");
      try {
        await video.play();
      } catch {
        // 자동재생 실패해도 화면은 뜸 — 사용자 탭 후 재시도.
      }

      // 경로 A: 네이티브 BarcodeDetector (안드로이드 Chrome 등)
      const Native = (
        window as unknown as {
          BarcodeDetector?: BarcodeDetectorConstructor;
        }
      ).BarcodeDetector;
      if (Native) {
        const detector = new Native({ formats: ["ean_13"] });
        const loop = async () => {
          if (cancelled || firedRef.current) return;
          try {
            const results = await detector.detect(video);
            const hit = results.find((b) => b.format === "ean_13");
            if (hit) {
              fire(hit.rawValue);
              return;
            }
          } catch {
            /* frame 단위 실패 무시 */
          }
          rafRef.current = window.requestAnimationFrame(loop);
        };
        rafRef.current = window.requestAnimationFrame(loop);
        return;
      }

      // 경로 B: ZXing 폴백 (iOS Safari 등)
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      zxingRef.current = reader;
      try {
        await reader.decodeFromVideoElement(video, (result) => {
          if (cancelled || firedRef.current) return;
          if (result) fire(result.getText());
        });
      } catch (e) {
        setError(
          `바코드 디코더 초기화 실패: ${(e as Error).message || "unknown"}`,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // ZXing v0.1.x 는 reset 대신 stopContinuousDecode 가 없고, GC 대상임.
      zxingRef.current = null;
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
