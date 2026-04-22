"use client";

import Image from "next/image";

// 바코드 스캔 직후 "맞습니까?" 확인 시트.
// 알라딘에서 받아온 표지/제목/저자 보여주고 사용자가 즉시 판단 → 확인이면 바로 등록.
// ReviewForm 을 거치지 않고 홈에서 완결 → 사용자 탭 수 최소화.

export interface ConfirmData {
  isbn13: string;
  title: string;
  author: string;
  cover?: string;
  publisher?: string;
  itemPage?: number;
}

interface Props {
  data: ConfirmData | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRetry: () => void;
}

export default function ConfirmCoverSheet({
  data,
  loading,
  onClose,
  onConfirm,
  onRetry,
}: Props) {
  if (!loading && !data) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#0E0E0E",
          border: "1px solid #1A1A1A",
          borderRadius: 20,
          padding: "24px 20px 20px",
          animation: "confirm-pop 200ms ease-out",
        }}
      >
        {loading || !data ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "32px 0",
            }}
          >
            <div style={spinnerStyle} />
            <div style={{ color: "#7A7A7A", fontSize: 13 }}>
              책 정보 가져오는 중…
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 11,
                color: "#5A5A5A",
                letterSpacing: 1.5,
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              이 책 맞나요?
            </div>

            {data.cover ? (
              <div
                style={{
                  position: "relative",
                  width: 140,
                  aspectRatio: "2 / 3",
                  margin: "0 auto 18px",
                  borderRadius: 8,
                  overflow: "hidden",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
                  background: "#1A1A1A",
                }}
              >
                <Image
                  src={data.cover}
                  alt={data.title}
                  fill
                  sizes="140px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
            ) : (
              <div style={coverPlaceholderStyle}>표지 없음</div>
            )}

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#E8E8E8",
                textAlign: "center",
                letterSpacing: "-0.4px",
                marginBottom: 4,
                lineHeight: 1.35,
              }}
            >
              {data.title}
            </div>
            {data.author && (
              <div
                style={{
                  fontSize: 12,
                  color: "#7A7A7A",
                  textAlign: "center",
                  marginBottom: 4,
                  letterSpacing: "-0.2px",
                }}
              >
                {data.author}
                {data.publisher ? ` · ${data.publisher}` : ""}
              </div>
            )}
            {data.itemPage ? (
              <div
                style={{
                  fontSize: 11,
                  color: "#5A5A5A",
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                총 {data.itemPage} 쪽
              </div>
            ) : (
              <div style={{ height: 20 }} />
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onRetry} style={retryBtnStyle}>
                다시 스캔
              </button>
              <button onClick={onConfirm} style={confirmBtnStyle}>
                확인 · 등록
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes confirm-pop {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const coverPlaceholderStyle: React.CSSProperties = {
  width: 140,
  aspectRatio: "2 / 3",
  margin: "0 auto 18px",
  borderRadius: 8,
  background: "#1A1A1A",
  border: "1px dashed #2A2A2A",
  color: "#5A5A5A",
  fontSize: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const spinnerStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "3px solid #2A2A2A",
  borderTopColor: "#00FF7A",
  borderRadius: "50%",
  animation: "spin 0.9s linear infinite",
};

const retryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "14px 12px",
  background: "#1A1A1A",
  color: "#E8E8E8",
  border: "1px solid #2A2A2A",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "-0.3px",
};

const confirmBtnStyle: React.CSSProperties = {
  flex: 2,
  padding: "14px 12px",
  background: "linear-gradient(135deg, #00FF7A 0%, #00D466 100%)",
  color: "#000",
  border: "none",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "-0.3px",
  boxShadow: "0 4px 14px rgba(0,255,122,0.3)",
};
