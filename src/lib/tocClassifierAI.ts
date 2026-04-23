// AI 하이브리드 TOC 분류기 — 한 줄씩 CHAPTER/SECTION/LEAF/SKIP 라벨링.
// 룰 파서가 들여쓰기·굵기 시각 힌트 없는 교보 텍스트에서 계층을 못 잡는 문제를
// Gemini 2.5 Flash 의 분류 능력으로 보완. "생성 금지, 분류만" 원칙 — 원본 텍스트 수정 금지.
//
// 실패(스키마 위반/할루시네이션) 시에는 호출자가 룰베이스로 폴백하도록 반환값에 ok 플래그를 둠.

import { GoogleGenAI, Type } from "@google/genai";

export type LineKind = "CHAPTER" | "SECTION" | "LEAF" | "SKIP";

export interface LineClassification {
  lineIndex: number;
  kind: LineKind;
  parentLineIndex: number | null;
}

export interface ClassifyResult {
  ok: boolean;
  classifications: LineClassification[];
  reason?: string; // 실패 시 사유 — 폴백 리포트용
  usage?: {
    promptTokens: number;
    outputTokens: number;
  };
}

// Few-shot 예시 3개 — "완벽한 원시인"(LEVEL/BUTTON), "나침반"(1부/나침반 N), 단순 장(N장/N절).
// AI 가 다양한 계층 표기를 인식하도록 입력 인덱스 포맷과 동일하게 제공.
const FEW_SHOT = `### 예시 1 (LEVEL/BUTTON 스타일)
입력:
[0] 프롤로그: 시작
[1] LEVEL 1: 생존
[2] 뇌가 다시 움직이기 시작했다
[3] BUTTON 1. 수면
[4] 뇌 독소 청소 시간
[5] BUTTON 2. 물
[6] LEVEL 2: 성장
[7] BUTTON 3. 근력 운동

출력:
{"classifications":[
{"lineIndex":0,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":1,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":2,"kind":"SKIP","parentLineIndex":null},
{"lineIndex":3,"kind":"LEAF","parentLineIndex":1},
{"lineIndex":4,"kind":"SKIP","parentLineIndex":null},
{"lineIndex":5,"kind":"LEAF","parentLineIndex":1},
{"lineIndex":6,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":7,"kind":"LEAF","parentLineIndex":6}
]}

### 예시 2 (장/화두 스타일)
입력:
[0] 들어가는 글
[1] 1장. 거짓말
[2] 생각의 화두 01: 사람들은 왜 거짓말을 할까?
[3] 생각의 화두 02: 지도자의 거짓말
[4] 2장. 가족
[5] 생각의 화두 03: 가족 이야기

출력:
{"classifications":[
{"lineIndex":0,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":1,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":2,"kind":"LEAF","parentLineIndex":1},
{"lineIndex":3,"kind":"LEAF","parentLineIndex":1},
{"lineIndex":4,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":5,"kind":"LEAF","parentLineIndex":4}
]}

### 예시 2-b (N부 > CHAPTER NN 스타일 — CHAPTER 단어가 LEAF 일 수 있다)
입력:
[0] 추천의 글
[1] 1부. AI 시대
[2] CHAPTER 01. 프롬프트 사고법
[3] CHAPTER 02. AI 유니버스
[4] 2부. 프로의 비밀
[5] CHAPTER 01. 성공하는 프롬프트

출력:
{"classifications":[
{"lineIndex":0,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":1,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":2,"kind":"LEAF","parentLineIndex":1},
{"lineIndex":3,"kind":"LEAF","parentLineIndex":1},
{"lineIndex":4,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":5,"kind":"LEAF","parentLineIndex":4}
]}

### 예시 3 (HOW TO / WHAT TO)
입력:
[0] 제1장 무작정 책을 읽는 당신에게
[1] HOW TO 1 목적이 없다면 책을 읽지 마라
[2] HOW TO 2 천천히 읽어라
[3] 제2장 무슨 책을 읽어야 할지
[4] WHAT TO 1 고전을 읽어라

출력:
{"classifications":[
{"lineIndex":0,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":1,"kind":"LEAF","parentLineIndex":0},
{"lineIndex":2,"kind":"LEAF","parentLineIndex":0},
{"lineIndex":3,"kind":"CHAPTER","parentLineIndex":null},
{"lineIndex":4,"kind":"LEAF","parentLineIndex":3}
]}`;

