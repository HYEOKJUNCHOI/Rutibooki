"use client";

// 셔터 직후 뜨는 네 꼭짓점 크롭 에디터.
// 이유: 가이드 프레임에 책을 완벽히 맞추기 어려움 → 찍은 후 모서리 미세 조정 허용.
// OpenCV.js warpPerspective 로 원근 보정 (docScan.ts 의 loadOpenCv 재사용).

import { useCallback, useEffect, useRef, useState } from "react";
import { loadOpenCv } from "@/lib/docScan";

interface Pt {
  x: number;
  y: number;
}

export interface CropEditorProps {
  /** 비디오 풀프레임이 담긴 canvas. corners 는 이 canvas 픽셀 좌표. */
  source: HTMLCanvasElement;
  /** [tl, tr, br, bl] 순. 초기엔 가이드 박스 위치. */
  initialCorners: [Pt, Pt, Pt, Pt];
  /** 결과 가로 px — 세로는 평균 변 비율로 자동. */
  outputWidth?: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CropEditor({
  source,
  initialCorners,
  outputWidth = 1200,
  onConfirm,
  onCancel,
}: CropEditorProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [corners, setCorners] = useState<[Pt, Pt, Pt, Pt]>(initialCorners);
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // 원본 → 표시용 data URL (canvas 를 <img> 로 띄워야 터치 이벤트 위에 겹치기 쉬움)
  useEffect(() => {
    setPreviewUrl(source.toDataURL("image/jpeg", 0.85));
  }, [source]);

  // 컨테이너 폭에 맞춰 표시 크기 계산 — 원본 비율 유지.
  useEffect(() => {
    const recalc = () => {
      const el = wrapRef.current;
      if (!el) return;
      const maxW = el.clientWidth;
      const scale = maxW / source.width;
      setDisplaySize({ w: maxW, h: source.height * scale });
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [source]);

  const scale = displaySize.w / source.width || 1;

  // 드래그 — pointer events 로 터치/마우스 통합.
  const dragIdxRef = useRef<number | null>(null);

  const onPointerDown = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragIdxRef.current = idx;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const idx = dragIdxRef.current;
    if (idx == null) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const sx = Math.max(0, Math.min(source.width, px / scale));
    const sy = Math.max(0, Math.min(source.height, py / scale));
    setCorners((prev) => {
      const next = [...prev] as [Pt, Pt, Pt, Pt];
      next[idx] = { x: sx, y: sy };
      return next;
    });
  };

  const onPointerUp = () => {
    dragIdxRef.current = null;
  };

  const confirm = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await loadOpenCv();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cv = (window as any).cv;
      const [tl, tr, br, bl] = corners;
      const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
      // 평균 변 길이로 세로 비율 근사 — 왜곡이 심해도 비정상적인 출력 방지.
      const avgW = (dist(tl, tr) + dist(bl, br)) / 2;
      const avgH = (dist(tl, bl) + dist(tr, br)) / 2;
      if (avgW < 20 || avgH < 20) throw new Error("crop_too_small");
      const outW = outputWidth;
      const outH = Math.max(1, Math.round((avgH / avgW) * outW));

      const srcMat = cv.imread(source);
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
      ]);
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, outW, 0, outW, outH, 0, outH,
      ]);
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      const dstMat = new cv.Mat();
      const dsize = new cv.Size(outW, outH);
      cv.warpPerspective(
        srcMat,
        dstMat,
        M,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(),
      );
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      cv.imshow(out, dstMat);
      srcMat.delete();
      dstMat.delete();
      M.delete();
      srcTri.delete();
      dstTri.delete();

      const blob: Blob = await new Promise((resolve, reject) => {
        out.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("blob_null"))),
          "image/jpeg",
          0.92,
        );
      });
      onConfirm(blob);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "warp_failed");
    } finally {
      setBusy(false);
    }
  }, [corners, source, outputWidth, onConfirm]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 6, textAlign: "center" }}>
        빨간 점을 끌어 책 모서리에 맞춰주세요
      </div>
      <div
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          touchAction: "none",
          userSelect: "none",
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
          // 컨테이너 높이 명시 — 이미지 로드 전에도 핸들 좌표가 튀지 않도록.
          height: displaySize.h || undefined,
        }}
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="원본"
            style={{ width: "100%", display: "block", pointerEvents: "none" }}
          />
        )}

        {/* 사각형 연결선 */}
        <svg
          width={displaySize.w}
          height={displaySize.h}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          <polygon
            points={corners.map((c) => `${c.x * scale},${c.y * scale}`).join(" ")}
            fill="rgba(255,59,48,0.15)"
            stroke="#FF3B30"
            strokeWidth={2}
          />
        </svg>

        {/* 4 꼭짓점 핸들 — 터치 타겟 크게 (36px) */}
        {corners.map((c, i) => (
          <div
            key={i}
            onPointerDown={onPointerDown(i)}
            style={{
              position: "absolute",
              left: c.x * scale - 18,
              top: c.y * scale - 18,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,59,48,0.95)",
              border: "3px solid #fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
              cursor: "grab",
              touchAction: "none",
            }}
          />
        ))}
      </div>

      {err && (
        <div style={{ color: "#c00", fontSize: 12, marginTop: 8, textAlign: "center" }}>
          {err}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 12,
          justifyContent: "center",
        }}
      >
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: "10px 18px",
            background: "transparent",
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          다시 찍기
        </button>
        <button
          onClick={confirm}
          disabled={busy}
          style={{
            padding: "10px 22px",
            background: "#3ddc97",
            color: "#000",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 14,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? "처리 중..." : "확정"}
        </button>
      </div>
    </div>
  );
}
