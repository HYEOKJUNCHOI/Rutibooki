"use client";

import { useEffect, useState } from "react";

// OCR 엔진 비교용 개발 페이지.
// 같은 사진을 Vision / Paddle 에 각각 던져 품질 비교.
//
// 전처리 옵션:
// - 회전 : 90도씩 돌림 (스캔 방향 틀린 사진 대응)
// - 반반 가르기 : 세로로 좌/우 반쪽씩 따로 OCR 돌리고 합침
//                (목차처럼 2단 레이아웃일 때 엔진이 헷갈리지 않게)

type Engine = "vision" | "paddle";
type Rotation = 0 | 90 | 180 | 270;

interface OcrResponse {
  engine: Engine;
  text: string;
  lines: string[];
  blockCount: number;
}

// ---- canvas 전처리 헬퍼 -----------------------------------------------------

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob_null"))), type, quality);
  });
}

// 원본 이미지를 회전시킨 후, 필요하면 좌/우 반쪽만 크롭해서 Blob 으로 반환.
async function transformImage(
  file: File,
  rotation: Rotation,
  crop: "none" | "left" | "right",
  splitRatio: number, // 0~1 사이. 0.5 면 정가운데. 책 가운데선 위치 보정용.
): Promise<Blob> {
  const img = await loadImage(file);

  // 1) 회전
  const rad = (rotation * Math.PI) / 180;
  const swapped = rotation === 90 || rotation === 270;
  const rw = swapped ? img.height : img.width;
  const rh = swapped ? img.width : img.height;

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = rw;
  rotCanvas.height = rh;
  const rctx = rotCanvas.getContext("2d");
  if (!rctx) throw new Error("canvas_ctx_null");
  rctx.translate(rw / 2, rh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  if (crop === "none") {
    return canvasToBlob(rotCanvas);
  }

  // 2) splitRatio 위치에서 좌/우 분할 크롭
  const splitX = Math.round(rw * splitRatio);
  const sx = crop === "left" ? 0 : splitX;
  const sw = crop === "left" ? splitX : rw - splitX;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = sw;
  cropCanvas.height = rh;
  const cctx = cropCanvas.getContext("2d");
  if (!cctx) throw new Error("canvas_ctx_null");
  cctx.drawImage(rotCanvas, sx, 0, sw, rh, 0, 0, sw, rh);
  return canvasToBlob(cropCanvas);
}

// OCR 1회 호출.
async function callOcr(engine: Engine, blob: Blob, name: string): Promise<OcrResponse> {
  const fd = new FormData();
  fd.append("file", new File([blob], name, { type: blob.type || "image/jpeg" }));
  const r = await fetch(`/api/ocr?engine=${engine}`, { method: "POST", body: fd });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(data.detail || data.error || `HTTP ${r.status}`);
  }
  return data as OcrResponse;
}

// ---- page -------------------------------------------------------------------