const SYSTEM_INSTRUCTION = `너는 한국 도서 목차 분류기다.
주어진 줄을 다음 중 하나로 분류하라:
- CHAPTER: 대챕터(예: "1장", "1부", "LEVEL 1", "제N장"). 실제 읽는 단위가 아니라 묶음.
- SECTION: 중간 그룹 (대부분의 책에는 없음 — LEVEL/BUTTON 같은 3단 이상에서만).
- LEAF: 실제로 독자가 읽는 단위(소제목, 장 안의 꼭지, BUTTON, HOW TO 번호, 화두 NN).
- SKIP: 부제목/서브타이틀/에피그래프/구분자처럼 계층에 속하지 않는 보조 줄.

규칙:
1. 원본 텍스트를 절대 수정·요약·번역·재작성하지 마라.
2. 출력은 입력의 lineIndex 0..N-1 을 모두 포함해야 한다 (빠짐/추가 금지).
3. parentLineIndex 는 자기보다 작은 인덱스의 CHAPTER 또는 SECTION 을 가리킨다. CHAPTER 는 null.
4. SKIP 은 parentLineIndex 를 null 로 둔다.
5. "프롤로그/에필로그/서문/들어가는 글/머리말/맺음말" 은 독립 CHAPTER 로 둔다.
6. 애매하면 LEAF 로 두되, 바로 위 CHAPTER 에 연결한다.
7. 판단 근거는 출력하지 말고 JSON 만 반환.
8. 계층 판단 힌트:
   - "1부/2부/제N부/제N장/N장/LEVEL N/START/END/ERROR" 는 대부분 CHAPTER.
   - 같은 "CHAPTER NN" 표기라도 "1부. XXX" 아래에 모여 있으면 LEAF 로 본다 (N부가 더 큰 단위이므로).
   - "BUTTON NN/HOW TO NN/WHAT TO NN/DIARY NN/생각의 화두 NN/키워드 N/나침반 N" 은 거의 항상 LEAF.
   - 대챕터로 묶을 수 있는 상위 줄이 하나라도 있으면 그 밑의 번호 매긴 항목은 LEAF 로 분류해 계층을 만들어라 — 전부 CHAPTER 로 평탄하게 두지 마라.
   - 단, 원본에 계층 표기가 전혀 없어 평행한 단문만 나열된 경우는 억지로 계층을 만들지 말고 모두 CHAPTER 로 둔다.`;

// 출력 스키마 — responseSchema 로 강제해 파싱 실패를 최소화.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    classifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          lineIndex: { type: Type.INTEGER },
          kind: {
            type: Type.STRING,
            enum: ["CHAPTER", "SECTION", "LEAF", "SKIP"],
          },
          parentLineIndex: { type: Type.INTEGER, nullable: true },
        },
        required: ["lineIndex", "kind", "parentLineIndex"],
        propertyOrdering: ["lineIndex", "kind", "parentLineIndex"],
      },
    },
  },
  required: ["classifications"],
  propertyOrdering: ["classifications"],
};

