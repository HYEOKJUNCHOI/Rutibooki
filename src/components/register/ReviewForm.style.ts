import type { CSSProperties } from "react";

// ReviewForm 에서 분리한 스타일 토큰 모음. 본체 300줄 제한 유지용.

export const slotGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

export const sectionTitleStyle: CSSProperties = {
  color: "#9A9A9A",
  fontSize: 12,
  letterSpacing: 1,
  marginBottom: 10,
};

export const textInputStyle: CSSProperties = {
  background: "#0E0E0E",
  border: "1px solid #2A2A2A",
  color: "#E8E8E8",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

export const rescanBannerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "#0D1E14",
  border: "1px solid #1F3A2A",
  borderRadius: 10,
};

export const rescanBtnStyle: CSSProperties = {
  background: "transparent",
  color: "#00FF7A",
  border: "1px solid #2A4A3A",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

export const estimateWarnStyle: CSSProperties = {
  fontSize: 11,
  color: "#9A7A3A",
  background: "#2A1E0A",
  borderRadius: 6,
  padding: "8px 10px",
  letterSpacing: "-0.2px",
  lineHeight: 1.5,
};

export const coverHintStyle: CSSProperties = {
  fontSize: 10,
  color: "#5A7A5A",
  marginTop: 6,
  letterSpacing: "-0.2px",
};

export const errorMsgStyle: CSSProperties = {
  fontSize: 11,
  color: "#7A3A3A",
  marginTop: 8,
  letterSpacing: "-0.2px",
};

export const scanBtnStyle = (disabled: boolean): CSSProperties => ({
  marginTop: 10,
  width: "100%",
  background: "transparent",
  color: disabled ? "#5A5A5A" : "#8A8A8A",
  border: "1px dashed #2A2A2A",
  borderRadius: 10,
  padding: "10px",
  fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  letterSpacing: "-0.2px",
});

export const extractBtnStyle = (enabled: boolean): CSSProperties => ({
  marginTop: 12,
  width: "100%",
  background: enabled ? "#0E3A2A" : "#1A1A1A",
  color: enabled ? "#00FF7A" : "#5A5A5A",
  border: "1px solid #2A4A3A",
  borderRadius: 10,
  padding: "12px",
  fontSize: 13,
  cursor: enabled ? "pointer" : "not-allowed",
  fontFamily: "inherit",
  fontWeight: 600,
});

// "책이 손에 없어요?" — 교보문고 미리보기로 빠져나가는 도움말 링크.
// 톤은 보조·점잖게. 메인은 여전히 사진 업로드.
export const kyoboHelperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 12,
  padding: "10px 12px",
  background: "#0D0D0D",
  border: "1px dashed #2A2A2A",
  borderRadius: 10,
  textDecoration: "none",
  color: "inherit",
  fontFamily: "inherit",
};

export const kyoboHelperIconStyle: CSSProperties = {
  fontSize: 18,
  flexShrink: 0,
};

export const kyoboHelperTextWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
};

export const kyoboHelperTitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#C8C8C8",
  fontWeight: 600,
  letterSpacing: "-0.2px",
};

export const kyoboHelperSubStyle: CSSProperties = {
  fontSize: 11,
  color: "#7A7A7A",
  letterSpacing: "-0.2px",
};

export const saveBtnStyle = (enabled: boolean): CSSProperties => ({
  marginTop: 16,
  width: "100%",
  background: enabled ? "#00FF7A" : "#1A1A1A",
  color: enabled ? "#000" : "#5A5A5A",
  border: "none",
  borderRadius: 14,
  padding: "16px",
  fontSize: 16,
  fontWeight: 800,
  cursor: enabled ? "pointer" : "not-allowed",
  fontFamily: "inherit",
  letterSpacing: "-0.3px",
});