export default function OcrTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [engine, setEngine] = useState<Engine>("vision");
  const [rotation, setRotation] = useState<Rotation>(0);
  const [split, setSplit] = useState(false); // 반반 가르기
  const [splitRatio, setSplitRatio] = useState(50); // 분할선 위치 % (20~80). 책 가운데선이 사진 정중앙이 아닐 때.
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const handlePick = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
    setElapsedMs(null);
    setRotation(0);
  };

  // 파일 + 회전 조합이 바뀔 때마다 미리보기 다시 그림.
  // CSS transform:rotate() 쓰면 90/270 도에서 컨테이너 박스가 안 바뀌어 작아져 보이는 문제 때문에
  // canvas 로 실제 회전된 이미지를 만들어서 보여줌.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      if (!file) {
        setPreviewUrl(null);
        return;
      }
      try {
        const blob = await transformImage(file, rotation, "none", 0.5);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch {
        // 무시 — 미리보기 실패해도 OCR 은 가능
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, rotation]);

  const rotateOnce = () => {
    setRotation((r) => (((r + 90) % 360) as Rotation));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setElapsedMs(null);
    const started = performance.now();
    try {
      const ratio = splitRatio / 100;
      if (split) {
        // 좌/우 반쪽 각각 OCR → 결과 합침
        const [leftBlob, rightBlob] = await Promise.all([
          transformImage(file, rotation, "left", ratio),
          transformImage(file, rotation, "right", ratio),
        ]);
        const [l, r] = await Promise.all([
          callOcr(engine, leftBlob, "left.jpg"),
          callOcr(engine, rightBlob, "right.jpg"),
        ]);
        setResult({
          engine,
          text: `━━━ 왼쪽 ━━━\n${l.text}\n\n━━━ 오른쪽 ━━━\n${r.text}`,
          lines: [...l.lines, ...r.lines],
          blockCount: l.blockCount + r.blockCount,
        });
      } else {
        const blob = await transformImage(file, rotation, "none", ratio);
        const r = await callOcr(engine, blob, "upload.jpg");
        setResult(r);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setElapsedMs(Math.round(performance.now() - started));
      setLoading(false);
    }
  };

  const engineLabel = engine === "vision" ? "Google Vision (클라우드)" : "PaddleOCR (로컬)";

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>OCR 품질 비교 테스트</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        같은 사진을 두 엔진에 각각 돌려서 한글 인식률·속도 비교. 최대 20MB.
      </p>

      {/* 엔진 선택 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          padding: 4,
          background: "#f3f3f3",
          borderRadius: 8,
          width: "fit-content",
        }}
      >
        {(["vision", "paddle"] as Engine[]).map((e) => (
          <button
            key={e}
            onClick={() => {
              setEngine(e);
              setResult(null);
            }}
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

      {/* 전처리 옵션 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={rotateOnce}
          disabled={!file}
          style={{
            padding: "6px 12px",
            background: !file ? "#eee" : "#fff",
            color: !file ? "#aaa" : "#222",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 13,
            cursor: !file ? "not-allowed" : "pointer",
          }}
        >
          🔄 회전 ({rotation}°)
        </button>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: split ? "#fff3cd" : "#fff",
            border: `1px solid ${split ? "#ffcf4d" : "#ccc"}`,
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={split}
            onChange={(e) => setSplit(e.target.checked)}
            style={{ margin: 0 }}
          />
          ✂️ 반반 가르기 (좌/우 따로 OCR)
        </label>

        {split && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#666" }}>선 위치</span>
            <input
              type="range"
              min={20}
              max={80}
              step={1}
              value={splitRatio}
              onChange={(e) => setSplitRatio(Number(e.target.value))}
              style={{ width: 140 }}
            />
            <span style={{ color: "#ff4081", fontWeight: 600, width: 32, textAlign: "right" }}>
              {splitRatio}%
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 16,
          border: "1px dashed #ccc",
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          style={{
            padding: "8px 16px",
            background: !file || loading ? "#ccc" : "#3ddc97",
            color: "#000",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: !file || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "인식 중..." : `${engineLabel} 실행${split ? " ×2" : ""}`}
        </button>
        {elapsedMs !== null && !loading && (
          <span style={{ fontSize: 12, color: "#666" }}>⏱ {elapsedMs}ms</span>
        )}
      </div>

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
          에러 ({engine}): {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            원본 {rotation !== 0 ? `(회전 ${rotation}°)` : ""} {split ? "— 좌/우 분할" : ""}
          </h2>
          {previewUrl ? (
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 6, border: "1px solid #eee" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: "100%",
                  display: "block",
                }}
              />
              {/* 분할 가이드 라인 — splitRatio 따라 좌우로 이동 */}
              {split && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${splitRatio}%`,
                    width: 0,
                    borderLeft: "2px dashed #ff4081",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                background: "#f5f5f5",
                borderRadius: 6,
                color: "#999",
              }}
            >
              파일 없음
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            결과 {result ? `[${result.engine}] (${result.lines.length}줄)` : ""}
          </h2>
          <pre
            style={{
              background: "#0b0b0b",
              color: "#eaeaea",
              padding: 14,
              borderRadius: 6,
              fontSize: 12,
              minHeight: 300,
              maxHeight: 640,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {result?.text || "(결과 여기에 표시)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
