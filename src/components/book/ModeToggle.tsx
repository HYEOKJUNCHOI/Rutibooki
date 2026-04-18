"use client";

// 독서 모드 전환 토글
// 루틴 모드(요일별 한 권) ↔ 인터리빙 모드(챕터 단위 교차)
// 양쪽 바깥에 라벨, 가운데에 슬라이드 트랙

export type ReadingMode = "routine" | "interleaving";

interface ModeToggleProps {
  mode: ReadingMode;
  onChange: (mode: ReadingMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const isRoutine = mode === "routine";

  // 토글 전환 — 반대쪽으로 슬라이드
  const handleToggle = () => {
    onChange(isRoutine ? "interleaving" : "routine");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginBottom: 16,
      }}
    >
      {/* 루틴 라벨 */}
      <button
        onClick={() => onChange("routine")}
        style={{
          background: "transparent",
          border: "none",
          fontSize: 12,
          fontWeight: isRoutine ? 700 : 500,
          color: isRoutine ? "#00FF7A" : "#5A5A5A",
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.3px",
          padding: 0,
          transition: "color 0.2s",
        }}
      >
        루틴
      </button>

      {/* 슬라이드 트랙 */}
      <button
        onClick={handleToggle}
        style={{
          width: 44,
          height: 22,
          background: "#1F1F1F",
          border: "1px solid #2A2A2A",
          borderRadius: 999,
          position: "relative",
          cursor: "pointer",
          padding: 0,
          transition: "all 0.2s",
        }}
      >
        {/* 슬라이드 점 */}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: isRoutine ? 2 : 22,
            width: 16,
            height: 16,
            background: "#00FF7A",
            borderRadius: "50%",
            boxShadow: "0 0 6px rgba(0,255,122,0.5)",
            transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </button>

      {/* 인터리빙 라벨 */}
      <button
        onClick={() => onChange("interleaving")}
        style={{
          background: "transparent",
          border: "none",
          fontSize: 12,
          fontWeight: !isRoutine ? 700 : 500,
          color: !isRoutine ? "#00FF7A" : "#5A5A5A",
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.3px",
          padding: 0,
          transition: "color 0.2s",
        }}
      >
        인터리빙
      </button>
    </div>
  );
}
