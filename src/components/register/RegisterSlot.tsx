"use client";

import { useRef, useState } from "react";
import ScanCamera from "./ScanCamera";

// T-34, T-38: 표지/목차 업로드용 단일 슬롯. 쏘카식 빈 슬롯 → 썸네일 + 배지.

export type SlotStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "done"
  | "error";

interface Props {
  label: string;
  required?: boolean;
  previewUrl: string | null;
  status: SlotStatus;
  onPick: (file: File) => void;
  onClear?: () => void;
  // 라이브 스캔 허용 여부. 목차 슬롯에서만 켜는 게 기본 (표지는 그냥 사진).
  allowScan?: boolean;
  // 스캔 모달 상단 진행도 표시 ("1 / 3" 등). 멀티샷일 때만 의미.
  scanShotIndex?: number;
  scanShotTotal?: number;
}

const BADGE_LABEL: Record<SlotStatus, string | null> = {
  idle: null,
  uploading: "대기",
  extracting: "추출 중",
  done: "완료",
  error: "실패 · 다시",
};

const BADGE_COLOR: Record<SlotStatus, string> = {
  idle: "transparent",
  uploading: "#3A3A3A",
  extracting: "#00332a",
  done: "#00663a",
  error: "#4A1F1F",
};

export default function RegisterSlot({
  label,
  required,
  previewUrl,
  status,
  onPick,
  onClear,
  allowScan,
  scanShotIndex,
  scanShotTotal,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const onClick = () => {
    inputRef.current?.click();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    // 동일 파일 재선택 허용
    e.target.value = "";
  };

  const badge = BADGE_LABEL[status];

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 4",
        borderRadius: 12,
        border: previewUrl ? "1px solid #2A2A2A" : "1.5px dashed #2A2A2A",
        background: "#0E0E0E",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {previewUrl ? (
        // 사용자 업로드 썸네일. next/image 대신 <img> — data URL / object URL 혼용.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div style={{ textAlign: "center", color: "#5A5A5A" }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: "#3A3A3A",
              marginBottom: 6,
            }}
          >
            +
          </div>
          <div style={{ fontSize: 11, letterSpacing: "-0.2px" }}>
            {label}
            {required && (
              <span style={{ color: "#00FF7A", marginLeft: 3 }}>*</span>
            )}
          </div>
        </div>
      )}

      {badge && (
        <span
          style={{
            position: "absolute",
            left: 6,
            top: 6,
            background: BADGE_COLOR[status],
            color: "#E8E8E8",
            fontSize: 10,
            padding: "3px 6px",
            borderRadius: 4,
            letterSpacing: "-0.2px",
          }}
        >
          {badge}
        </span>
      )}

      {previewUrl && onClear && status !== "extracting" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          style={{
            position: "absolute",
            right: 6,
            top: 6,
            background: "rgba(0,0,0,0.6)",
            color: "#E8E8E8",
            border: "none",
            borderRadius: "50%",
            width: 22,
            height: 22,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}

      {/* 스캔 버튼 — 빈 슬롯에서만 노출. 클릭 버블링 막아 파일 피커 안 뜨게. */}
      {allowScan && !previewUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setScanOpen(true);
          }}
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 255, 122, 0.12)",
            color: "#00FF7A",
            border: "1px solid rgba(0, 255, 122, 0.35)",
            borderRadius: 999,
            padding: "5px 12px",
            fontSize: 11,
            letterSpacing: "-0.2px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          📷 스캔
        </button>
      )}

      {/* capture 속성 제거 — 붙이면 모바일이 곧장 카메라로 진입, 앨범 선택 불가.
          accept="image/*" 만 두면 OS 가 "카메라 / 사진 보관함" 선택창을 띄움. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        style={{ display: "none" }}
      />

      {scanOpen && (
        <ScanCamera
          onCapture={(file) => {
            setScanOpen(false);
            onPick(file);
          }}
          onCancel={() => setScanOpen(false)}
          shotIndex={scanShotIndex}
          shotTotal={scanShotTotal}
        />
      )}
    </div>
  );
}
