"use client";

// 표지/목차 추출 중 보여주는 체크리스트 오버레이.
// 단계별로 ✓ 가 하나씩 찍혀야 "진행되는 느낌" 이 나서 스테거링 타이머로 완료 연출.

interface Step {
  key: string;
  label: string;
  state: "pending" | "running" | "done" | "error";
}

interface Props {
  open: boolean;
  steps: Step[];
}

export default function ExtractProgressOverlay({ open, steps }: Props) {
  if (!open) return null;
  return (
    <div style={backdropStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>불러오는 중…</div>
        <ul style={listStyle}>
          {steps.map((s) => (
            <li key={s.key} style={rowStyle}>
              <StepIcon state={s.state} />
              <span style={labelStyle(s.state)}>
                {s.label}
                {s.state === "done" && (
                  <span style={doneTagStyle}> · 완료</span>
                )}
                {s.state === "error" && (
                  <span style={errorTagStyle}> · 실패</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Keyframes />
    </div>
  );
}

function StepIcon({ state }: { state: Step["state"] }) {
  if (state === "done") {
    return (
      <span style={iconBoxStyle("#0E3A2A")}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2 L5 8.5 L9.5 3.5"
            stroke="#00FF7A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "error") {
    return (
      <span style={iconBoxStyle("#3A1010")}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 3 L9 9 M9 3 L3 9"
            stroke="#FF5A5A"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "running") {
    return (
      <span style={{ ...iconBoxStyle("#1A1A1A") }}>
        <span style={spinnerStyle} />
      </span>
    );
  }
  return <span style={iconBoxStyle("#141414")} />;
}

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.72)",
  backdropFilter: "blur(6px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid #1F1F1F",
  borderRadius: 16,
  padding: "20px 20px 18px",
  width: "100%",
  maxWidth: 320,
  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#E8E8E8",
  marginBottom: 14,
  letterSpacing: "-0.2px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const labelStyle = (state: Step["state"]): React.CSSProperties => ({
  fontSize: 13,
  color:
    state === "done"
      ? "#E8E8E8"
      : state === "error"
        ? "#FF9A9A"
        : state === "running"
          ? "#C8C8C8"
          : "#5A5A5A",
  letterSpacing: "-0.2px",
  transition: "color 0.2s ease",
});

const doneTagStyle: React.CSSProperties = {
  color: "#00FF7A",
  fontWeight: 600,
  marginLeft: 2,
};

const errorTagStyle: React.CSSProperties = {
  color: "#FF5A5A",
  fontWeight: 600,
  marginLeft: 2,
};

const iconBoxStyle = (bg: string): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: 6,
  background: bg,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "1px solid #1F1F1F",
});

const spinnerStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "1.6px solid #2A2A2A",
  borderTopColor: "#00FF7A",
  animation: "rutiSpin 0.7s linear infinite",
  display: "inline-block",
};

// 인라인 스타일로는 @keyframes 선언 불가 — 최소 주입 컴포넌트.
function Keyframes() {
  return (
    <style>{`
      @keyframes rutiSpin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  );
}
