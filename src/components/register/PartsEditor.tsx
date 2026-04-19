"use client";

import { useCallback } from "react";
import { BookPart, BookSection } from "@/types/book";

// T-36: Vision 이 추출한 parts[] 를 편집 가능한 리스트로.
// 파트 추가/삭제, 섹션 추가/삭제, 페이지 범위 수정.

interface Props {
  parts: BookPart[];
  onChange: (next: BookPart[]) => void;
  warning?: string;
}

const inputStyle: React.CSSProperties = {
  background: "#0E0E0E",
  border: "1px solid #2A2A2A",
  color: "#E8E8E8",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#7A7A7A",
  marginBottom: 4,
  letterSpacing: "-0.2px",
};

export default function PartsEditor({ parts, onChange, warning }: Props) {
  const updatePart = useCallback(
    (idx: number, patch: Partial<BookPart>) => {
      const next = [...parts];
      next[idx] = { ...next[idx], ...patch };
      onChange(next);
    },
    [parts, onChange],
  );

  const updateSection = useCallback(
    (pIdx: number, sIdx: number, patch: Partial<BookSection>) => {
      const next = [...parts];
      const sections = [...next[pIdx].sections];
      sections[sIdx] = { ...sections[sIdx], ...patch };
      next[pIdx] = { ...next[pIdx], sections };
      onChange(next);
    },
    [parts, onChange],
  );

  const addSection = (pIdx: number) => {
    const next = [...parts];
    const lastEnd = next[pIdx].sections.at(-1)?.endPage ?? next[pIdx].endPage;
    next[pIdx] = {
      ...next[pIdx],
      sections: [
        ...next[pIdx].sections,
        { title: "새 장", startPage: lastEnd + 1, endPage: lastEnd + 1 },
      ],
    };
    onChange(next);
  };

  const removeSection = (pIdx: number, sIdx: number) => {
    const next = [...parts];
    next[pIdx] = {
      ...next[pIdx],
      sections: next[pIdx].sections.filter((_, i) => i !== sIdx),
    };
    onChange(next);
  };

  const removePart = (pIdx: number) => {
    onChange(
      parts
        .filter((_, i) => i !== pIdx)
        .map((p, i) => ({ ...p, index: i + 1 })),
    );
  };

  const addPart = () => {
    const lastEnd = parts.at(-1)?.endPage ?? 0;
    onChange([
      ...parts,
      {
        index: parts.length + 1,
        title: `파트 ${parts.length + 1}`,
        startPage: lastEnd + 1,
        endPage: lastEnd + 1,
        sections: [],
      },
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {warning && (
        // 회색 inline 안내 — 확성기 이모지 금지.
        <p
          style={{
            fontSize: 11,
            color: "#9A7A3A",
            margin: 0,
            padding: "8px 10px",
            background: "#2A1E0A",
            borderRadius: 6,
            letterSpacing: "-0.2px",
          }}
        >
          목차 인식 자신이 낮아요. 아래에서 확인해 주세요.
        </p>
      )}

      {parts.map((part, pIdx) => (
        <div
          key={pIdx}
          style={{
            background: "#0A0A0A",
            border: "1px solid #1F1F1F",
            borderRadius: 10,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>파트 제목</div>
              <input
                style={inputStyle}
                value={part.title}
                onChange={(e) => updatePart(pIdx, { title: e.target.value })}
              />
            </div>
            <button
              onClick={() => removePart(pIdx)}
              style={{
                background: "transparent",
                color: "#7A3A3A",
                border: "1px solid #3A1A1A",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              삭제
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>시작 p</div>
              <input
                type="number"
                style={inputStyle}
                value={part.startPage}
                onChange={(e) =>
                  updatePart(pIdx, {
                    startPage: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>끝 p</div>
              <input
                type="number"
                style={inputStyle}
                value={part.endPage}
                onChange={(e) =>
                  updatePart(pIdx, {
                    endPage: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* 섹션 리스트 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 4,
            }}
          >
            {part.sections.map((sec, sIdx) => (
              <div
                key={sIdx}
                style={{ display: "flex", gap: 6, alignItems: "center" }}
              >
                <input
                  style={{ ...inputStyle, flex: 2 }}
                  value={sec.title}
                  onChange={(e) =>
                    updateSection(pIdx, sIdx, { title: e.target.value })
                  }
                  placeholder="장 제목"
                />
                <input
                  type="number"
                  style={{ ...inputStyle, flex: 1 }}
                  value={sec.startPage}
                  onChange={(e) =>
                    updateSection(pIdx, sIdx, {
                      startPage: Number(e.target.value) || 0,
                    })
                  }
                />
                <input
                  type="number"
                  style={{ ...inputStyle, flex: 1 }}
                  value={sec.endPage}
                  onChange={(e) =>
                    updateSection(pIdx, sIdx, {
                      endPage: Number(e.target.value) || 0,
                    })
                  }
                />
                <button
                  onClick={() => removeSection(pIdx, sIdx)}
                  style={{
                    background: "transparent",
                    color: "#5A5A5A",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: "0 4px",
                    fontFamily: "inherit",
                  }}
                  aria-label="섹션 삭제"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => addSection(pIdx)}
              style={{
                background: "transparent",
                color: "#7A7A7A",
                border: "1px dashed #2A2A2A",
                borderRadius: 6,
                padding: "6px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + 장 추가
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addPart}
        style={{
          background: "transparent",
          color: "#00FF7A",
          border: "1px dashed #2A4A3A",
          borderRadius: 8,
          padding: "10px",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        + 파트 추가
      </button>
    </div>
  );
}