// ── 검증 ──
// AI 결과가 구조적으로 유효한지 확인. 하나라도 위반하면 ok=false 로 리턴 — 호출자가 룰로 폴백.
function validate(
  lines: string[],
  classifications: LineClassification[],
): { ok: boolean; reason?: string } {
  const n = lines.length;
  if (classifications.length !== n) {
    return { ok: false, reason: `line_count_mismatch (${classifications.length} != ${n})` };
  }

  // 인덱스 범위/유일성 체크.
  const seen = new Set<number>();
  for (const c of classifications) {
    if (!Number.isInteger(c.lineIndex) || c.lineIndex < 0 || c.lineIndex >= n) {
      return { ok: false, reason: `lineIndex_out_of_range:${c.lineIndex}` };
    }
    if (seen.has(c.lineIndex)) {
      return { ok: false, reason: `duplicate_lineIndex:${c.lineIndex}` };
    }
    seen.add(c.lineIndex);
  }

  // 정렬된 순서로 접근하기 위해 인덱스 기반 맵.
  const byIdx = new Map<number, LineClassification>();
  for (const c of classifications) byIdx.set(c.lineIndex, c);

  for (let i = 0; i < n; i++) {
    const c = byIdx.get(i)!;

    // parent 규칙.
    if (c.kind === "CHAPTER" || c.kind === "SKIP") {
      if (c.parentLineIndex !== null) {
        return { ok: false, reason: `${c.kind}_has_parent:${i}` };
      }
      continue;
    }

    // LEAF / SECTION — parent 가 있어야 하고 자기보다 앞쪽이어야 하며 CHAPTER/SECTION 이어야 함.
    if (c.parentLineIndex === null) {
      return { ok: false, reason: `${c.kind}_no_parent:${i}` };
    }
    if (c.parentLineIndex >= i) {
      return { ok: false, reason: `forward_parent:${i}->${c.parentLineIndex}` };
    }
    const parent = byIdx.get(c.parentLineIndex);
    if (!parent) {
      return { ok: false, reason: `parent_missing:${i}->${c.parentLineIndex}` };
    }
    if (parent.kind !== "CHAPTER" && parent.kind !== "SECTION") {
      return { ok: false, reason: `invalid_parent_kind:${i}->${parent.kind}` };
    }
  }

  return { ok: true };
}

// ── 메인 호출 ──
// 입력: raw 줄 배열. 출력: 분류 결과 또는 폴백 신호.
// 타임아웃 30초, 실패 시 1회 재시도 (호출자가 직접 호출 횟수 제어 가능하도록 옵션화).
export async function classifyTocLines(
  lines: string[],
  opts: { apiKey: string; model?: string; maxAttempts?: number } = { apiKey: "" },
): Promise<ClassifyResult> {
  const { apiKey, model = "gemini-2.5-flash", maxAttempts = 2 } = opts;
  if (!apiKey) {
    return { ok: false, classifications: [], reason: "no_api_key" };
  }
  if (lines.length === 0) {
    return { ok: true, classifications: [] };
  }

  const ai = new GoogleGenAI({ apiKey });

  // 인덱스 번호 부착 — AI 가 텍스트를 지어내도 lineIndex 로 추적 가능.
  const indexed = lines.map((l, i) => `[${i}] ${l}`).join("\n");

  const userPrompt = `${FEW_SHOT}\n\n### 분류 대상\n입력:\n${indexed}\n\n출력:`;

  let lastErr: string | undefined;
  let usageAgg: { promptTokens: number; outputTokens: number } | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      });

      const usage = res.usageMetadata;
      usageAgg = {
        promptTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
      };

      const text = res.text ?? "";
      let parsed: { classifications: LineClassification[] };
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        lastErr = `json_parse_fail: ${(e as Error).message}`;
        continue;
      }

      if (!Array.isArray(parsed.classifications)) {
        lastErr = "no_classifications_array";
        continue;
      }

      const v = validate(lines, parsed.classifications);
      if (!v.ok) {
        lastErr = `validation_fail: ${v.reason}`;
        continue;
      }

      // 정렬 — lineIndex 순으로.
      const sorted = [...parsed.classifications].sort(
        (a, b) => a.lineIndex - b.lineIndex,
      );
      return { ok: true, classifications: sorted, usage: usageAgg };
    } catch (e) {
      const err = e as Error;
      lastErr =
        err?.name === "AbortError" ? "timeout_30s" : `api_error: ${err.message}`;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    classifications: [],
    reason: lastErr ?? "unknown",
    usage: usageAgg,
  };
}
