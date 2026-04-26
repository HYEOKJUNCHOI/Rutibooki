"use client";

// 바코드 등록 직후 뜨는 바텀시트 — 목차도 같이 등록할지 분기.
// [나중에] → 닫기만. 책은 parts 비어있는 채로 서재에 남음 (실패 뱃지 X)
// [사진으로 등록] → /register/toc?bookId=xxx 로 이동, scan-test 동등 카메라/AI 파이프라인.

interface Props {
  open: boolean;
  onSkip: () => void;
  onPickPhoto: () => void;
}

export default function TocRegisterChoice({ open, onSkip, onPickPhoto }: Props) {
  if (!open) return null;
  return (
    <div
      onClick={onSkip}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
        zIndex: 1100,
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
          animation: "toc-choice-rise 200ms ease-out",
        }}
      >
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
            marginBottom: 6,
            letterSpacing: "-0.4px",
          }}
        >
          목차도 같이
          <br />
          등록할까요?
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#7A7A7A",
            textAlign: "center",
            marginBottom: 22,
            letterSpacing: "-0.2px",
            lineHeight: 1.55,
          }}
        >
          목차가 있어야
          <br />
          진행률·여정 카드가 살아나요
          <br />
          <span style={{ color: "#5A5A5A" }}>
            나중에 길게 눌러서 추가도 OK
          </span>
        </div>

        <button onClick={onPickPhoto} style={primaryCardStyle}>
          <div style={{ fontSize: 28 }}>📷</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={cardTitle}>사진으로 등록</div>
            <div style={cardSub}>
              목차 페이지 찍기
              <br />
              AI 가 알아서 분석
            </div>
          </div>
          <div style={chevronStyle}>›</div>
        </button>

        <button onClick={onSkip} style={secondaryCardStyle}>
          <div style={{ fontSize: 28 }}>⏭️</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={cardTitle}>나중에</div>
            <div style={cardSub}>
              일단 책만 등록
              <br />
              나중에 추가하기
            </div>
          </div>
          <div style={chevronStyle}>›</div>
        </button>
      </div>

      <style>{`
        @keyframes toc-choice-rise {
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
  lineHeight: 1.5,
};

const chevronStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 400,
  opacity: 0.5,
};
