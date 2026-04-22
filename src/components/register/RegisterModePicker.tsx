"use client";

// 책 등록 시작 지점의 2지선다 — 바코드 vs 직접입력.
// 홈 FAB(+) 에서 열림. 스크린에서 어떤 경로로 갈지 먼저 고르게 해서
// "책 등록" 이라는 큰 모달에 진입하기 전 의도를 명확히 한다.

interface Props {
  open: boolean;
  onClose: () => void;
  onPickBarcode: () => void;
  onPickManual: () => void;
}

export default function RegisterModePicker({
  open,
  onClose,
  onPickBarcode,
  onPickManual,
}: Props) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0E0E0E",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          border: "1px solid #1A1A1A",
          padding: "20px 16px 28px",
          animation: "picker-rise 200ms ease-out",
        }}
      >
        {/* 드래그 그립 — 바텀시트 관례. */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "#2A2A2A",
            margin: "0 auto 16px",
          }}
        />

        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#E8E8E8",
            textAlign: "center",
            marginBottom: 4,
            letterSpacing: "-0.4px",
          }}
        >
          어떻게 등록할까요?
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#7A7A7A",
            textAlign: "center",
            marginBottom: 20,
            letterSpacing: "-0.2px",
          }}
        >
          바코드가 제일 빠르고 정확해요
        </div>

        <button
          onClick={onPickBarcode}
          style={primaryCardStyle}
        >
          <div style={{ fontSize: 28 }}>📷</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={cardTitle}>바코드 스캔</div>
            <div style={cardSub}>책 뒷면 ISBN 찍으면 끝 · 추천</div>
          </div>
          <div style={chevronStyle}>›</div>
        </button>

        <button
          onClick={onPickManual}
          style={secondaryCardStyle}
        >
          <div style={{ fontSize: 28 }}>✍️</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={cardTitle}>직접 입력</div>
            <div style={cardSub}>제목·저자 손으로 타이핑</div>
          </div>
          <div style={chevronStyle}>›</div>
        </button>

        <button onClick={onClose} style={cancelStyle}>
          취소
        </button>
      </div>

      <style>{`
        @keyframes picker-rise {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const primaryCardStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 16px",
  marginBottom: 10,
  background: "linear-gradient(135deg, #00FF7A 0%, #00D466 100%)",
  color: "#000",
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 6px 20px rgba(0,255,122,0.28)",
};

const secondaryCardStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 16px",
  marginBottom: 6,
  background: "#1A1A1A",
  color: "#E8E8E8",
  border: "1px solid #2A2A2A",
  borderRadius: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cardTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "-0.3px",
  marginBottom: 2,
};

const cardSub: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.7,
  letterSpacing: "-0.2px",
};

const chevronStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 400,
  opacity: 0.5,
};

const cancelStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 12px",
  marginTop: 8,
  background: "transparent",
  color: "#7A7A7A",
  border: "none",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};
