// 자동 생성 — scripts/run-ai-classify.mts 가 덮어씀. 수동 수정 금지.
// 생성 시각: 2026-04-22T09:13:59.076Z

import type { BookPart } from "@/types/book";

export interface AiBookResult {
  isbn13: string;
  title: string;
  source: "gemini-2.5-flash" | "rule_fallback";
  parts: BookPart[];
  costKrw: number;
  inputTokens: number;
  outputTokens: number;
  reason?: string;
}

export const AI_RESULTS: Record<string, AiBookResult> = {
  "9791158512859": {
    "isbn13": "9791158512859",
    "title": "나는 나의 스무 살을 가장 존중한다",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "프롤로그",
        "title": "인생을 바꿔줄 최고의 우연",
        "startPage": 1,
        "endPage": 37,
        "sections": [
          {
            "title": "인생을 바꿔줄 최고의 우연",
            "startPage": 1,
            "endPage": 37
          }
        ]
      },
      {
        "index": 2,
        "label": "1장",
        "title": "가난했지만 꿈을 잃지 않았던 이유",
        "startPage": 38,
        "endPage": 74,
        "sections": [
          {
            "title": "세상의 링에는 체급이 있다",
            "startPage": 38,
            "endPage": 43,
            "label": "01"
          },
          {
            "title": "현실을 바꾸는 가장 강력한 힘",
            "startPage": 44,
            "endPage": 49,
            "label": "02"
          },
          {
            "title": "수술복을 입으면 수술하게 된다",
            "startPage": 50,
            "endPage": 55,
            "label": "03"
          },
          {
            "title": "헌팅하는 사람이 성공한다",
            "startPage": 56,
            "endPage": 61,
            "label": "04"
          },
          {
            "title": "사는 게 재미없고 우울할 때",
            "startPage": 62,
            "endPage": 67,
            "label": "05"
          },
          {
            "title": "네가 너무 큰사람이라서 그래",
            "startPage": 68,
            "endPage": 74,
            "label": "06"
          }
        ]
      },
      {
        "index": 3,
        "label": "2장",
        "title": "20대에 알았으면 더 좋았을 것들",
        "startPage": 75,
        "endPage": 111,
        "sections": [
          {
            "title": "노력이 결과가 되지 않는 이유",
            "startPage": 75,
            "endPage": 79,
            "label": "01"
          },
          {
            "title": "부자로 성장하는 근본 원리 3가지",
            "startPage": 80,
            "endPage": 84,
            "label": "02"
          },
          {
            "title": "외모가 뛰어나지 않아도 매력적인 사람들의 비밀",
            "startPage": 85,
            "endPage": 89,
            "label": "03"
          },
          {
            "title": "친구가 발목을 잡을 때",
            "startPage": 90,
            "endPage": 94,
            "label": "04"
          },
          {
            "title": "긍정적인 미래를 당기는 가장 쉬운 방법",
            "startPage": 95,
            "endPage": 99,
            "label": "05"
          },
          {
            "title": "소시오패스 상사와 잘 지내는 법",
            "startPage": 100,
            "endPage": 104,
            "label": "06"
          },
          {
            "title": "당신은 이미 완전하다",
            "startPage": 105,
            "endPage": 111,
            "label": "07"
          }
        ]
      },
      {
        "index": 4,
        "label": "3장",
        "title": "매일 조금씩 나를 성장시키는 습관",
        "startPage": 112,
        "endPage": 148,
        "sections": [
          {
            "title": "책은 몸으로 읽는 것이다",
            "startPage": 112,
            "endPage": 116,
            "label": "01"
          },
          {
            "title": "체력은 모든 것을 바꾼다",
            "startPage": 117,
            "endPage": 121,
            "label": "02"
          },
          {
            "title": "하루 3분 명상의 힘",
            "startPage": 122,
            "endPage": 126,
            "label": "03"
          },
          {
            "title": "모닝 리추얼로 아침을 맞이하라",
            "startPage": 127,
            "endPage": 131,
            "label": "04"
          },
          {
            "title": "말을 잘하고 싶다면",
            "startPage": 132,
            "endPage": 136,
            "label": "05"
          },
          {
            "title": "말을 잘하고 싶다면",
            "startPage": 137,
            "endPage": 141,
            "label": "06"
          },
          {
            "title": "시간, 공간, 인간을 리셋하라",
            "startPage": 142,
            "endPage": 148,
            "label": "07"
          }
        ]
      },
      {
        "index": 5,
        "label": "4장",
        "title": "당신이 부의 시작을 알게 된다면",
        "startPage": 149,
        "endPage": 185,
        "sections": [
          {
            "title": "부자가 되는 가장 빠른 길",
            "startPage": 149,
            "endPage": 154,
            "label": "01"
          },
          {
            "title": "부의 시작점 1: 인간",
            "startPage": 155,
            "endPage": 160,
            "label": "02"
          },
          {
            "title": "부의 시작점 2: 공간",
            "startPage": 161,
            "endPage": 166,
            "label": "03"
          },
          {
            "title": "부의 시작점 3: 시간",
            "startPage": 167,
            "endPage": 172,
            "label": "04"
          },
          {
            "title": "풍요의 자리에 머물러라",
            "startPage": 173,
            "endPage": 178,
            "label": "05"
          },
          {
            "title": "부자의 말투",
            "startPage": 179,
            "endPage": 185,
            "label": "06"
          }
        ]
      },
      {
        "index": 6,
        "label": "5장",
        "title": "그 시간들을 보내고 깨달은 인생의 비밀",
        "startPage": 186,
        "endPage": 222,
        "sections": [
          {
            "title": "함부로 열심히 살지 마라",
            "startPage": 186,
            "endPage": 190,
            "label": "01"
          },
          {
            "title": "내 미래를 만드는 방법",
            "startPage": 191,
            "endPage": 195,
            "label": "02"
          },
          {
            "title": "있는 자는 더 넉넉해지고, 없는 자는 더 가난해진다",
            "startPage": 196,
            "endPage": 200,
            "label": "03"
          },
          {
            "title": "외모 집착과 콤플렉스에서 벗어나는 법",
            "startPage": 201,
            "endPage": 205,
            "label": "04"
          },
          {
            "title": "부정적인 생각을 역이용하라",
            "startPage": 206,
            "endPage": 210,
            "label": "05"
          },
          {
            "title": "바다가 내게 가르쳐준 것들",
            "startPage": 211,
            "endPage": 215,
            "label": "06"
          },
          {
            "title": "오늘이 미래의 걱정으로만 채워질 때",
            "startPage": 216,
            "endPage": 222,
            "label": "07"
          }
        ]
      },
      {
        "index": 7,
        "label": "에필로그",
        "title": "어머니가 남겨주신 인생의 모든 지혜",
        "startPage": 223,
        "endPage": 264,
        "sections": [
          {
            "title": "어머니가 남겨주신 인생의 모든 지혜",
            "startPage": 223,
            "endPage": 264
          }
        ]
      }
    ],
    "costKrw": 0.545055,
    "inputTokens": 2115,
    "outputTokens": 769
  },
  "9791139729498": {
    "isbn13": "9791139729498",
    "title": "감사하는 뇌가 인생을 바꾼다 - 뇌과학이 그려낸 단 하나의 감사 교과서",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "",
        "title": "추천의 글",
        "startPage": 1,
        "endPage": 21,
        "sections": [
          {
            "title": "추천의 글",
            "startPage": 1,
            "endPage": 21
          }
        ]
      },
      {
        "index": 2,
        "label": "들어가며",
        "title": "들어가며",
        "startPage": 22,
        "endPage": 42,
        "sections": [
          {
            "title": "들어가며",
            "startPage": 22,
            "endPage": 42
          }
        ]
      },
      {
        "index": 3,
        "label": "서문",
        "title": "| 궁극의 감사 수행",
        "startPage": 43,
        "endPage": 63,
        "sections": [
          {
            "title": "| 궁극의 감사 수행",
            "startPage": 43,
            "endPage": 63
          }
        ]
      },
      {
        "index": 4,
        "label": "1장",
        "title": "| 감사의 정체",
        "startPage": 64,
        "endPage": 84,
        "sections": [
          {
            "title": "감사를 정의하다",
            "startPage": 64,
            "endPage": 73
          },
          {
            "title": "감사가 많은 사람의 3가지 특징",
            "startPage": 74,
            "endPage": 84
          }
        ]
      },
      {
        "index": 5,
        "label": "2장",
        "title": "| 감사의 놀라운 효과",
        "startPage": 85,
        "endPage": 105,
        "sections": [
          {
            "title": "감사는 기분에 달려 있다",
            "startPage": 85,
            "endPage": 89
          },
          {
            "title": "감사가 몸과 마음에 미치는 과학적 효과",
            "startPage": 90,
            "endPage": 94
          },
          {
            "title": "감사가 바꾼 인간관계와 성과",
            "startPage": 95,
            "endPage": 99
          },
          {
            "title": "감사가 일에 미치는 과학적 효과",
            "startPage": 100,
            "endPage": 105
          }
        ]
      },
      {
        "index": 6,
        "label": "3장",
        "title": "| 잘못된 감사",
        "startPage": 106,
        "endPage": 126,
        "sections": [
          {
            "title": "감사의 힘으로도 바꿀 수 없는 사람이 있다",
            "startPage": 106,
            "endPage": 115
          },
          {
            "title": "험담이 감사의 효과를 떨어뜨리는 이유",
            "startPage": 116,
            "endPage": 126
          }
        ]
      },
      {
        "index": 7,
        "label": "4장",
        "title": "| 감사의 분류",
        "startPage": 127,
        "endPage": 147,
        "sections": [
          {
            "title": "감사의 3단계",
            "startPage": 127,
            "endPage": 136
          },
          {
            "title": "감사와 뇌 내 물질",
            "startPage": 137,
            "endPage": 147
          }
        ]
      },
      {
        "index": 8,
        "label": "5장",
        "title": "| 감사를 만드는 법",
        "startPage": 148,
        "endPage": 168,
        "sections": [
          {
            "title": "감사 사고를 다듬는 5가지 방법",
            "startPage": 148,
            "endPage": 154
          },
          {
            "title": "감사 표현 및 전달 방법: 실천 편",
            "startPage": 155,
            "endPage": 161
          },
          {
            "title": "부탁만 하는 사람이었던 나",
            "startPage": 162,
            "endPage": 168
          }
        ]
      },
      {
        "index": 9,
        "label": "6장",
        "title": "| 감사하는 뇌 실천 워크",
        "startPage": 169,
        "endPage": 189,
        "sections": [
          {
            "title": "감사 일기의 놀라운 효과",
            "startPage": 169,
            "endPage": 175
          },
          {
            "title": "감사 일기 쓰는 법",
            "startPage": 176,
            "endPage": 182
          },
          {
            "title": "효과가 입증된 감사 워크",
            "startPage": 183,
            "endPage": 189
          }
        ]
      },
      {
        "index": 10,
        "label": "7장",
        "title": "| 감사하는 뇌가 인생을 바꾼다",
        "startPage": 190,
        "endPage": 210,
        "sections": [
          {
            "title": "감사하는 뇌를 갖춘 사람들",
            "startPage": 190,
            "endPage": 199
          },
          {
            "title": "감사 실험",
            "startPage": 200,
            "endPage": 210
          }
        ]
      },
      {
        "index": 11,
        "label": "",
        "title": "나가며",
        "startPage": 211,
        "endPage": 231,
        "sections": [
          {
            "title": "나가며",
            "startPage": 211,
            "endPage": 231
          }
        ]
      },
      {
        "index": 12,
        "label": "",
        "title": "감사의 말 100선",
        "startPage": 232,
        "endPage": 252,
        "sections": [
          {
            "title": "감사의 말 100선",
            "startPage": 232,
            "endPage": 252
          }
        ]
      },
      {
        "index": 13,
        "label": "",
        "title": "참고문헌",
        "startPage": 253,
        "endPage": 280,
        "sections": [
          {
            "title": "참고문헌",
            "startPage": 253,
            "endPage": 280
          }
        ]
      }
    ],
    "costKrw": 0.431865,
    "inputTokens": 1777,
    "outputTokens": 584
  },
  "9791198517425": {
    "isbn13": "9791198517425",
    "title": "불변의 법칙 - 절대 변하지 않는 것들에 대한 23가지 이야기",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "서문",
        "title": "인생의 작은 법칙들",
        "startPage": 1,
        "endPage": 15,
        "sections": [
          {
            "title": "인생의 작은 법칙들",
            "startPage": 1,
            "endPage": 15
          }
        ]
      },
      {
        "index": 2,
        "label": "1",
        "title": "이토록 아슬아슬한 세상",
        "startPage": 16,
        "endPage": 30,
        "sections": [
          {
            "title": "이토록 아슬아슬한 세상",
            "startPage": 16,
            "endPage": 30
          }
        ]
      },
      {
        "index": 3,
        "label": "2",
        "title": "보이지 않는 것, 리스크",
        "startPage": 31,
        "endPage": 45,
        "sections": [
          {
            "title": "보이지 않는 것, 리스크",
            "startPage": 31,
            "endPage": 45
          }
        ]
      },
      {
        "index": 4,
        "label": "3",
        "title": "기대치와 현실",
        "startPage": 46,
        "endPage": 60,
        "sections": [
          {
            "title": "기대치와 현실",
            "startPage": 46,
            "endPage": 60
          }
        ]
      },
      {
        "index": 5,
        "label": "4",
        "title": "인간, 그 알 수 없는 존재",
        "startPage": 61,
        "endPage": 75,
        "sections": [
          {
            "title": "인간, 그 알 수 없는 존재",
            "startPage": 61,
            "endPage": 75
          }
        ]
      },
      {
        "index": 6,
        "label": "5",
        "title": "확률과 확실성",
        "startPage": 76,
        "endPage": 90,
        "sections": [
          {
            "title": "확률과 확실성",
            "startPage": 76,
            "endPage": 90
          }
        ]
      },
      {
        "index": 7,
        "label": "6",
        "title": "뛰어난 스토리가 승리한다",
        "startPage": 91,
        "endPage": 105,
        "sections": [
          {
            "title": "뛰어난 스토리가 승리한다",
            "startPage": 91,
            "endPage": 105
          }
        ]
      },
      {
        "index": 8,
        "label": "7",
        "title": "통계가 놓치는 것",
        "startPage": 106,
        "endPage": 120,
        "sections": [
          {
            "title": "통계가 놓치는 것",
            "startPage": 106,
            "endPage": 120
          }
        ]
      },
      {
        "index": 9,
        "label": "8",
        "title": "평화가 혼돈의 씨앗을 뿌린다",
        "startPage": 121,
        "endPage": 135,
        "sections": [
          {
            "title": "평화가 혼돈의 씨앗을 뿌린다",
            "startPage": 121,
            "endPage": 135
          }
        ]
      },
      {
        "index": 10,
        "label": "9",
        "title": "더 많이, 더 빨리",
        "startPage": 136,
        "endPage": 150,
        "sections": [
          {
            "title": "더 많이, 더 빨리",
            "startPage": 136,
            "endPage": 150
          }
        ]
      },
      {
        "index": 11,
        "label": "10",
        "title": "마법이 일어나는 순간",
        "startPage": 151,
        "endPage": 165,
        "sections": [
          {
            "title": "마법이 일어나는 순간",
            "startPage": 151,
            "endPage": 165
          }
        ]
      },
      {
        "index": 12,
        "label": "11",
        "title": "비극은 순식간이고, 기적은 오래 걸린다",
        "startPage": 166,
        "endPage": 180,
        "sections": [
          {
            "title": "비극은 순식간이고, 기적은 오래 걸린다",
            "startPage": 166,
            "endPage": 180
          }
        ]
      },
      {
        "index": 13,
        "label": "12",
        "title": "사소한 것과 거대한 결과",
        "startPage": 181,
        "endPage": 195,
        "sections": [
          {
            "title": "사소한 것과 거대한 결과",
            "startPage": 181,
            "endPage": 195
          }
        ]
      },
      {
        "index": 14,
        "label": "13",
        "title": "희망 그리고 절망",
        "startPage": 196,
        "endPage": 210,
        "sections": [
          {
            "title": "희망 그리고 절망",
            "startPage": 196,
            "endPage": 210
          }
        ]
      },
      {
        "index": 15,
        "label": "14",
        "title": "완벽함의 함정",
        "startPage": 211,
        "endPage": 225,
        "sections": [
          {
            "title": "완벽함의 함정",
            "startPage": 211,
            "endPage": 225
          }
        ]
      },
      {
        "index": 16,
        "label": "15",
        "title": "모든 여정은 원래 힘들다",
        "startPage": 226,
        "endPage": 240,
        "sections": [
          {
            "title": "모든 여정은 원래 힘들다",
            "startPage": 226,
            "endPage": 240
          }
        ]
      },
      {
        "index": 17,
        "label": "16",
        "title": "계속 달려라",
        "startPage": 241,
        "endPage": 255,
        "sections": [
          {
            "title": "계속 달려라",
            "startPage": 241,
            "endPage": 255
          }
        ]
      },
      {
        "index": 18,
        "label": "17",
        "title": "미래의 경이로움에 대하여",
        "startPage": 256,
        "endPage": 270,
        "sections": [
          {
            "title": "미래의 경이로움에 대하여",
            "startPage": 256,
            "endPage": 270
          }
        ]
      },
      {
        "index": 19,
        "label": "18",
        "title": "보기보다 힘들고, 보이는 것만큼 즐겁지 않다",
        "startPage": 271,
        "endPage": 285,
        "sections": [
          {
            "title": "보기보다 힘들고, 보이는 것만큼 즐겁지 않다",
            "startPage": 271,
            "endPage": 285
          }
        ]
      },
      {
        "index": 20,
        "label": "19",
        "title": "인센티브: 세상에서 가장 강력한 힘",
        "startPage": 286,
        "endPage": 300,
        "sections": [
          {
            "title": "인센티브: 세상에서 가장 강력한 힘",
            "startPage": 286,
            "endPage": 300
          }
        ]
      },
      {
        "index": 21,
        "label": "20",
        "title": "겪어봐야 안다",
        "startPage": 301,
        "endPage": 315,
        "sections": [
          {
            "title": "겪어봐야 안다",
            "startPage": 301,
            "endPage": 315
          }
        ]
      },
      {
        "index": 22,
        "label": "21",
        "title": "멀리 보는 것에 관하여",
        "startPage": 316,
        "endPage": 330,
        "sections": [
          {
            "title": "멀리 보는 것에 관하여",
            "startPage": 316,
            "endPage": 330
          }
        ]
      },
      {
        "index": 23,
        "label": "22",
        "title": "복잡함과 단순함",
        "startPage": 331,
        "endPage": 345,
        "sections": [
          {
            "title": "복잡함과 단순함",
            "startPage": 331,
            "endPage": 345
          }
        ]
      },
      {
        "index": 24,
        "label": "23",
        "title": "상처는 아물지만 흉터는 남는다",
        "startPage": 346,
        "endPage": 360,
        "sections": [
          {
            "title": "상처는 아물지만 흉터는 남는다",
            "startPage": 346,
            "endPage": 360
          }
        ]
      },
      {
        "index": 25,
        "label": "감사의 글",
        "title": "감사의 글",
        "startPage": 361,
        "endPage": 375,
        "sections": [
          {
            "title": "감사의 글",
            "startPage": 361,
            "endPage": 375
          }
        ]
      },
      {
        "index": 26,
        "label": "",
        "title": "주석",
        "startPage": 376,
        "endPage": 390,
        "sections": [
          {
            "title": "주석",
            "startPage": 376,
            "endPage": 390
          }
        ]
      },
      {
        "index": 27,
        "label": "",
        "title": "번역과 관련하여",
        "startPage": 391,
        "endPage": 420,
        "sections": [
          {
            "title": "번역과 관련하여",
            "startPage": 391,
            "endPage": 420
          }
        ]
      }
    ],
    "costKrw": 0.709695,
    "inputTokens": 2527,
    "outputTokens": 1058
  },
  "9791199383074": {
    "isbn13": "9791199383074",
    "title": "완벽한 원시인 - 10만 년을 되돌려 되찾는 뇌 설계도",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "프롤로그",
        "title": "동굴에서 누른 첫 번째 버튼",
        "startPage": 1,
        "endPage": 43,
        "sections": [
          {
            "title": "동굴에서 누른 첫 번째 버튼",
            "startPage": 1,
            "endPage": 43
          }
        ]
      },
      {
        "index": 2,
        "label": "START",
        "title": "진단",
        "startPage": 44,
        "endPage": 86,
        "sections": [
          {
            "title": "당신의 출발점, 두 개의 아침",
            "startPage": 44,
            "endPage": 47
          },
          {
            "title": "아파트의 원시인 vs 사바나의 원시인",
            "startPage": 48,
            "endPage": 51
          },
          {
            "title": "0.012초의 벽",
            "startPage": 52,
            "endPage": 55
          },
          {
            "title": "왜 ‘긍정적인 생각’은 항상 실패할까",
            "startPage": 56,
            "endPage": 59
          },
          {
            "title": "움직임의 배신",
            "startPage": 60,
            "endPage": 63
          },
          {
            "title": "앉아 있는 것은 흡연보다 위험하다",
            "startPage": 64,
            "endPage": 67
          },
          {
            "title": "도파민 파산",
            "startPage": 68,
            "endPage": 71
          },
          {
            "title": "은행 파산보다 더 무서운 도파민 파산",
            "startPage": 72,
            "endPage": 75
          },
          {
            "title": "음식의 배신",
            "startPage": 76,
            "endPage": 79
          },
          {
            "title": "배는 불렀는데 뇌는 굶주리고 있다",
            "startPage": 80,
            "endPage": 86
          }
        ]
      },
      {
        "index": 3,
        "label": "LEVEL 0",
        "title": "생존",
        "startPage": 87,
        "endPage": 129,
        "sections": [
          {
            "title": "밤늦게 찾아온 청소부, 수면",
            "startPage": 87,
            "endPage": 100,
            "label": "BUTTON 1"
          },
          {
            "title": "가장 값싼 최고급 원료, 물",
            "startPage": 101,
            "endPage": 114,
            "label": "BUTTON 2"
          },
          {
            "title": "5초의 마법, 호흡",
            "startPage": 115,
            "endPage": 129,
            "label": "BUTTON 3"
          }
        ]
      },
      {
        "index": 4,
        "label": "LEVEL 1",
        "title": "안정",
        "startPage": 130,
        "endPage": 172,
        "sections": [
          {
            "title": "생체 시계의 지배자, 햇빛",
            "startPage": 130,
            "endPage": 143,
            "label": "BUTTON 4"
          },
          {
            "title": "원시인 모드의 핵심, 걷기",
            "startPage": 144,
            "endPage": 157,
            "label": "BUTTON 5"
          },
          {
            "title": "영양의 본질",
            "startPage": 158,
            "endPage": 172,
            "label": "BUTTON 6"
          }
        ]
      },
      {
        "index": 5,
        "label": "LEVEL 2",
        "title": "성장",
        "startPage": 173,
        "endPage": 215,
        "sections": [
          {
            "title": "의도된 불편함",
            "startPage": 173,
            "endPage": 186,
            "label": "BUTTON 7"
          },
          {
            "title": "근력 운동",
            "startPage": 187,
            "endPage": 200,
            "label": "BUTTON 8"
          },
          {
            "title": "고강도 운동",
            "startPage": 201,
            "endPage": 215,
            "label": "BUTTON 9"
          }
        ]
      },
      {
        "index": 6,
        "label": "LEVEL 3",
        "title": "연결",
        "startPage": 216,
        "endPage": 258,
        "sections": [
          {
            "title": "부족의 탄생, 연결",
            "startPage": 216,
            "endPage": 225,
            "label": "BUTTON 10"
          },
          {
            "title": "연결의 화학작용, 대면",
            "startPage": 226,
            "endPage": 235,
            "label": "BUTTON 11"
          },
          {
            "title": "너무나 이기적인, 기여",
            "startPage": 236,
            "endPage": 245,
            "label": "BUTTON 12"
          },
          {
            "title": "섹스",
            "startPage": 246,
            "endPage": 258,
            "label": "BUTTON 13"
          }
        ]
      },
      {
        "index": 7,
        "label": "LEVEL 4",
        "title": "초월",
        "startPage": 259,
        "endPage": 301,
        "sections": [
          {
            "title": "탈집중",
            "startPage": 259,
            "endPage": 279,
            "label": "BUTTON 14"
          },
          {
            "title": "최상의 보상, 몰입",
            "startPage": 280,
            "endPage": 301,
            "label": "BUTTON 15"
          }
        ]
      },
      {
        "index": 8,
        "label": "ERROR",
        "title": "구멍",
        "startPage": 302,
        "endPage": 344,
        "sections": [
          {
            "title": "화학적 구멍",
            "startPage": 302,
            "endPage": 309
          },
          {
            "title": "디지털 구멍",
            "startPage": 310,
            "endPage": 317
          },
          {
            "title": "행동적 구멍",
            "startPage": 318,
            "endPage": 325
          },
          {
            "title": "인지적 구멍",
            "startPage": 326,
            "endPage": 333
          },
          {
            "title": "응급 처치",
            "startPage": 334,
            "endPage": 344
          }
        ]
      },
      {
        "index": 9,
        "label": "END",
        "title": "궁극의 질문",
        "startPage": 345,
        "endPage": 387,
        "sections": [
          {
            "title": "당신의 기원",
            "startPage": 345,
            "endPage": 358
          },
          {
            "title": "생각하는 종의 출현",
            "startPage": 359,
            "endPage": 372
          },
          {
            "title": "개체의 시대",
            "startPage": 373,
            "endPage": 387
          }
        ]
      },
      {
        "index": 10,
        "label": "에필로그",
        "title": "멸종 위기종",
        "startPage": 388,
        "endPage": 430,
        "sections": [
          {
            "title": "멸종 위기종",
            "startPage": 388,
            "endPage": 430
          }
        ]
      }
    ],
    "costKrw": 0.8458800000000001,
    "inputTokens": 2520,
    "outputTokens": 1384
  },
  "9791158511586": {
    "isbn13": "9791158511586",
    "title": "우리는 모두 죽는다는 것을 기억하라 (알라딘 단독 리커버)",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "",
        "title": "매일 아침 꼭 해야 할 일",
        "startPage": 1,
        "endPage": 1,
        "sections": [
          {
            "title": "매일 아침 꼭 해야 할 일",
            "startPage": 1,
            "endPage": 1
          }
        ]
      },
      {
        "index": 2,
        "label": "",
        "title": "나는 무엇의 일부인가",
        "startPage": 2,
        "endPage": 2,
        "sections": [
          {
            "title": "나는 무엇의 일부인가",
            "startPage": 2,
            "endPage": 2
          }
        ]
      },
      {
        "index": 3,
        "label": "",
        "title": "죽음을 전위에 놓아라",
        "startPage": 3,
        "endPage": 3,
        "sections": [
          {
            "title": "죽음을 전위에 놓아라",
            "startPage": 3,
            "endPage": 3
          }
        ]
      },
      {
        "index": 4,
        "label": "",
        "title": "눈에 띄게 하라",
        "startPage": 4,
        "endPage": 4,
        "sections": [
          {
            "title": "눈에 띄게 하라",
            "startPage": 4,
            "endPage": 4
          }
        ]
      },
      {
        "index": 5,
        "label": "",
        "title": "시간과 공간이 되어주어라",
        "startPage": 5,
        "endPage": 5,
        "sections": [
          {
            "title": "시간과 공간이 되어주어라",
            "startPage": 5,
            "endPage": 5
          }
        ]
      },
      {
        "index": 6,
        "label": "",
        "title": "충분히, 풍요하게, 무한하게",
        "startPage": 6,
        "endPage": 6,
        "sections": [
          {
            "title": "충분히, 풍요하게, 무한하게",
            "startPage": 6,
            "endPage": 6
          }
        ]
      },
      {
        "index": 7,
        "label": "",
        "title": "근원에 가까워지는 삶",
        "startPage": 7,
        "endPage": 7,
        "sections": [
          {
            "title": "근원에 가까워지는 삶",
            "startPage": 7,
            "endPage": 7
          }
        ]
      },
      {
        "index": 8,
        "label": "",
        "title": "집착으로부터의 자유",
        "startPage": 8,
        "endPage": 8,
        "sections": [
          {
            "title": "집착으로부터의 자유",
            "startPage": 8,
            "endPage": 8
          }
        ]
      },
      {
        "index": 9,
        "label": "",
        "title": "판단은 적게, 경청은 많이",
        "startPage": 9,
        "endPage": 9,
        "sections": [
          {
            "title": "판단은 적게, 경청은 많이",
            "startPage": 9,
            "endPage": 9
          }
        ]
      },
      {
        "index": 10,
        "label": "",
        "title": "우아한 것들의 함정",
        "startPage": 10,
        "endPage": 10,
        "sections": [
          {
            "title": "우아한 것들의 함정",
            "startPage": 10,
            "endPage": 10
          }
        ]
      },
      {
        "index": 11,
        "label": "",
        "title": "용서는 나를 위한 것이다",
        "startPage": 11,
        "endPage": 11,
        "sections": [
          {
            "title": "용서는 나를 위한 것이다",
            "startPage": 11,
            "endPage": 11
          }
        ]
      },
      {
        "index": 12,
        "label": "",
        "title": "두려움을 특별 대우하지 마라",
        "startPage": 12,
        "endPage": 12,
        "sections": [
          {
            "title": "두려움을 특별 대우하지 마라",
            "startPage": 12,
            "endPage": 12
          }
        ]
      },
      {
        "index": 13,
        "label": "",
        "title": "아름다운 출몰을 기억하라",
        "startPage": 13,
        "endPage": 13,
        "sections": [
          {
            "title": "아름다운 출몰을 기억하라",
            "startPage": 13,
            "endPage": 13
          }
        ]
      },
      {
        "index": 14,
        "label": "",
        "title": "애쓰지 않는 감각을 길러라",
        "startPage": 14,
        "endPage": 14,
        "sections": [
          {
            "title": "애쓰지 않는 감각을 길러라",
            "startPage": 14,
            "endPage": 14
          }
        ]
      },
      {
        "index": 15,
        "label": "",
        "title": "오렌지의 교훈",
        "startPage": 15,
        "endPage": 15,
        "sections": [
          {
            "title": "오렌지의 교훈",
            "startPage": 15,
            "endPage": 15
          }
        ]
      },
      {
        "index": 16,
        "label": "",
        "title": "내가 관여할 수 있는 일인가",
        "startPage": 16,
        "endPage": 16,
        "sections": [
          {
            "title": "내가 관여할 수 있는 일인가",
            "startPage": 16,
            "endPage": 16
          }
        ]
      },
      {
        "index": 17,
        "label": "",
        "title": "몸은 영혼의 차고",
        "startPage": 17,
        "endPage": 17,
        "sections": [
          {
            "title": "몸은 영혼의 차고",
            "startPage": 17,
            "endPage": 17
          }
        ]
      },
      {
        "index": 18,
        "label": "",
        "title": "보이는 게 많은 사람",
        "startPage": 18,
        "endPage": 18,
        "sections": [
          {
            "title": "보이는 게 많은 사람",
            "startPage": 18,
            "endPage": 18
          }
        ]
      },
      {
        "index": 19,
        "label": "",
        "title": "세상에 실수란 없다",
        "startPage": 19,
        "endPage": 19,
        "sections": [
          {
            "title": "세상에 실수란 없다",
            "startPage": 19,
            "endPage": 19
          }
        ]
      },
      {
        "index": 20,
        "label": "",
        "title": "나와 함께 사는 법을 알라",
        "startPage": 20,
        "endPage": 20,
        "sections": [
          {
            "title": "나와 함께 사는 법을 알라",
            "startPage": 20,
            "endPage": 20
          }
        ]
      },
      {
        "index": 21,
        "label": "",
        "title": "넓혀간다는 것",
        "startPage": 21,
        "endPage": 21,
        "sections": [
          {
            "title": "넓혀간다는 것",
            "startPage": 21,
            "endPage": 21
          }
        ]
      },
      {
        "index": 22,
        "label": "",
        "title": "확실한 것",
        "startPage": 22,
        "endPage": 22,
        "sections": [
          {
            "title": "확실한 것",
            "startPage": 22,
            "endPage": 22
          }
        ]
      },
      {
        "index": 23,
        "label": "",
        "title": "로프트를 사랑하라",
        "startPage": 23,
        "endPage": 23,
        "sections": [
          {
            "title": "로프트를 사랑하라",
            "startPage": 23,
            "endPage": 23
          }
        ]
      },
      {
        "index": 24,
        "label": "",
        "title": "사람을 헤아리지 마라",
        "startPage": 24,
        "endPage": 24,
        "sections": [
          {
            "title": "사람을 헤아리지 마라",
            "startPage": 24,
            "endPage": 24
          }
        ]
      },
      {
        "index": 25,
        "label": "",
        "title": "진정한 시험",
        "startPage": 25,
        "endPage": 25,
        "sections": [
          {
            "title": "진정한 시험",
            "startPage": 25,
            "endPage": 25
          }
        ]
      },
      {
        "index": 26,
        "label": "",
        "title": "공평하다는 것에 관하여",
        "startPage": 26,
        "endPage": 26,
        "sections": [
          {
            "title": "공평하다는 것에 관하여",
            "startPage": 26,
            "endPage": 26
          }
        ]
      },
      {
        "index": 27,
        "label": "",
        "title": "읽고 쓰고 산책하라",
        "startPage": 27,
        "endPage": 27,
        "sections": [
          {
            "title": "읽고 쓰고 산책하라",
            "startPage": 27,
            "endPage": 27
          }
        ]
      },
      {
        "index": 28,
        "label": "",
        "title": "노력은 두 번째다",
        "startPage": 28,
        "endPage": 28,
        "sections": [
          {
            "title": "노력은 두 번째다",
            "startPage": 28,
            "endPage": 28
          }
        ]
      },
      {
        "index": 29,
        "label": "",
        "title": "마지막으로 입는 옷",
        "startPage": 29,
        "endPage": 29,
        "sections": [
          {
            "title": "마지막으로 입는 옷",
            "startPage": 29,
            "endPage": 29
          }
        ]
      },
      {
        "index": 30,
        "label": "",
        "title": "먹이를 주지 마라",
        "startPage": 30,
        "endPage": 30,
        "sections": [
          {
            "title": "먹이를 주지 마라",
            "startPage": 30,
            "endPage": 30
          }
        ]
      },
      {
        "index": 31,
        "label": "",
        "title": "삶의 프레임을 바꾸는 지혜",
        "startPage": 31,
        "endPage": 31,
        "sections": [
          {
            "title": "삶의 프레임을 바꾸는 지혜",
            "startPage": 31,
            "endPage": 31
          }
        ]
      },
      {
        "index": 32,
        "label": "",
        "title": "기대를 활용하라",
        "startPage": 32,
        "endPage": 32,
        "sections": [
          {
            "title": "기대를 활용하라",
            "startPage": 32,
            "endPage": 32
          }
        ]
      },
      {
        "index": 33,
        "label": "",
        "title": "탓하기",
        "startPage": 33,
        "endPage": 33,
        "sections": [
          {
            "title": "탓하기",
            "startPage": 33,
            "endPage": 33
          }
        ]
      },
      {
        "index": 34,
        "label": "",
        "title": "나눔",
        "startPage": 34,
        "endPage": 34,
        "sections": [
          {
            "title": "나눔",
            "startPage": 34,
            "endPage": 34
          }
        ]
      },
      {
        "index": 35,
        "label": "",
        "title": "쉽게 만들어라",
        "startPage": 35,
        "endPage": 35,
        "sections": [
          {
            "title": "쉽게 만들어라",
            "startPage": 35,
            "endPage": 35
          }
        ]
      },
      {
        "index": 36,
        "label": "",
        "title": "알아차리기 연습",
        "startPage": 36,
        "endPage": 36,
        "sections": [
          {
            "title": "알아차리기 연습",
            "startPage": 36,
            "endPage": 36
          }
        ]
      },
      {
        "index": 37,
        "label": "",
        "title": "영혼을 가로막는 것들",
        "startPage": 37,
        "endPage": 37,
        "sections": [
          {
            "title": "영혼을 가로막는 것들",
            "startPage": 37,
            "endPage": 37
          }
        ]
      },
      {
        "index": 38,
        "label": "",
        "title": "깊이 들여다볼 것들",
        "startPage": 38,
        "endPage": 38,
        "sections": [
          {
            "title": "깊이 들여다볼 것들",
            "startPage": 38,
            "endPage": 38
          }
        ]
      },
      {
        "index": 39,
        "label": "",
        "title": "엘리베이터는 잊어라",
        "startPage": 39,
        "endPage": 39,
        "sections": [
          {
            "title": "엘리베이터는 잊어라",
            "startPage": 39,
            "endPage": 39
          }
        ]
      },
      {
        "index": 40,
        "label": "",
        "title": "좋은 사람을 끌어당기는 법",
        "startPage": 40,
        "endPage": 40,
        "sections": [
          {
            "title": "좋은 사람을 끌어당기는 법",
            "startPage": 40,
            "endPage": 40
          }
        ]
      },
      {
        "index": 41,
        "label": "",
        "title": "거짓말 거짓말 그리고 거짓말",
        "startPage": 41,
        "endPage": 41,
        "sections": [
          {
            "title": "거짓말 거짓말 그리고 거짓말",
            "startPage": 41,
            "endPage": 41
          }
        ]
      },
      {
        "index": 42,
        "label": "",
        "title": "물 그리고 인생의 흐름",
        "startPage": 42,
        "endPage": 42,
        "sections": [
          {
            "title": "물 그리고 인생의 흐름",
            "startPage": 42,
            "endPage": 42
          }
        ]
      },
      {
        "index": 43,
        "label": "",
        "title": "언제나 추락이 먼저다",
        "startPage": 43,
        "endPage": 43,
        "sections": [
          {
            "title": "언제나 추락이 먼저다",
            "startPage": 43,
            "endPage": 43
          }
        ]
      },
      {
        "index": 44,
        "label": "",
        "title": "원하는 것 자체가 되어라",
        "startPage": 44,
        "endPage": 44,
        "sections": [
          {
            "title": "원하는 것 자체가 되어라",
            "startPage": 44,
            "endPage": 44
          }
        ]
      },
      {
        "index": 45,
        "label": "",
        "title": "생각과 열정 사이",
        "startPage": 45,
        "endPage": 45,
        "sections": [
          {
            "title": "생각과 열정 사이",
            "startPage": 45,
            "endPage": 45
          }
        ]
      },
      {
        "index": 46,
        "label": "",
        "title": "의도를 간직하라",
        "startPage": 46,
        "endPage": 46,
        "sections": [
          {
            "title": "의도를 간직하라",
            "startPage": 46,
            "endPage": 46
          }
        ]
      },
      {
        "index": 47,
        "label": "",
        "title": "선택의 순간, 기억할 것들",
        "startPage": 47,
        "endPage": 47,
        "sections": [
          {
            "title": "선택의 순간, 기억할 것들",
            "startPage": 47,
            "endPage": 47
          }
        ]
      },
      {
        "index": 48,
        "label": "",
        "title": "이름보다 큰 존재들을 사랑하라",
        "startPage": 48,
        "endPage": 48,
        "sections": [
          {
            "title": "이름보다 큰 존재들을 사랑하라",
            "startPage": 48,
            "endPage": 48
          }
        ]
      },
      {
        "index": 49,
        "label": "",
        "title": "‘나답게 사는’ 내가 되어라",
        "startPage": 49,
        "endPage": 49,
        "sections": [
          {
            "title": "‘나답게 사는’ 내가 되어라",
            "startPage": 49,
            "endPage": 49
          }
        ]
      },
      {
        "index": 50,
        "label": "",
        "title": "왜 지금은 못 하는가?",
        "startPage": 50,
        "endPage": 50,
        "sections": [
          {
            "title": "왜 지금은 못 하는가?",
            "startPage": 50,
            "endPage": 50
          }
        ]
      },
      {
        "index": 51,
        "label": "",
        "title": "0을 향해 가라",
        "startPage": 51,
        "endPage": 51,
        "sections": [
          {
            "title": "0을 향해 가라",
            "startPage": 51,
            "endPage": 51
          }
        ]
      },
      {
        "index": 52,
        "label": "",
        "title": "답을 듣는 삶",
        "startPage": 52,
        "endPage": 52,
        "sections": [
          {
            "title": "답을 듣는 삶",
            "startPage": 52,
            "endPage": 52
          }
        ]
      },
      {
        "index": 53,
        "label": "",
        "title": "여행의 목적",
        "startPage": 53,
        "endPage": 53,
        "sections": [
          {
            "title": "여행의 목적",
            "startPage": 53,
            "endPage": 53
          }
        ]
      },
      {
        "index": 54,
        "label": "",
        "title": "아무것도 하지 않아야 한다",
        "startPage": 54,
        "endPage": 54,
        "sections": [
          {
            "title": "아무것도 하지 않아야 한다",
            "startPage": 54,
            "endPage": 54
          }
        ]
      },
      {
        "index": 55,
        "label": "",
        "title": "누리기 위해 오다",
        "startPage": 55,
        "endPage": 55,
        "sections": [
          {
            "title": "누리기 위해 오다",
            "startPage": 55,
            "endPage": 55
          }
        ]
      },
      {
        "index": 56,
        "label": "",
        "title": "준비된 학생",
        "startPage": 56,
        "endPage": 56,
        "sections": [
          {
            "title": "준비된 학생",
            "startPage": 56,
            "endPage": 56
          }
        ]
      },
      {
        "index": 57,
        "label": "",
        "title": "평화에 머물러라",
        "startPage": 57,
        "endPage": 57,
        "sections": [
          {
            "title": "평화에 머물러라",
            "startPage": 57,
            "endPage": 57
          }
        ]
      },
      {
        "index": 58,
        "label": "",
        "title": "걸작은 어떻게 탄생하는가",
        "startPage": 58,
        "endPage": 58,
        "sections": [
          {
            "title": "걸작은 어떻게 탄생하는가",
            "startPage": 58,
            "endPage": 58
          }
        ]
      },
      {
        "index": 59,
        "label": "",
        "title": "나의 모든 모습을 의심하라",
        "startPage": 59,
        "endPage": 59,
        "sections": [
          {
            "title": "나의 모든 모습을 의심하라",
            "startPage": 59,
            "endPage": 59
          }
        ]
      },
      {
        "index": 60,
        "label": "",
        "title": "사랑하라, 조건 없이",
        "startPage": 60,
        "endPage": 60,
        "sections": [
          {
            "title": "사랑하라, 조건 없이",
            "startPage": 60,
            "endPage": 60
          }
        ]
      },
      {
        "index": 61,
        "label": "",
        "title": "균열을 내라",
        "startPage": 61,
        "endPage": 61,
        "sections": [
          {
            "title": "균열을 내라",
            "startPage": 61,
            "endPage": 61
          }
        ]
      },
      {
        "index": 62,
        "label": "",
        "title": "한 걸음씩 전진하기",
        "startPage": 62,
        "endPage": 62,
        "sections": [
          {
            "title": "한 걸음씩 전진하기",
            "startPage": 62,
            "endPage": 62
          }
        ]
      },
      {
        "index": 63,
        "label": "",
        "title": "텅 비어 있어라",
        "startPage": 63,
        "endPage": 63,
        "sections": [
          {
            "title": "텅 비어 있어라",
            "startPage": 63,
            "endPage": 63
          }
        ]
      },
      {
        "index": 64,
        "label": "",
        "title": "존재의 99퍼센트",
        "startPage": 64,
        "endPage": 64,
        "sections": [
          {
            "title": "존재의 99퍼센트",
            "startPage": 64,
            "endPage": 64
          }
        ]
      },
      {
        "index": 65,
        "label": "",
        "title": "탁월한 관계 만들기",
        "startPage": 65,
        "endPage": 65,
        "sections": [
          {
            "title": "탁월한 관계 만들기",
            "startPage": 65,
            "endPage": 65
          }
        ]
      },
      {
        "index": 66,
        "label": "",
        "title": "그냥 피어나는 꽃들을 보라",
        "startPage": 66,
        "endPage": 66,
        "sections": [
          {
            "title": "그냥 피어나는 꽃들을 보라",
            "startPage": 66,
            "endPage": 66
          }
        ]
      },
      {
        "index": 67,
        "label": "",
        "title": "사랑을, 사랑이 가장 필요할 때",
        "startPage": 67,
        "endPage": 67,
        "sections": [
          {
            "title": "사랑을, 사랑이 가장 필요할 때",
            "startPage": 67,
            "endPage": 67
          }
        ]
      },
      {
        "index": 68,
        "label": "",
        "title": "uni+verse",
        "startPage": 68,
        "endPage": 68,
        "sections": [
          {
            "title": "uni+verse",
            "startPage": 68,
            "endPage": 68
          }
        ]
      },
      {
        "index": 69,
        "label": "",
        "title": "동시다발적으로 존재하라",
        "startPage": 69,
        "endPage": 69,
        "sections": [
          {
            "title": "동시다발적으로 존재하라",
            "startPage": 69,
            "endPage": 69
          }
        ]
      },
      {
        "index": 70,
        "label": "",
        "title": "그것들도 당신을 찾고 있다",
        "startPage": 70,
        "endPage": 70,
        "sections": [
          {
            "title": "그것들도 당신을 찾고 있다",
            "startPage": 70,
            "endPage": 70
          }
        ]
      },
      {
        "index": 71,
        "label": "",
        "title": "목격자",
        "startPage": 71,
        "endPage": 71,
        "sections": [
          {
            "title": "목격자",
            "startPage": 71,
            "endPage": 71
          }
        ]
      },
      {
        "index": 72,
        "label": "",
        "title": "갈등은 어떻게 사라지는가",
        "startPage": 72,
        "endPage": 72,
        "sections": [
          {
            "title": "갈등은 어떻게 사라지는가",
            "startPage": 72,
            "endPage": 72
          }
        ]
      },
      {
        "index": 73,
        "label": "",
        "title": "얼마나 멀리까지 당신을 데려가는가",
        "startPage": 73,
        "endPage": 73,
        "sections": [
          {
            "title": "얼마나 멀리까지 당신을 데려가는가",
            "startPage": 73,
            "endPage": 73
          }
        ]
      },
      {
        "index": 74,
        "label": "",
        "title": "꼭 이겨야 하는 상대가 있다면",
        "startPage": 74,
        "endPage": 74,
        "sections": [
          {
            "title": "꼭 이겨야 하는 상대가 있다면",
            "startPage": 74,
            "endPage": 74
          }
        ]
      },
      {
        "index": 75,
        "label": "",
        "title": "머릿속에서 탈출하라",
        "startPage": 75,
        "endPage": 75,
        "sections": [
          {
            "title": "머릿속에서 탈출하라",
            "startPage": 75,
            "endPage": 75
          }
        ]
      },
      {
        "index": 76,
        "label": "",
        "title": "사랑이 두려움을 이긴다",
        "startPage": 76,
        "endPage": 76,
        "sections": [
          {
            "title": "사랑이 두려움을 이긴다",
            "startPage": 76,
            "endPage": 76
          }
        ]
      },
      {
        "index": 77,
        "label": "",
        "title": "고통 속에 있을 때",
        "startPage": 77,
        "endPage": 77,
        "sections": [
          {
            "title": "고통 속에 있을 때",
            "startPage": 77,
            "endPage": 77
          }
        ]
      },
      {
        "index": 78,
        "label": "",
        "title": "영감의 다른 이름",
        "startPage": 78,
        "endPage": 78,
        "sections": [
          {
            "title": "영감의 다른 이름",
            "startPage": 78,
            "endPage": 78
          }
        ]
      },
      {
        "index": 79,
        "label": "",
        "title": "파도가 눈썹까지 쳐들어올 때",
        "startPage": 79,
        "endPage": 79,
        "sections": [
          {
            "title": "파도가 눈썹까지 쳐들어올 때",
            "startPage": 79,
            "endPage": 79
          }
        ]
      },
      {
        "index": 80,
        "label": "",
        "title": "지금 이 세상은",
        "startPage": 80,
        "endPage": 80,
        "sections": [
          {
            "title": "지금 이 세상은",
            "startPage": 80,
            "endPage": 80
          }
        ]
      },
      {
        "index": 81,
        "label": "",
        "title": "깨어 있는 자의 꿈",
        "startPage": 81,
        "endPage": 81,
        "sections": [
          {
            "title": "깨어 있는 자의 꿈",
            "startPage": 81,
            "endPage": 81
          }
        ]
      },
      {
        "index": 82,
        "label": "",
        "title": "영혼이 하는 일",
        "startPage": 82,
        "endPage": 82,
        "sections": [
          {
            "title": "영혼이 하는 일",
            "startPage": 82,
            "endPage": 82
          }
        ]
      },
      {
        "index": 83,
        "label": "",
        "title": "신은 어떻게 일하는가",
        "startPage": 83,
        "endPage": 83,
        "sections": [
          {
            "title": "신은 어떻게 일하는가",
            "startPage": 83,
            "endPage": 83
          }
        ]
      },
      {
        "index": 84,
        "label": "",
        "title": "특별한 피정",
        "startPage": 84,
        "endPage": 84,
        "sections": [
          {
            "title": "특별한 피정",
            "startPage": 84,
            "endPage": 84
          }
        ]
      },
      {
        "index": 85,
        "label": "",
        "title": "불안",
        "startPage": 85,
        "endPage": 85,
        "sections": [
          {
            "title": "불안",
            "startPage": 85,
            "endPage": 85
          }
        ]
      },
      {
        "index": 86,
        "label": "",
        "title": "어디로 가는지 귀 기울이면",
        "startPage": 86,
        "endPage": 86,
        "sections": [
          {
            "title": "어디로 가는지 귀 기울이면",
            "startPage": 86,
            "endPage": 86
          }
        ]
      },
      {
        "index": 87,
        "label": "",
        "title": "자연스럽다는 것",
        "startPage": 87,
        "endPage": 87,
        "sections": [
          {
            "title": "자연스럽다는 것",
            "startPage": 87,
            "endPage": 87
          }
        ]
      },
      {
        "index": 88,
        "label": "",
        "title": "지금 여기에 생각 떨어뜨리기",
        "startPage": 88,
        "endPage": 88,
        "sections": [
          {
            "title": "지금 여기에 생각 떨어뜨리기",
            "startPage": 88,
            "endPage": 88
          }
        ]
      },
      {
        "index": 89,
        "label": "",
        "title": "어제는 끝났다",
        "startPage": 89,
        "endPage": 89,
        "sections": [
          {
            "title": "어제는 끝났다",
            "startPage": 89,
            "endPage": 89
          }
        ]
      },
      {
        "index": 90,
        "label": "",
        "title": "나는 행동과 결과가 아니다",
        "startPage": 90,
        "endPage": 90,
        "sections": [
          {
            "title": "나는 행동과 결과가 아니다",
            "startPage": 90,
            "endPage": 90
          }
        ]
      },
      {
        "index": 91,
        "label": "",
        "title": "저항을 잠재우는 힘",
        "startPage": 91,
        "endPage": 91,
        "sections": [
          {
            "title": "저항을 잠재우는 힘",
            "startPage": 91,
            "endPage": 91
          }
        ]
      },
      {
        "index": 92,
        "label": "",
        "title": "당신은",
        "startPage": 92,
        "endPage": 92,
        "sections": [
          {
            "title": "당신은",
            "startPage": 92,
            "endPage": 92
          }
        ]
      },
      {
        "index": 93,
        "label": "",
        "title": "옳고 싶은가, 행복하고 싶은가",
        "startPage": 93,
        "endPage": 93,
        "sections": [
          {
            "title": "옳고 싶은가, 행복하고 싶은가",
            "startPage": 93,
            "endPage": 93
          }
        ]
      },
      {
        "index": 94,
        "label": "",
        "title": "오래된 방식을 떠나라",
        "startPage": 94,
        "endPage": 94,
        "sections": [
          {
            "title": "오래된 방식을 떠나라",
            "startPage": 94,
            "endPage": 94
          }
        ]
      },
      {
        "index": 95,
        "label": "",
        "title": "거절한 사람에게 감사하라",
        "startPage": 95,
        "endPage": 95,
        "sections": [
          {
            "title": "거절한 사람에게 감사하라",
            "startPage": 95,
            "endPage": 95
          }
        ]
      },
      {
        "index": 96,
        "label": "",
        "title": "존재하게 두어라",
        "startPage": 96,
        "endPage": 96,
        "sections": [
          {
            "title": "존재하게 두어라",
            "startPage": 96,
            "endPage": 96
          }
        ]
      },
      {
        "index": 97,
        "label": "",
        "title": "선언의 자세",
        "startPage": 97,
        "endPage": 97,
        "sections": [
          {
            "title": "선언의 자세",
            "startPage": 97,
            "endPage": 97
          }
        ]
      },
      {
        "index": 98,
        "label": "",
        "title": "원망해도 괜찮다",
        "startPage": 98,
        "endPage": 98,
        "sections": [
          {
            "title": "원망해도 괜찮다",
            "startPage": 98,
            "endPage": 98
          }
        ]
      },
      {
        "index": 99,
        "label": "",
        "title": "카르페디엠",
        "startPage": 99,
        "endPage": 99,
        "sections": [
          {
            "title": "카르페디엠",
            "startPage": 99,
            "endPage": 99
          }
        ]
      },
      {
        "index": 100,
        "label": "",
        "title": "끝에서부터 생각하기",
        "startPage": 100,
        "endPage": 100,
        "sections": [
          {
            "title": "끝에서부터 생각하기",
            "startPage": 100,
            "endPage": 100
          }
        ]
      },
      {
        "index": 101,
        "label": "",
        "title": "삶은 늘 취약하다",
        "startPage": 101,
        "endPage": 101,
        "sections": [
          {
            "title": "삶은 늘 취약하다",
            "startPage": 101,
            "endPage": 101
          }
        ]
      },
      {
        "index": 102,
        "label": "",
        "title": "끌어당김의 법칙",
        "startPage": 102,
        "endPage": 102,
        "sections": [
          {
            "title": "끌어당김의 법칙",
            "startPage": 102,
            "endPage": 102
          }
        ]
      },
      {
        "index": 103,
        "label": "",
        "title": "쓸모없는 것들의 축복",
        "startPage": 103,
        "endPage": 103,
        "sections": [
          {
            "title": "쓸모없는 것들의 축복",
            "startPage": 103,
            "endPage": 103
          }
        ]
      },
      {
        "index": 104,
        "label": "",
        "title": "무엇을 위해 기도하는가",
        "startPage": 104,
        "endPage": 104,
        "sections": [
          {
            "title": "무엇을 위해 기도하는가",
            "startPage": 104,
            "endPage": 104
          }
        ]
      },
      {
        "index": 105,
        "label": "",
        "title": "신은 모든 새에게 먹이를 준다",
        "startPage": 105,
        "endPage": 105,
        "sections": [
          {
            "title": "신은 모든 새에게 먹이를 준다",
            "startPage": 105,
            "endPage": 105
          }
        ]
      },
      {
        "index": 106,
        "label": "",
        "title": "몸은 내가 사는 집",
        "startPage": 106,
        "endPage": 106,
        "sections": [
          {
            "title": "몸은 내가 사는 집",
            "startPage": 106,
            "endPage": 106
          }
        ]
      },
      {
        "index": 107,
        "label": "",
        "title": "아무것도 아닌 곳에서 와서",
        "startPage": 107,
        "endPage": 107,
        "sections": [
          {
            "title": "아무것도 아닌 곳에서 와서",
            "startPage": 107,
            "endPage": 107
          }
        ]
      },
      {
        "index": 108,
        "label": "",
        "title": "잡동사니",
        "startPage": 108,
        "endPage": 108,
        "sections": [
          {
            "title": "잡동사니",
            "startPage": 108,
            "endPage": 108
          }
        ]
      },
      {
        "index": 109,
        "label": "",
        "title": "진짜 이유를 찾아라",
        "startPage": 109,
        "endPage": 109,
        "sections": [
          {
            "title": "진짜 이유를 찾아라",
            "startPage": 109,
            "endPage": 109
          }
        ]
      },
      {
        "index": 110,
        "label": "",
        "title": "겸손의 경지",
        "startPage": 110,
        "endPage": 110,
        "sections": [
          {
            "title": "겸손의 경지",
            "startPage": 110,
            "endPage": 110
          }
        ]
      },
      {
        "index": 111,
        "label": "",
        "title": "씨앗 하나의 우주",
        "startPage": 111,
        "endPage": 111,
        "sections": [
          {
            "title": "씨앗 하나의 우주",
            "startPage": 111,
            "endPage": 111
          }
        ]
      },
      {
        "index": 112,
        "label": "",
        "title": "예외는 없다",
        "startPage": 112,
        "endPage": 112,
        "sections": [
          {
            "title": "예외는 없다",
            "startPage": 112,
            "endPage": 112
          }
        ]
      },
      {
        "index": 113,
        "label": "",
        "title": "선한 영향력",
        "startPage": 113,
        "endPage": 113,
        "sections": [
          {
            "title": "선한 영향력",
            "startPage": 113,
            "endPage": 113
          }
        ]
      },
      {
        "index": 114,
        "label": "",
        "title": "초월한다는 것",
        "startPage": 114,
        "endPage": 114,
        "sections": [
          {
            "title": "초월한다는 것",
            "startPage": 114,
            "endPage": 114
          }
        ]
      },
      {
        "index": 115,
        "label": "",
        "title": "명상의 이유",
        "startPage": 115,
        "endPage": 115,
        "sections": [
          {
            "title": "명상의 이유",
            "startPage": 115,
            "endPage": 115
          }
        ]
      },
      {
        "index": 116,
        "label": "",
        "title": "괴로움의 형태",
        "startPage": 116,
        "endPage": 116,
        "sections": [
          {
            "title": "괴로움의 형태",
            "startPage": 116,
            "endPage": 116
          }
        ]
      },
      {
        "index": 117,
        "label": "",
        "title": "언제든 할 수 있는 일",
        "startPage": 117,
        "endPage": 117,
        "sections": [
          {
            "title": "언제든 할 수 있는 일",
            "startPage": 117,
            "endPage": 117
          }
        ]
      },
      {
        "index": 118,
        "label": "",
        "title": "가치의 존재",
        "startPage": 118,
        "endPage": 118,
        "sections": [
          {
            "title": "가치의 존재",
            "startPage": 118,
            "endPage": 118
          }
        ]
      },
      {
        "index": 119,
        "label": "",
        "title": "미묘한 방문자",
        "startPage": 119,
        "endPage": 119,
        "sections": [
          {
            "title": "미묘한 방문자",
            "startPage": 119,
            "endPage": 119
          }
        ]
      },
      {
        "index": 120,
        "label": "",
        "title": "결핍을 내던져라",
        "startPage": 120,
        "endPage": 120,
        "sections": [
          {
            "title": "결핍을 내던져라",
            "startPage": 120,
            "endPage": 120
          }
        ]
      },
      {
        "index": 121,
        "label": "",
        "title": "모든 것은 에너지다",
        "startPage": 121,
        "endPage": 121,
        "sections": [
          {
            "title": "모든 것은 에너지다",
            "startPage": 121,
            "endPage": 121
          }
        ]
      },
      {
        "index": 122,
        "label": "",
        "title": "신이 준 단어",
        "startPage": 122,
        "endPage": 122,
        "sections": [
          {
            "title": "신이 준 단어",
            "startPage": 122,
            "endPage": 122
          }
        ]
      },
      {
        "index": 123,
        "label": "",
        "title": "정오에서 오후 4시까지",
        "startPage": 123,
        "endPage": 123,
        "sections": [
          {
            "title": "정오에서 오후 4시까지",
            "startPage": 123,
            "endPage": 123
          }
        ]
      },
      {
        "index": 124,
        "label": "",
        "title": "5분 후를 생각하라",
        "startPage": 124,
        "endPage": 124,
        "sections": [
          {
            "title": "5분 후를 생각하라",
            "startPage": 124,
            "endPage": 124
          }
        ]
      },
      {
        "index": 125,
        "label": "",
        "title": "사랑은 증오보다",
        "startPage": 125,
        "endPage": 125,
        "sections": [
          {
            "title": "사랑은 증오보다",
            "startPage": 125,
            "endPage": 125
          }
        ]
      },
      {
        "index": 126,
        "label": "",
        "title": "계획과 사랑에 빠지지 마라",
        "startPage": 126,
        "endPage": 126,
        "sections": [
          {
            "title": "계획과 사랑에 빠지지 마라",
            "startPage": 126,
            "endPage": 126
          }
        ]
      },
      {
        "index": 127,
        "label": "",
        "title": "생각보다 쉬운 게 인생이지",
        "startPage": 127,
        "endPage": 127,
        "sections": [
          {
            "title": "생각보다 쉬운 게 인생이지",
            "startPage": 127,
            "endPage": 127
          }
        ]
      },
      {
        "index": 128,
        "label": "",
        "title": "비관론자에 관한 단상",
        "startPage": 128,
        "endPage": 128,
        "sections": [
          {
            "title": "비관론자에 관한 단상",
            "startPage": 128,
            "endPage": 128
          }
        ]
      },
      {
        "index": 129,
        "label": "",
        "title": "누구 때문인가",
        "startPage": 129,
        "endPage": 129,
        "sections": [
          {
            "title": "누구 때문인가",
            "startPage": 129,
            "endPage": 129
          }
        ]
      },
      {
        "index": 130,
        "label": "",
        "title": "스스로 인생이 되어라",
        "startPage": 130,
        "endPage": 130,
        "sections": [
          {
            "title": "스스로 인생이 되어라",
            "startPage": 130,
            "endPage": 130
          }
        ]
      },
      {
        "index": 131,
        "label": "",
        "title": "낮은 희망에 도달하지 마라",
        "startPage": 131,
        "endPage": 131,
        "sections": [
          {
            "title": "낮은 희망에 도달하지 마라",
            "startPage": 131,
            "endPage": 131
          }
        ]
      },
      {
        "index": 132,
        "label": "",
        "title": "두 개의 무덤",
        "startPage": 132,
        "endPage": 132,
        "sections": [
          {
            "title": "두 개의 무덤",
            "startPage": 132,
            "endPage": 132
          }
        ]
      },
      {
        "index": 133,
        "label": "",
        "title": "문제의 무게를 줄여라",
        "startPage": 133,
        "endPage": 133,
        "sections": [
          {
            "title": "문제의 무게를 줄여라",
            "startPage": 133,
            "endPage": 133
          }
        ]
      },
      {
        "index": 134,
        "label": "",
        "title": "즉흥이 필요하다",
        "startPage": 134,
        "endPage": 134,
        "sections": [
          {
            "title": "즉흥이 필요하다",
            "startPage": 134,
            "endPage": 134
          }
        ]
      },
      {
        "index": 135,
        "label": "",
        "title": "침묵의 의미",
        "startPage": 135,
        "endPage": 135,
        "sections": [
          {
            "title": "침묵의 의미",
            "startPage": 135,
            "endPage": 135
          }
        ]
      },
      {
        "index": 136,
        "label": "",
        "title": "고요한 시간을 확보하라",
        "startPage": 136,
        "endPage": 136,
        "sections": [
          {
            "title": "고요한 시간을 확보하라",
            "startPage": 136,
            "endPage": 136
          }
        ]
      },
      {
        "index": 137,
        "label": "",
        "title": "마음이라는 연못",
        "startPage": 137,
        "endPage": 137,
        "sections": [
          {
            "title": "마음이라는 연못",
            "startPage": 137,
            "endPage": 137
          }
        ]
      },
      {
        "index": 138,
        "label": "",
        "title": "신은 어디에나 있다",
        "startPage": 138,
        "endPage": 138,
        "sections": [
          {
            "title": "신은 어디에나 있다",
            "startPage": 138,
            "endPage": 138
          }
        ]
      },
      {
        "index": 139,
        "label": "",
        "title": "시련이 나를 극복했다",
        "startPage": 139,
        "endPage": 139,
        "sections": [
          {
            "title": "시련이 나를 극복했다",
            "startPage": 139,
            "endPage": 139
          }
        ]
      },
      {
        "index": 140,
        "label": "",
        "title": "도전이란",
        "startPage": 140,
        "endPage": 140,
        "sections": [
          {
            "title": "도전이란",
            "startPage": 140,
            "endPage": 140
          }
        ]
      },
      {
        "index": 141,
        "label": "",
        "title": "동시성의 힘",
        "startPage": 141,
        "endPage": 141,
        "sections": [
          {
            "title": "동시성의 힘",
            "startPage": 141,
            "endPage": 141
          }
        ]
      },
      {
        "index": 142,
        "label": "",
        "title": "삶을 노크하는 생각",
        "startPage": 142,
        "endPage": 142,
        "sections": [
          {
            "title": "삶을 노크하는 생각",
            "startPage": 142,
            "endPage": 142
          }
        ]
      },
      {
        "index": 143,
        "label": "",
        "title": "빠르게 움직여라",
        "startPage": 143,
        "endPage": 143,
        "sections": [
          {
            "title": "빠르게 움직여라",
            "startPage": 143,
            "endPage": 143
          }
        ]
      },
      {
        "index": 144,
        "label": "",
        "title": "왼쪽 뇌에만 집중하면",
        "startPage": 144,
        "endPage": 144,
        "sections": [
          {
            "title": "왼쪽 뇌에만 집중하면",
            "startPage": 144,
            "endPage": 144
          }
        ]
      },
      {
        "index": 145,
        "label": "",
        "title": "물러나기",
        "startPage": 145,
        "endPage": 145,
        "sections": [
          {
            "title": "물러나기",
            "startPage": 145,
            "endPage": 145
          }
        ]
      },
      {
        "index": 146,
        "label": "",
        "title": "진가를 알아보라",
        "startPage": 146,
        "endPage": 146,
        "sections": [
          {
            "title": "진가를 알아보라",
            "startPage": 146,
            "endPage": 146
          }
        ]
      },
      {
        "index": 147,
        "label": "",
        "title": "틈에 관한 고찰",
        "startPage": 147,
        "endPage": 147,
        "sections": [
          {
            "title": "틈에 관한 고찰",
            "startPage": 147,
            "endPage": 147
          }
        ]
      },
      {
        "index": 148,
        "label": "",
        "title": "순응과 용기",
        "startPage": 148,
        "endPage": 148,
        "sections": [
          {
            "title": "순응과 용기",
            "startPage": 148,
            "endPage": 148
          }
        ]
      },
      {
        "index": 149,
        "label": "",
        "title": "인생의 가장 큰 선물",
        "startPage": 149,
        "endPage": 149,
        "sections": [
          {
            "title": "인생의 가장 큰 선물",
            "startPage": 149,
            "endPage": 149
          }
        ]
      },
      {
        "index": 150,
        "label": "",
        "title": "나만의 음악을 연주하라",
        "startPage": 150,
        "endPage": 256,
        "sections": [
          {
            "title": "나만의 음악을 연주하라",
            "startPage": 150,
            "endPage": 256
          }
        ]
      }
    ],
    "costKrw": 1.4763000000000002,
    "inputTokens": 3076,
    "outputTokens": 2746
  },
  "9791193262757": {
    "isbn13": "9791193262757",
    "title": "프롬프트 텔링 - 격차를 만드는 AI 소통 능력",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "",
        "title": "추천의 글",
        "startPage": 1,
        "endPage": 60,
        "sections": [
          {
            "title": "추천의 글",
            "startPage": 1,
            "endPage": 60
          }
        ]
      },
      {
        "index": 2,
        "label": "1부",
        "title": "AI 시대, 프롬프트적 사고는 필수다",
        "startPage": 61,
        "endPage": 120,
        "sections": [
          {
            "title": "CHAPTER 01. 프롬프트적 사고법, 생존에 필수다",
            "startPage": 61,
            "endPage": 80
          },
          {
            "title": "CHAPTER 02. AI 유니버스, AI 캐릭터성 이해하기",
            "startPage": 81,
            "endPage": 100
          },
          {
            "title": "CHAPTER 03. 프롬프트 텔링, 나만의 AI 세계관을 그려라",
            "startPage": 101,
            "endPage": 120
          }
        ]
      },
      {
        "index": 3,
        "label": "2부",
        "title": "프로의 비밀, 프롬프트 텔링 공식",
        "startPage": 121,
        "endPage": 180,
        "sections": [
          {
            "title": "CHAPTER 01. 실패하는 프롬프트 vs 성공하는 프롬프트",
            "startPage": 121,
            "endPage": 140
          },
          {
            "title": "CHAPTER 02. 상위 1% 프롬프트 텔링 공식",
            "startPage": 141,
            "endPage": 160
          },
          {
            "title": "CHAPTER 03. 상황별 모듈형 프롬프트 완성하기",
            "startPage": 161,
            "endPage": 180
          }
        ]
      },
      {
        "index": 4,
        "label": "3부",
        "title": "실무에 바로 써먹는 프롬프트 기술",
        "startPage": 181,
        "endPage": 240,
        "sections": [
          {
            "title": "CHAPTER 01. 콘텐츠 크리에이터를 위한 프롬프트",
            "startPage": 181,
            "endPage": 192
          },
          {
            "title": "CHAPTER 02. 프리랜서와 N잡러를 위한 프롬프트",
            "startPage": 193,
            "endPage": 204
          },
          {
            "title": "CHAPTER 03. 브랜드 대표를 위한 프롬프트",
            "startPage": 205,
            "endPage": 216
          },
          {
            "title": "CHAPTER 04. 기획자&마케터를 위한 프롬프트",
            "startPage": 217,
            "endPage": 228
          },
          {
            "title": "CHAPTER 05. 내 인생을 업그레이드하는 프롬프트",
            "startPage": 229,
            "endPage": 240
          }
        ]
      },
      {
        "index": 5,
        "label": "4부",
        "title": "나만의 AI 시스템 설계하기",
        "startPage": 241,
        "endPage": 304,
        "sections": [
          {
            "title": "CHAPTER 01. 연결의 힘, AI 유니버스를 구축하는 노하우",
            "startPage": 241,
            "endPage": 261
          },
          {
            "title": "CHAPTER 02. 나만의 AI 챗봇 설계하기",
            "startPage": 262,
            "endPage": 282
          },
          {
            "title": "CHAPTER 03. AI 세계관, 우리의 다음 챕터는?",
            "startPage": 283,
            "endPage": 304
          }
        ]
      }
    ],
    "costKrw": 0.335055,
    "inputTokens": 1771,
    "outputTokens": 355
  },
  "9788997850006": {
    "isbn13": "9788997850006",
    "title": "지독재독 - 천천히, 그리고 다시 한 번 곱씹는 독서법",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "제1장",
        "title": "무작정 책을 읽는 당신에게",
        "startPage": 1,
        "endPage": 79,
        "sections": [
          {
            "title": "목적이 없다면 책을 읽지 마라: 아리스토텔레스의 목적론",
            "startPage": 1,
            "endPage": 9,
            "label": "HOW TO 1"
          },
          {
            "title": "어려운 책이라면 인내심을 가지고 천천히 그리고 깊게 읽어라: 위백규의 우물론",
            "startPage": 10,
            "endPage": 18,
            "label": "HOW TO 2"
          },
          {
            "title": "끊임없이 의심하며 읽어라: 데카르트의 방법적 회의론",
            "startPage": 19,
            "endPage": 27,
            "label": "HOW TO 3"
          },
          {
            "title": "생각하며 반복적으로 읽어라: 공자의 정독론, 반복독서론",
            "startPage": 28,
            "endPage": 36,
            "label": "HOW TO 4"
          },
          {
            "title": "작가와 끊임없이 대화하며 읽어라: 소크라테스의 대화론",
            "startPage": 37,
            "endPage": 45,
            "label": "HOW TO 5"
          },
          {
            "title": "독서를 위한 공간을 따로 마련하라: 선비들의 독서당론",
            "startPage": 46,
            "endPage": 54,
            "label": "HOW TO 6"
          },
          {
            "title": "모든 시간이 독서하기 좋은 때이다: 동우의 삼여지설",
            "startPage": 55,
            "endPage": 63,
            "label": "HOW TO 7"
          },
          {
            "title": "독서의 마지막 단계는 글쓰기이다: 구양수의 삼다론",
            "startPage": 64,
            "endPage": 79,
            "label": "HOW TO 8"
          }
        ]
      },
      {
        "index": 2,
        "label": "제2장",
        "title": "무슨 책을 읽어야 할지 모르는 당신에게",
        "startPage": 80,
        "endPage": 158,
        "sections": [
          {
            "title": "적게 읽고 많은 것을 얻으려 하지 말라: 카프카의〈오스카 폴락에게 보낸 편지〉",
            "startPage": 80,
            "endPage": 88,
            "label": "WHAT TO 1"
          },
          {
            "title": "추천도서와 베스트셀러는 없다: 존 스튜어트 밀의〈자유론〉",
            "startPage": 89,
            "endPage": 97,
            "label": "WHAT TO 2"
          },
          {
            "title": "삶의 길을 잃었다면 평전을 읽어라: 사마천의〈사기〉, 플루타르크의〈플루타르크 영웅전〉",
            "startPage": 98,
            "endPage": 106,
            "label": "WHAT TO 3"
          },
          {
            "title": "여행기를 읽을 때 사유는 시작된다: 박지원의〈열하일기〉",
            "startPage": 107,
            "endPage": 115,
            "label": "WHAT TO 4"
          },
          {
            "title": "이성을 지배할 감성이 필요하다면 시를 읽어라: 굴원의〈초사〉",
            "startPage": 116,
            "endPage": 124,
            "label": "WHAT TO 5"
          },
          {
            "title": "가장 먼저 그리고 반드시 고전을 읽어라: 쇼펜하우어의〈여록과 보유〉",
            "startPage": 125,
            "endPage": 133,
            "label": "WHAT TO 6"
          },
          {
            "title": "신화를 읽는다면 세상이 천국으로 변할 것이다: 호메로스의〈일리아드〉, 김만중의〈구운몽〉",
            "startPage": 134,
            "endPage": 142,
            "label": "WHAT TO 7"
          },
          {
            "title": "진정한 리더는 유행을 쫓는 책을 읽지 않는다:〈관자〉,〈묵자〉,〈도덕경〉",
            "startPage": 143,
            "endPage": 158,
            "label": "WHAT TO 8"
          }
        ]
      },
      {
        "index": 3,
        "label": "제3장",
        "title": "작은 감동을 얻고 싶은 당신에게",
        "startPage": 159,
        "endPage": 239,
        "sections": [
          {
            "title": "사막에 가고 싶다: 윤대녕의〈피아노와 백합의 사막〉",
            "startPage": 159,
            "endPage": 163,
            "label": "DIARY 1"
          },
          {
            "title": "화장하는 여자가 좋다: 로버트 그린의〈유혹의 기술〉",
            "startPage": 164,
            "endPage": 168,
            "label": "DIARY 2"
          },
          {
            "title": "지식인은 외로워야 한다: 심경호의〈김시습 평전〉",
            "startPage": 169,
            "endPage": 173,
            "label": "DIARY 3"
          },
          {
            "title": "늙는 것은 나이가 아니라 능력이다: 보부아르의〈노년〉",
            "startPage": 174,
            "endPage": 178,
            "label": "DIARY 4"
          },
          {
            "title": "불안이 우리를 강하게 만든다: 알랭드보통의〈불안〉",
            "startPage": 179,
            "endPage": 183,
            "label": "DIARY 5"
          },
          {
            "title": "시간에는 유효기간이 있다: 칼 하인츠, 가이슬러의〈시간〉",
            "startPage": 184,
            "endPage": 188,
            "label": "DIARY 6"
          },
          {
            "title": "무엇이 아니라 어떻게가 중요하다: 로버트 루트 번스타인의〈생각의 탄생〉",
            "startPage": 189,
            "endPage": 193,
            "label": "DIARY 7"
          },
          {
            "title": "진솔한 언행으로 덕을 쌓아야 한다: 주흥사의〈천자문〉",
            "startPage": 194,
            "endPage": 198,
            "label": "DIARY 8"
          },
          {
            "title": "나무는 사람이다: 베르나르 베르베르의〈나무〉",
            "startPage": 199,
            "endPage": 203,
            "label": "DIARY 9"
          },
          {
            "title": "몸, 인생을 말하다: 샤오춘레이의〈욕망과 지혜의 문화사전 몸〉",
            "startPage": 204,
            "endPage": 208,
            "label": "DIARY 10"
          },
          {
            "title": "돈은 더 이상 부의 기준이 아니다: 앨빈 토플러의〈부의 미래〉",
            "startPage": 209,
            "endPage": 213,
            "label": "DIARY 11"
          },
          {
            "title": "연민도 유행을 탄다: 수잔 손택의〈타인의 고통〉",
            "startPage": 214,
            "endPage": 218,
            "label": "DIARY 12"
          },
          {
            "title": "그래서 동양이 아름답다: 후지와라 신야의〈동양기행〉",
            "startPage": 219,
            "endPage": 223,
            "label": "DIARY 13"
          },
          {
            "title": "시는 사람을 꽃피게 한다: 파블로 네루다의〈스무 편의 사랑의 시와 한 편의 절망의 노래〉",
            "startPage": 224,
            "endPage": 228,
            "label": "DIARY 14"
          },
          {
            "title": "가르침은 존재하지 않는다: 신영복의〈나의 동양 고전 독법 강의〉",
            "startPage": 229,
            "endPage": 239,
            "label": "DIARY 15"
          }
        ]
      }
    ],
    "costKrw": 0.5292,
    "inputTokens": 2424,
    "outputTokens": 654
  },
  "9791188102259": {
    "isbn13": "9791188102259",
    "title": "더 시스템 - 거의 모든 일에 실패하던 자가 결국 큰 성공을 이루어낸 방법, 개정판",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "들어가며",
        "title": "당신만의 성공 공식을 찾아라",
        "startPage": 1,
        "endPage": 54,
        "sections": [
          {
            "title": "당신만의 성공 공식을 찾아라",
            "startPage": 1,
            "endPage": 54
          }
        ]
      },
      {
        "index": 2,
        "label": "",
        "title": "PART 1. 실패를 인정하고 뽑아먹어라",
        "startPage": 55,
        "endPage": 108,
        "sections": [
          {
            "title": "내가 정상이 아니라고?",
            "startPage": 55,
            "endPage": 60,
            "label": "01"
          },
          {
            "title": "실패를 불러들여라",
            "startPage": 61,
            "endPage": 66,
            "label": "02"
          },
          {
            "title": "열정 같은 소리하네",
            "startPage": 67,
            "endPage": 72,
            "label": "03"
          },
          {
            "title": "찬란한 실패의 역사",
            "startPage": 73,
            "endPage": 78,
            "label": "04"
          },
          {
            "title": "죽을 뻔한 최악의 선택",
            "startPage": 79,
            "endPage": 84,
            "label": "05"
          },
          {
            "title": "패자는 목표를 설정하고 승자는 시스템을 만든다",
            "startPage": 85,
            "endPage": 90,
            "label": "06"
          },
          {
            "title": "나만의 시스템을 구축하다",
            "startPage": 91,
            "endPage": 96,
            "label": "07"
          },
          {
            "title": "회사를 그만두기로 결심하다",
            "startPage": 97,
            "endPage": 108,
            "label": "08"
          }
        ]
      },
      {
        "index": 3,
        "label": "",
        "title": "PART 2. 나는 성공하기로 결정했다",
        "startPage": 109,
        "endPage": 162,
        "sections": [
          {
            "title": "성공을 결정하라. 원하지 말고",
            "startPage": 109,
            "endPage": 113,
            "label": "01"
          },
          {
            "title": "차라리 이기적인 사람이 되어라",
            "startPage": 114,
            "endPage": 118,
            "label": "02"
          },
          {
            "title": "에너지 레벨을 높이는 7가지 비밀",
            "startPage": 119,
            "endPage": 123,
            "label": "03"
          },
          {
            "title": "당신의 상상이 현실이 된다",
            "startPage": 124,
            "endPage": 128,
            "label": "04"
          },
          {
            "title": "그런 척하라. 그렇게 된다",
            "startPage": 129,
            "endPage": 133,
            "label": "05"
          },
          {
            "title": "위기를 기회로 삼는 방법",
            "startPage": 134,
            "endPage": 138,
            "label": "06"
          },
          {
            "title": "백만 불짜리 조언",
            "startPage": 139,
            "endPage": 143,
            "label": "07"
          },
          {
            "title": "싸울 상대를 명확히 하다",
            "startPage": 144,
            "endPage": 148,
            "label": "08"
          },
          {
            "title": "방향을 잃고 헤매다",
            "startPage": 149,
            "endPage": 153,
            "label": "09"
          },
          {
            "title": "잘되는 일을 찾는 방법",
            "startPage": 154,
            "endPage": 162,
            "label": "10"
          }
        ]
      },
      {
        "index": 4,
        "label": "",
        "title": "PART 3. 성공을 찾아서",
        "startPage": 163,
        "endPage": 216,
        "sections": [
          {
            "title": "연습이 능사는 아니다",
            "startPage": 163,
            "endPage": 166,
            "label": "01"
          },
          {
            "title": "성공 확률을 높이는 공식",
            "startPage": 167,
            "endPage": 170,
            "label": "02"
          },
          {
            "title": "성공으로 이끄는 15가지 기술",
            "startPage": 171,
            "endPage": 174,
            "label": "03"
          },
          {
            "title": "패턴을 찾아라",
            "startPage": 175,
            "endPage": 178,
            "label": "04"
          },
          {
            "title": "매력 넘치는 사람이 되고 싶다면",
            "startPage": 179,
            "endPage": 182,
            "label": "05"
          },
          {
            "title": "긍정 선언의 힘",
            "startPage": 183,
            "endPage": 186,
            "label": "06"
          },
          {
            "title": "버티고 또 버텨라",
            "startPage": 187,
            "endPage": 190,
            "label": "07"
          },
          {
            "title": "성공 확률이 높은 일은 따로 있다",
            "startPage": 191,
            "endPage": 194,
            "label": "08"
          },
          {
            "title": "우울증을 견디게 해준 두 가지 시스템",
            "startPage": 195,
            "endPage": 198,
            "label": "09"
          },
          {
            "title": "전문가를 믿지 마라",
            "startPage": 199,
            "endPage": 202,
            "label": "10"
          },
          {
            "title": "주위 사람의 영향력",
            "startPage": 203,
            "endPage": 216,
            "label": "11"
          }
        ]
      },
      {
        "index": 5,
        "label": "",
        "title": "PART 4. 결국은 시스템이다",
        "startPage": 217,
        "endPage": 270,
        "sections": [
          {
            "title": "행복의 메커니즘",
            "startPage": 217,
            "endPage": 223,
            "label": "01"
          },
          {
            "title": "건강한 식습관이 시작이다",
            "startPage": 224,
            "endPage": 230,
            "label": "02"
          },
          {
            "title": "지금 당장 운동하라",
            "startPage": 231,
            "endPage": 237,
            "label": "03"
          },
          {
            "title": "시도하지 않으면 아무것도 얻을 수 없다",
            "startPage": 238,
            "endPage": 244,
            "label": "04"
          },
          {
            "title": "운을 끌어당기려면",
            "startPage": 245,
            "endPage": 251,
            "label": "05"
          },
          {
            "title": "포기하지 마라",
            "startPage": 252,
            "endPage": 258,
            "label": "06"
          },
          {
            "title": "JUST DO IT",
            "startPage": 259,
            "endPage": 270,
            "label": "07"
          }
        ]
      },
      {
        "index": 6,
        "label": "",
        "title": "마치며 당신만의 시스템을 기대하며",
        "startPage": 271,
        "endPage": 324,
        "sections": [
          {
            "title": "마치며 당신만의 시스템을 기대하며",
            "startPage": 271,
            "endPage": 324
          }
        ]
      },
      {
        "index": 7,
        "label": "",
        "title": "참고 문헌",
        "startPage": 325,
        "endPage": 384,
        "sections": [
          {
            "title": "참고 문헌",
            "startPage": 325,
            "endPage": 384
          }
        ]
      }
    ],
    "costKrw": 0.56805,
    "inputTokens": 2074,
    "outputTokens": 834
  },
  "9791192143248": {
    "isbn13": "9791192143248",
    "title": "훅",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "들어가며",
        "title": "_훅, 제품이 습관이 되는 4단계 과정",
        "startPage": 1,
        "endPage": 31,
        "sections": [
          {
            "title": "_훅, 제품이 습관이 되는 4단계 과정",
            "startPage": 1,
            "endPage": 31
          }
        ]
      },
      {
        "index": 2,
        "label": "",
        "title": "Part 1. 왜 기업은 사용자 습관을 지배해야 하는가",
        "startPage": 32,
        "endPage": 62,
        "sections": [
          {
            "title": "Part 1. 왜 기업은 사용자 습관을 지배해야 하는가",
            "startPage": 32,
            "endPage": 62
          }
        ]
      },
      {
        "index": 3,
        "label": "",
        "title": "Part 2. 훅 1단계: 트리거_무엇이 우리를 움직여 제품을 사용하게 하는가",
        "startPage": 63,
        "endPage": 93,
        "sections": [
          {
            "title": "Part 2. 훅 1단계: 트리거_무엇이 우리를 움직여 제품을 사용하게 하는가",
            "startPage": 63,
            "endPage": 93
          }
        ]
      },
      {
        "index": 4,
        "label": "",
        "title": "Part 3. 훅 2단계: 당신이 의도한 대로 사용자가 행동하게 하라",
        "startPage": 94,
        "endPage": 124,
        "sections": [
          {
            "title": "Part 3. 훅 2단계: 당신이 의도한 대로 사용자가 행동하게 하라",
            "startPage": 94,
            "endPage": 124
          }
        ]
      },
      {
        "index": 5,
        "label": "",
        "title": "Part 4. 훅 3단계: 가변적 보상_누구나 가려운 곳을 긁어줄 적절한 보상을 원한다",
        "startPage": 125,
        "endPage": 155,
        "sections": [
          {
            "title": "Part 4. 훅 3단계: 가변적 보상_누구나 가려운 곳을 긁어줄 적절한 보상을 원한다",
            "startPage": 125,
            "endPage": 155
          }
        ]
      },
      {
        "index": 6,
        "label": "",
        "title": "Part 5. 훅 4단계: 투자_스스로 시간과 노력을 쏟으면 오래 사용하게 된다",
        "startPage": 156,
        "endPage": 186,
        "sections": [
          {
            "title": "Part 5. 훅 4단계: 투자_스스로 시간과 노력을 쏟으면 오래 사용하게 된다",
            "startPage": 156,
            "endPage": 186
          }
        ]
      },
      {
        "index": 7,
        "label": "",
        "title": "Part 6. 결국 당신이 이루고자 하는 것은 무엇인가",
        "startPage": 187,
        "endPage": 217,
        "sections": [
          {
            "title": "Part 6. 결국 당신이 이루고자 하는 것은 무엇인가",
            "startPage": 187,
            "endPage": 217
          }
        ]
      },
      {
        "index": 8,
        "label": "",
        "title": "Part 7. 유버전의 사례, 성경 읽기를 ‘습관’으로",
        "startPage": 218,
        "endPage": 248,
        "sections": [
          {
            "title": "Part 7. 유버전의 사례, 성경 읽기를 ‘습관’으로",
            "startPage": 218,
            "endPage": 248
          }
        ]
      },
      {
        "index": 9,
        "label": "",
        "title": "Part 8. 당신의 제품이 습관이 될 기회를 포착하라",
        "startPage": 249,
        "endPage": 282,
        "sections": [
          {
            "title": "Part 8. 당신의 제품이 습관이 될 기회를 포착하라",
            "startPage": 249,
            "endPage": 282
          }
        ]
      }
    ],
    "costKrw": 0.23771999999999996,
    "inputTokens": 1628,
    "outputTokens": 159
  },
  "9791193904671": {
    "isbn13": "9791193904671",
    "title": "돈의 방정식 - 돈을 지위와 성공의 기준, 그 이상으로 다루기 위한 21가지 이야기",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "",
        "title": "독자들에게",
        "startPage": 1,
        "endPage": 14,
        "sections": [
          {
            "title": "독자들에게",
            "startPage": 1,
            "endPage": 14
          }
        ]
      },
      {
        "index": 2,
        "label": "",
        "title": "들어가는 말_ 그들의 삶이 단순한 이유는 돈에 지배당하지 않고 돈을 지배하기 때문이다",
        "startPage": 15,
        "endPage": 28,
        "sections": [
          {
            "title": "들어가는 말_ 그들의 삶이 단순한 이유는 돈에 지배당하지 않고 돈을 지배하기 때문이다",
            "startPage": 15,
            "endPage": 28
          }
        ]
      },
      {
        "index": 3,
        "label": "1",
        "title": "‘너와 나’는 다르다",
        "startPage": 29,
        "endPage": 42,
        "sections": [
          {
            "title": "‘너와 나’는 다르다",
            "startPage": 29,
            "endPage": 42
          }
        ]
      },
      {
        "index": 4,
        "label": "2",
        "title": "이력서와 추도사",
        "startPage": 43,
        "endPage": 56,
        "sections": [
          {
            "title": "이력서와 추도사",
            "startPage": 43,
            "endPage": 56
          }
        ]
      },
      {
        "index": 5,
        "label": "3",
        "title": "도파민의 질문 “자, 다음 목표는 뭐지?”",
        "startPage": 57,
        "endPage": 70,
        "sections": [
          {
            "title": "도파민의 질문 “자, 다음 목표는 뭐지?”",
            "startPage": 57,
            "endPage": 70
          }
        ]
      },
      {
        "index": 6,
        "label": "4",
        "title": "당신이 보지 못하는 것",
        "startPage": 71,
        "endPage": 84,
        "sections": [
          {
            "title": "당신이 보지 못하는 것",
            "startPage": 71,
            "endPage": 84
          }
        ]
      },
      {
        "index": 7,
        "label": "5",
        "title": "그는 왜 결승점 앞에서 죽음을 택했을까",
        "startPage": 85,
        "endPage": 98,
        "sections": [
          {
            "title": "그는 왜 결승점 앞에서 죽음을 택했을까",
            "startPage": 85,
            "endPage": 98
          }
        ]
      },
      {
        "index": 8,
        "label": "6",
        "title": "하루에 세 번씩 5성급 호텔 요리를 먹는다면",
        "startPage": 99,
        "endPage": 112,
        "sections": [
          {
            "title": "하루에 세 번씩 5성급 호텔 요리를 먹는다면",
            "startPage": 99,
            "endPage": 112
          }
        ]
      },
      {
        "index": 9,
        "label": "7",
        "title": "3,000억 달러를 남긴 밴더빌트 가문 이야기",
        "startPage": 113,
        "endPage": 126,
        "sections": [
          {
            "title": "3,000억 달러를 남긴 밴더빌트 가문 이야기",
            "startPage": 113,
            "endPage": 126
          }
        ]
      },
      {
        "index": 10,
        "label": "8",
        "title": "쾌적하고 편리한 vs. 남에게 보이기 자랑스러운",
        "startPage": 127,
        "endPage": 140,
        "sections": [
          {
            "title": "쾌적하고 편리한 vs. 남에게 보이기 자랑스러운",
            "startPage": 127,
            "endPage": 140
          }
        ]
      },
      {
        "index": 11,
        "label": "9",
        "title": "오늘을 위할 것인가, 내일을 위할 것인가",
        "startPage": 141,
        "endPage": 154,
        "sections": [
          {
            "title": "오늘을 위할 것인가, 내일을 위할 것인가",
            "startPage": 141,
            "endPage": 154
          }
        ]
      },
      {
        "index": 12,
        "label": "10",
        "title": "시기와 지위의 게임에서 승리하는 유일한 방법",
        "startPage": 155,
        "endPage": 168,
        "sections": [
          {
            "title": "시기와 지위의 게임에서 승리하는 유일한 방법",
            "startPage": 155,
            "endPage": 168
          }
        ]
      },
      {
        "index": 13,
        "label": "11",
        "title": "독립이 없는 부는 또 다른 형태의 빈곤일 뿐이다",
        "startPage": 169,
        "endPage": 182,
        "sections": [
          {
            "title": "독립이 없는 부는 또 다른 형태의 빈곤일 뿐이다",
            "startPage": 169,
            "endPage": 182
          }
        ]
      },
      {
        "index": 14,
        "label": "12",
        "title": "조용한 돈",
        "startPage": 183,
        "endPage": 196,
        "sections": [
          {
            "title": "조용한 돈",
            "startPage": 183,
            "endPage": 196
          }
        ]
      },
      {
        "index": 15,
        "label": "13",
        "title": "부자가 되는 가장 빠른 길",
        "startPage": 197,
        "endPage": 210,
        "sections": [
          {
            "title": "부자가 되는 가장 빠른 길",
            "startPage": 197,
            "endPage": 210
          }
        ]
      },
      {
        "index": 16,
        "label": "14",
        "title": "돈이 당신의 정체성을 결정할 때",
        "startPage": 211,
        "endPage": 224,
        "sections": [
          {
            "title": "돈이 당신의 정체성을 결정할 때",
            "startPage": 211,
            "endPage": 224
          }
        ]
      },
      {
        "index": 17,
        "label": "15",
        "title": "‘그것’을 찾아서",
        "startPage": 225,
        "endPage": 238,
        "sections": [
          {
            "title": "‘그것’을 찾아서",
            "startPage": 225,
            "endPage": 238
          }
        ]
      },
      {
        "index": 18,
        "label": "16",
        "title": "내 아이들에게 보낸 편지",
        "startPage": 239,
        "endPage": 252,
        "sections": [
          {
            "title": "내 아이들에게 보낸 편지",
            "startPage": 239,
            "endPage": 252
          }
        ]
      },
      {
        "index": 19,
        "label": "17",
        "title": "스프레드시트는 감정이 없다",
        "startPage": 253,
        "endPage": 266,
        "sections": [
          {
            "title": "스프레드시트는 감정이 없다",
            "startPage": 253,
            "endPage": 266
          }
        ]
      },
      {
        "index": 20,
        "label": "18",
        "title": "사소한 것에 관하여",
        "startPage": 267,
        "endPage": 280,
        "sections": [
          {
            "title": "사소한 것에 관하여",
            "startPage": 267,
            "endPage": 280
          }
        ]
      },
      {
        "index": 21,
        "label": "19",
        "title": "탐욕과 공포의 수명주기",
        "startPage": 281,
        "endPage": 294,
        "sections": [
          {
            "title": "탐욕과 공포의 수명주기",
            "startPage": 281,
            "endPage": 294
          }
        ]
      },
      {
        "index": 22,
        "label": "20",
        "title": "돈을 쓰면서 불행해지는 19가지 방법",
        "startPage": 295,
        "endPage": 308,
        "sections": [
          {
            "title": "돈을 쓰면서 불행해지는 19가지 방법",
            "startPage": 295,
            "endPage": 308
          }
        ]
      },
      {
        "index": 23,
        "label": "21",
        "title": "돈에 관한 나의 유일한 목표",
        "startPage": 309,
        "endPage": 322,
        "sections": [
          {
            "title": "돈에 관한 나의 유일한 목표",
            "startPage": 309,
            "endPage": 322
          }
        ]
      },
      {
        "index": 24,
        "label": "",
        "title": "감사의 말",
        "startPage": 323,
        "endPage": 336,
        "sections": [
          {
            "title": "감사의 말",
            "startPage": 323,
            "endPage": 336
          }
        ]
      },
      {
        "index": 25,
        "label": "",
        "title": "주",
        "startPage": 337,
        "endPage": 372,
        "sections": [
          {
            "title": "주",
            "startPage": 337,
            "endPage": 372
          }
        ]
      }
    ],
    "costKrw": 0.609945,
    "inputTokens": 2369,
    "outputTokens": 860
  },
  "9791194530015": {
    "isbn13": "9791194530015",
    "title": "서울대 수시 합격 족보 - 서울대 합격자 30인이 직접 만든 100% 실제 합격 생기부 & 면접 전략",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "",
        "title": "001 방향성 없는 생기부를 매력적인 생기부로",
        "startPage": 1,
        "endPage": 22,
        "sections": [
          {
            "title": "방향성 없는 생기부 살려내기",
            "startPage": 1,
            "endPage": 4
          },
          {
            "title": "세특은 무조건 진로와 연결지어야 한다? No!",
            "startPage": 5,
            "endPage": 8
          },
          {
            "title": "자율활동에서 '나'를 드러내기",
            "startPage": 9,
            "endPage": 12
          },
          {
            "title": "자신감이 생기는 3단계 면접 전략",
            "startPage": 13,
            "endPage": 16
          },
          {
            "title": "의과대학 의예과 지역균형전형 면접 복기",
            "startPage": 17,
            "endPage": 22
          }
        ]
      },
      {
        "index": 2,
        "label": "",
        "title": "002 때로는 엉뚱함이 생기부에 도움이 된다",
        "startPage": 23,
        "endPage": 44,
        "sections": [
          {
            "title": "과목의 학습 목표 따라가기",
            "startPage": 23,
            "endPage": 26
          },
          {
            "title": "때로는 엉뚱한 호기심을 보여주기",
            "startPage": 27,
            "endPage": 30
          },
          {
            "title": "나만의 콘셉트를 잡고 끝까지 밀고 나가기",
            "startPage": 31,
            "endPage": 34
          },
          {
            "title": "면접을 준비하는 2가지 방향성",
            "startPage": 35,
            "endPage": 38
          },
          {
            "title": "의과대학 의예과 기회균형전형 면접 복기",
            "startPage": 39,
            "endPage": 44
          }
        ]
      },
      {
        "index": 3,
        "label": "",
        "title": "003 비주요 과목을 나의 강점으로 만든다",
        "startPage": 45,
        "endPage": 66,
        "sections": [
          {
            "title": "비주요 과목에서 나의 강점 만들기",
            "startPage": 45,
            "endPage": 48
          },
          {
            "title": "활동 간의 연계성 만들기",
            "startPage": 49,
            "endPage": 52
          },
          {
            "title": "동아리가 일관적이지 않다면",
            "startPage": 53,
            "endPage": 56
          },
          {
            "title": "MMI, 제시문과 생기부 면접 동시에 준비하기",
            "startPage": 57,
            "endPage": 60
          },
          {
            "title": "치의학과 일반전형 면접 복기",
            "startPage": 61,
            "endPage": 66
          }
        ]
      },
      {
        "index": 4,
        "label": "",
        "title": "004 1, 2, 3학년 각각 다른 생기부 전략이 필요하다",
        "startPage": 67,
        "endPage": 88,
        "sections": [
          {
            "title": "낮은 성적을 보완하기 위한 생기부 작성 방법",
            "startPage": 67,
            "endPage": 70
          },
          {
            "title": "각 과목에 집중하되 독특한 포인트를 담자",
            "startPage": 71,
            "endPage": 74
          },
          {
            "title": "원하던 동아리에 들어가지 못했다면",
            "startPage": 75,
            "endPage": 78
          },
          {
            "title": "서울대, 연세대, 고려대 면접의 차이점",
            "startPage": 79,
            "endPage": 82
          },
          {
            "title": "간호대학 간호학과 일반전형 면접 복기",
            "startPage": 83,
            "endPage": 88
          }
        ]
      },
      {
        "index": 5,
        "label": "",
        "title": "005 5가지 질문으로 생기부를 구체화하다",
        "startPage": 89,
        "endPage": 110,
        "sections": [
          {
            "title": "생기부 구체화를 위한 5가지 질문",
            "startPage": 89,
            "endPage": 91
          },
          {
            "title": "구체화를 통한 특색 있는 세특 작성",
            "startPage": 92,
            "endPage": 94
          },
          {
            "title": "'나'를 보여주는 진로활동 만들기",
            "startPage": 95,
            "endPage": 97
          },
          {
            "title": "일반전형 면접의 출제 유형과 꼬리질문 대처법",
            "startPage": 98,
            "endPage": 100
          },
          {
            "title": "사범대학 교육학과 일반전형 면접 복기",
            "startPage": 101,
            "endPage": 103
          },
          {
            "title": "사범대학 교직 적·인성면접 모의 문항",
            "startPage": 104,
            "endPage": 110
          }
        ]
      },
      {
        "index": 6,
        "label": "",
        "title": "006 나만의 플래너로 서울대 간 비결",
        "startPage": 111,
        "endPage": 132,
        "sections": [
          {
            "title": "서점에서 그 해의 트렌드를 분석하라",
            "startPage": 111,
            "endPage": 114
          },
          {
            "title": "트렌드와 일관성 모두를 잡다",
            "startPage": 115,
            "endPage": 118
          },
          {
            "title": "아쉬웠던 활동을 보완하는 법",
            "startPage": 119,
            "endPage": 122
          },
          {
            "title": "제시문 면접에 올인한 사람의 면접 준비",
            "startPage": 123,
            "endPage": 126
          },
          {
            "title": "사범대학 역사교육과 일반전형 면접 복기",
            "startPage": 127,
            "endPage": 132
          }
        ]
      },
      {
        "index": 7,
        "label": "",
        "title": "007 교과서 속에 생기부의 답이 있다",
        "startPage": 133,
        "endPage": 154,
        "sections": [
          {
            "title": "교과서를 바탕으로 주제를 고르자",
            "startPage": 133,
            "endPage": 136
          },
          {
            "title": "양보다 질, 나만의 질 좋은 세특 만들기",
            "startPage": 137,
            "endPage": 140
          },
          {
            "title": "자신의 역할을 뚜렷이 드러내자",
            "startPage": 141,
            "endPage": 144
          },
          {
            "title": "교직 인적성 & 생기부 면접 완벽 준비하기",
            "startPage": 145,
            "endPage": 148
          },
          {
            "title": "사범대학 수학교육과 지역균형전형 면접 복기",
            "startPage": 149,
            "endPage": 154
          }
        ]
      },
      {
        "index": 8,
        "label": "",
        "title": "008 세특은 나만의 스토리를 보여주는 수단",
        "startPage": 155,
        "endPage": 176,
        "sections": [
          {
            "title": "독서활동을 효과적으로 하는 법",
            "startPage": 155,
            "endPage": 158
          },
          {
            "title": "'스토리'를 드러내기 위한 세특 활동",
            "startPage": 159,
            "endPage": 162
          },
          {
            "title": "연계된 진로활동을 이용한 심화 탐구",
            "startPage": 163,
            "endPage": 166
          },
          {
            "title": "자신만의 루틴을 만들어두자",
            "startPage": 167,
            "endPage": 170
          },
          {
            "title": "인문대학 인문계열광역 지역균형전형 면접 복기",
            "startPage": 171,
            "endPage": 176
          }
        ]
      },
      {
        "index": 9,
        "label": "",
        "title": "009 학기를 5개의 기간으로 나누면 합격의 길이 보인다",
        "startPage": 177,
        "endPage": 198,
        "sections": [
          {
            "title": "좋은 생기부에는 좋은 키워드가 있다",
            "startPage": 177,
            "endPage": 180
          },
          {
            "title": "과목의 본질을 바로 알고 실천하는 '지행병진'",
            "startPage": 181,
            "endPage": 184
          },
          {
            "title": "창체로 연구의 연결과 성과 이뤄내기",
            "startPage": 185,
            "endPage": 188
          },
          {
            "title": "평범한 내신으로 서울대 합격한 면접 준비 노하우",
            "startPage": 189,
            "endPage": 192
          },
          {
            "title": "인문대학 중어중문학과 일반전형 면접 복기",
            "startPage": 193,
            "endPage": 198
          }
        ]
      },
      {
        "index": 10,
        "label": "",
        "title": "010 면접, 가성비 있게 해치우다",
        "startPage": 199,
        "endPage": 220,
        "sections": [
          {
            "title": "특수한 교과목을 생기부에 100% 활용하는 법",
            "startPage": 199,
            "endPage": 203
          },
          {
            "title": "본인만의 서사를 고민하라",
            "startPage": 204,
            "endPage": 208
          },
          {
            "title": "면접은 생각보다 만만하다",
            "startPage": 209,
            "endPage": 213
          },
          {
            "title": "인문대학 서어서문학과 일반전형 면접 복기",
            "startPage": 214,
            "endPage": 220
          }
        ]
      },
      {
        "index": 11,
        "label": "",
        "title": "011 내 생기부의 전문가는 나뿐이다",
        "startPage": 221,
        "endPage": 242,
        "sections": [
          {
            "title": "공부해야 하는데 주제는 어느 세월에 찾지?",
            "startPage": 221,
            "endPage": 224
          },
          {
            "title": "평소에도 전공에 대해 관심을 가져야 하는 이유",
            "startPage": 225,
            "endPage": 228
          },
          {
            "title": "자율활동은 '자율적'으로",
            "startPage": 229,
            "endPage": 232
          },
          {
            "title": "면접을 학원 다니며 준비할 필요가 없는 이유",
            "startPage": 233,
            "endPage": 236
          },
          {
            "title": "사회과학대학 정치외교학부 지역균형전형 면접 복기",
            "startPage": 237,
            "endPage": 242
          }
        ]
      },
      {
        "index": 12,
        "label": "",
        "title": "012 읽는 사람을 감동시키는 생기부 작성 방법",
        "startPage": 243,
        "endPage": 264,
        "sections": [
          {
            "title": "동기-과정-결과의 삼위일체가 생기부의 핵심",
            "startPage": 243,
            "endPage": 246
          },
          {
            "title": "“교과서 위주로 공부했어요”가 주는 의의",
            "startPage": 247,
            "endPage": 250
          },
          {
            "title": "배움을 확장시키는 동아리 토론",
            "startPage": 251,
            "endPage": 254
          },
          {
            "title": "제시문 면접에서 가장 중요한 것은?",
            "startPage": 255,
            "endPage": 258
          },
          {
            "title": "사회과학대학 정치외교학부 일반전형 면접 복기",
            "startPage": 259,
            "endPage": 264
          }
        ]
      },
      {
        "index": 13,
        "label": "",
        "title": "013 관심을 역량으로 키워내는 방법",
        "startPage": 265,
        "endPage": 286,
        "sections": [
          {
            "title": "연계성을 중심으로 생기부의 기승전결 잡는 법",
            "startPage": 265,
            "endPage": 268
          },
          {
            "title": "아이디어는 교과과정, 탐구는 논문을 참고하며",
            "startPage": 269,
            "endPage": 272
          },
          {
            "title": "자율활동으로 '육각형 플레이어' 되기",
            "startPage": 273,
            "endPage": 276
          },
          {
            "title": "모든 것을 준비하되, 차분하게!",
            "startPage": 277,
            "endPage": 280
          },
          {
            "title": "사회과학대학 경제학부 지역균형전형 면접 복기",
            "startPage": 281,
            "endPage": 286
          }
        ]
      },
      {
        "index": 14,
        "label": "",
        "title": "014 문과도 숫자로 말하는 법을 알아야 한다",
        "startPage": 287,
        "endPage": 308,
        "sections": [
          {
            "title": "일반고에서 경쟁력 있는 생기부 만드는 비결 4가지",
            "startPage": 287,
            "endPage": 290
          },
          {
            "title": "모든 과목에서 남들보다 한 발자국 더 나아가기",
            "startPage": 291,
            "endPage": 294
          },
          {
            "title": "문과도 숫자로 말하는 양적 연구 방법 활용하기",
            "startPage": 295,
            "endPage": 298
          },
          {
            "title": "핵심 주제를 관통하는 일관된 논리로 설득하기",
            "startPage": 299,
            "endPage": 302
          },
          {
            "title": "사회과학대학 경제학부 일반전형 면접 복기",
            "startPage": 303,
            "endPage": 308
          }
        ]
      },
      {
        "index": 15,
        "label": "",
        "title": "015 3가지 원칙으로 세특을 설계하다",
        "startPage": 309,
        "endPage": 330,
        "sections": [
          {
            "title": "생기부의 기초, 키워드 설정법",
            "startPage": 309,
            "endPage": 312
          },
          {
            "title": "세특 설계의 기본 원칙 3가지",
            "startPage": 313,
            "endPage": 316
          },
          {
            "title": "생각의 깊이를 드러내는 학년 간의 연속 탐구",
            "startPage": 317,
            "endPage": 320
          },
          {
            "title": "면접 필승법, 끝까지 포기하지 않는 태도",
            "startPage": 321,
            "endPage": 324
          },
          {
            "title": "경영대학 경영학과 지역균형전형 면접 복기",
            "startPage": 325,
            "endPage": 330
          }
        ]
      },
      {
        "index": 16,
        "label": "",
        "title": "016 흔한 주제로 차별화를 만드는 생기부 작성 팁",
        "startPage": 331,
        "endPage": 352,
        "sections": [
          {
            "title": "평범한 소재로 차별화된 생기부 작성하는 법",
            "startPage": 331,
            "endPage": 334
          },
          {
            "title": "전공과 관련된 공동교육과정 수강하기",
            "startPage": 335,
            "endPage": 338
          },
          {
            "title": "가장 많은 내용을 담을 수 있는 진로활동 채우기",
            "startPage": 339,
            "endPage": 342
          },
          {
            "title": "혼자서도 제시문 면접을 준비하는 방법",
            "startPage": 343,
            "endPage": 346
          },
          {
            "title": "경영대학 경영학과 일반전형 면접 복기",
            "startPage": 347,
            "endPage": 352
          }
        ]
      },
      {
        "index": 17,
        "label": "",
        "title": "017 형광펜으로 간단하게 면접 준비하는 법",
        "startPage": 353,
        "endPage": 374,
        "sections": [
          {
            "title": "생기부에 필요한 4가지 능력",
            "startPage": 353,
            "endPage": 356
          },
          {
            "title": "교과목에서 시작하고, 교과목과 연계하라",
            "startPage": 357,
            "endPage": 360
          },
          {
            "title": "진로활동의 돌파구",
            "startPage": 361,
            "endPage": 364
          },
          {
            "title": "형광펜으로 생기부 면접 준비하기",
            "startPage": 365,
            "endPage": 368
          },
          {
            "title": "생활과학대학 소비자아동학부 기회균형전형 면접 복기",
            "startPage": 369,
            "endPage": 374
          }
        ]
      },
      {
        "index": 18,
        "label": "",
        "title": "018 교과과목만으로도 충분하다",
        "startPage": 375,
        "endPage": 396,
        "sections": [
          {
            "title": "능동적 문제해결력을 보여주자",
            "startPage": 375,
            "endPage": 378
          },
          {
            "title": "교과과목만으로도 학문에 대한 관심을 드러낼 수 있다",
            "startPage": 379,
            "endPage": 382
          },
          {
            "title": "동아리활동은 최대한 자세하게 작성하자",
            "startPage": 383,
            "endPage": 386
          },
          {
            "title": "서울대, 카이스트, 포스텍 면접 후기",
            "startPage": 387,
            "endPage": 390
          },
          {
            "title": "자연과학대학 통계학과 일반전형 면접 복기",
            "startPage": 391,
            "endPage": 396
          }
        ]
      },
      {
        "index": 19,
        "label": "",
        "title": "019 생기부 우수사례를 최대한 피해라",
        "startPage": 397,
        "endPage": 418,
        "sections": [
          {
            "title": "우수사례를 멀리하라",
            "startPage": 397,
            "endPage": 400
          },
          {
            "title": "진로에 목맬 필요 없다",
            "startPage": 401,
            "endPage": 404
          },
          {
            "title": "교과 외 활동은 나에 대한 '이미지 메이킹'",
            "startPage": 405,
            "endPage": 408
          },
          {
            "title": "일반전형 2회차 선배가 알려주는 면접 준비",
            "startPage": 409,
            "endPage": 412
          },
          {
            "title": "공과대학 건설환경공학부 일반전형 면접 복기",
            "startPage": 413,
            "endPage": 418
          }
        ]
      },
      {
        "index": 20,
        "label": "",
        "title": "020 교과목과 동아리에 진로를 녹이는 법",
        "startPage": 419,
        "endPage": 440,
        "sections": [
          {
            "title": "관심 분야를 진로로 구체화시키는 방법",
            "startPage": 419,
            "endPage": 422
          },
          {
            "title": "과목별 세특에 진로를 녹이는 방법",
            "startPage": 423,
            "endPage": 426
          },
          {
            "title": "동아리활동을 진로, 교과목과 연결 짓는 법",
            "startPage": 427,
            "endPage": 430
          },
          {
            "title": "생기부 예상 질답은 이렇게 제작하라",
            "startPage": 431,
            "endPage": 434
          },
          {
            "title": "공과대학 건설환경공학부 지역균형전형 면접 복기",
            "startPage": 435,
            "endPage": 440
          }
        ]
      },
      {
        "index": 21,
        "label": "",
        "title": "021 나만의 의미 있는 탐구활동을 만들자",
        "startPage": 441,
        "endPage": 462,
        "sections": [
          {
            "title": "교과 내용을 응용한 의미 있는 탐구활동을 위주로",
            "startPage": 441,
            "endPage": 444
          },
          {
            "title": "교과 내용을 응용한 탐구활동 예시",
            "startPage": 445,
            "endPage": 448
          },
          {
            "title": "개인 세특을 적극적으로 활용하자",
            "startPage": 449,
            "endPage": 452
          },
          {
            "title": "서울대 수학 제시문 면접의 5가지 특징",
            "startPage": 453,
            "endPage": 456
          },
          {
            "title": "공과대학 전기·정보공학부 일반전형 면접 복기",
            "startPage": 457,
            "endPage": 462
          }
        ]
      },
      {
        "index": 22,
        "label": "",
        "title": "022 학년별 가이드라인으로 생기부의 방향을 잡다",
        "startPage": 463,
        "endPage": 484,
        "sections": [
          {
            "title": "생기부의 방향성을 잡아줄 학년별 가이드라인",
            "startPage": 463,
            "endPage": 466
          },
          {
            "title": "세특은 무엇을 했는지 구체적으로 작성하자",
            "startPage": 467,
            "endPage": 470
          },
          {
            "title": "일상 속에서 찾은 교과 외 활동",
            "startPage": 471,
            "endPage": 474
          },
          {
            "title": "내 생기부와 관련 있는 최근 이슈를 파악하자",
            "startPage": 475,
            "endPage": 478
          },
          {
            "title": "공과대학 전기·정보공학부 지역균형전형 면접 복기",
            "startPage": 479,
            "endPage": 484
          }
        ]
      },
      {
        "index": 23,
        "label": "",
        "title": "023 의대와 공대, 모두에 먹히는 생기부 작성법",
        "startPage": 485,
        "endPage": 506,
        "sections": [
          {
            "title": "생기부로 의대와 공대 두 마리 토끼 잡기",
            "startPage": 485,
            "endPage": 488
          },
          {
            "title": "세특은 꼭 관심 분야와 연계할 필요는 없다",
            "startPage": 489,
            "endPage": 492
          },
          {
            "title": "동아리활동을 제 2의 진로활동으로 만들기",
            "startPage": 493,
            "endPage": 496
          },
          {
            "title": "면접을 여는 3가지 열쇠",
            "startPage": 497,
            "endPage": 500
          },
          {
            "title": "공과대학 컴퓨터공학부 일반전형 면접 복기",
            "startPage": 501,
            "endPage": 506
          }
        ]
      },
      {
        "index": 24,
        "label": "",
        "title": "024 진로가 바뀌어도 경쟁력 있는 생기부 만들기",
        "startPage": 507,
        "endPage": 528,
        "sections": [
          {
            "title": "진로 변화에 유연하게 대처하는 생기부 작성 비결",
            "startPage": 507,
            "endPage": 510
          },
          {
            "title": "주제는 교과서에서 찾고, 그 이상을 탐구하라",
            "startPage": 511,
            "endPage": 514
          },
          {
            "title": "자율활동은 생활적 측면을 보여주자",
            "startPage": 515,
            "endPage": 518
          },
          {
            "title": "생기부 예상 질답 제작하는 법",
            "startPage": 519,
            "endPage": 522
          },
          {
            "title": "공과대학 원자핵공학과 기회균형전형 면접 복기",
            "startPage": 523,
            "endPage": 528
          }
        ]
      },
      {
        "index": 25,
        "label": "",
        "title": "025 남들과 다른 나를 드러낸 10분 면접 노하우",
        "startPage": 529,
        "endPage": 550,
        "sections": [
          {
            "title": "부족한 내신을 보완하는 유일한 방법",
            "startPage": 529,
            "endPage": 532
          },
          {
            "title": "과목별 세특에서 나의 강점을 드러내기",
            "startPage": 533,
            "endPage": 536
          },
          {
            "title": "동아리활동 영역은 진로활동 영역의 다른 이름",
            "startPage": 537,
            "endPage": 540
          },
          {
            "title": "면접으로 나를 드러내는 시간, 저스트 텐 미닛",
            "startPage": 541,
            "endPage": 544
          },
          {
            "title": "농업생명과학대학 산림과학부 일반전형 면접 복기",
            "startPage": 545,
            "endPage": 550
          }
        ]
      },
      {
        "index": 26,
        "label": "",
        "title": "026 이과 생기부의 레벨을 높이는 5가지 팁",
        "startPage": 551,
        "endPage": 572,
        "sections": [
          {
            "title": "생기부의 수준을 높이는 5가지 방법",
            "startPage": 551,
            "endPage": 554
          },
          {
            "title": "과목별 세특의 모범답안 분석",
            "startPage": 555,
            "endPage": 558
          },
          {
            "title": "세특에 들어가지 않는 활동은 자율활동에 넣자",
            "startPage": 559,
            "endPage": 562
          },
          {
            "title": "천천히 말하는 연습을 미리 해두자",
            "startPage": 563,
            "endPage": 566
          },
          {
            "title": "농업생명과학대학 식품동물생명공학부 일반전형 면접 복기",
            "startPage": 567,
            "endPage": 572
          }
        ]
      },
      {
        "index": 27,
        "label": "",
        "title": "027 생기부의 꽃, 자율활동으로 승부를 보다",
        "startPage": 573,
        "endPage": 594,
        "sections": [
          {
            "title": "기본은 갖추되, 독특하고 기억에 남는 생기부란",
            "startPage": 573,
            "endPage": 576
          },
          {
            "title": "과목별 세특에서 주의할 점, '뇌절' 하지 말자",
            "startPage": 577,
            "endPage": 580
          },
          {
            "title": "생기부의 꽃은 자율활동",
            "startPage": 581,
            "endPage": 584
          },
          {
            "title": "면접에서 중요한 것은 꺾이지 않는 마음",
            "startPage": 585,
            "endPage": 588
          },
          {
            "title": "농업생명과학대학 조경·지역시스템공학부 일반전형 면접 복기",
            "startPage": 589,
            "endPage": 594
          }
        ]
      },
      {
        "index": 28,
        "label": "",
        "title": "028 성공적인 면접을 위한 3가지 팁",
        "startPage": 595,
        "endPage": 616,
        "sections": [
          {
            "title": "설득력 있는 성장 스토리를 만들어라",
            "startPage": 595,
            "endPage": 598
          },
          {
            "title": "교과 세특은 해당 과목에 충실하자",
            "startPage": 599,
            "endPage": 602
          },
          {
            "title": "동아리활동에는 미처 담지 못했던 내용을 담자",
            "startPage": 603,
            "endPage": 606
          },
          {
            "title": "면접 전에 준비해야 할 3가지",
            "startPage": 607,
            "endPage": 610
          },
          {
            "title": "자유전공학부 일반전형 면접 복기",
            "startPage": 611,
            "endPage": 616
          }
        ]
      },
      {
        "index": 29,
        "label": "",
        "title": "029 감동을 주는 나만의 세특 작성법",
        "startPage": 617,
        "endPage": 638,
        "sections": [
          {
            "title": "생기부를 작성할 때 주의해야 할 위험들",
            "startPage": 617,
            "endPage": 620
          },
          {
            "title": "감동을 주는 세특을 쓰자",
            "startPage": 621,
            "endPage": 624
          },
          {
            "title": "동아리의 정수, 협업 역량 보여주기",
            "startPage": 625,
            "endPage": 628
          },
          {
            "title": "생기부 면접 준비의 5단계",
            "startPage": 629,
            "endPage": 632
          },
          {
            "title": "첨단융합학부 지역균형전형 면접 복기",
            "startPage": 633,
            "endPage": 638
          }
        ]
      },
      {
        "index": 30,
        "label": "",
        "title": "030 맘에 드는 동아리가 없다면 내가 만들면 그만",
        "startPage": 639,
        "endPage": 688,
        "sections": [
          {
            "title": "생기부를 명작으로 만드는 포인트",
            "startPage": 639,
            "endPage": 648
          },
          {
            "title": "세특 방향성을 정할 때 꼭 지켜야 할 2가지",
            "startPage": 649,
            "endPage": 658
          },
          {
            "title": "맘에 드는 동아리가 없다면, 내가 만드는 것도 방법",
            "startPage": 659,
            "endPage": 668
          },
          {
            "title": "면접은 면접자와 면접관이 함께 이끌어가는 것",
            "startPage": 669,
            "endPage": 678
          },
          {
            "title": "첨단융합학부 일반전형 면접 복기",
            "startPage": 679,
            "endPage": 688
          }
        ]
      }
    ],
    "costKrw": 2.7357749999999994,
    "inputTokens": 6083,
    "outputTokens": 4993
  },
  "9791196473570": {
    "isbn13": "9791196473570",
    "title": "청소년을 위한 철학 공부 - 열두 가지 키워드로 펼치는 생각의 가지",
    "source": "gemini-2.5-flash",
    "parts": [
      {
        "index": 1,
        "label": "들어가는 글",
        "title": "들어가는 글",
        "startPage": 1,
        "endPage": 16,
        "sections": [
          {
            "title": "들어가는 글",
            "startPage": 1,
            "endPage": 16
          }
        ]
      },
      {
        "index": 2,
        "label": "1장",
        "title": "거짓말",
        "startPage": 17,
        "endPage": 32,
        "sections": [
          {
            "title": "사람들은 왜 거짓말을 할까?",
            "startPage": 17,
            "endPage": 20,
            "label": "생각의 화두 01"
          },
          {
            "title": "거짓말 같은 사실, 거짓말 같은 진실(과학과 종교)",
            "startPage": 21,
            "endPage": 24,
            "label": "생각의 화두 02"
          },
          {
            "title": "지어낸 이야기를 모두 거짓이라고 할 수 있을까?",
            "startPage": 25,
            "endPage": 28,
            "label": "생각의 화두 03"
          },
          {
            "title": "지도자의 거짓말이 더 위험한 이유는?",
            "startPage": 29,
            "endPage": 32,
            "label": "생각의 화두 04"
          }
        ]
      },
      {
        "index": 3,
        "label": "2장",
        "title": "가족",
        "startPage": 33,
        "endPage": 48,
        "sections": [
          {
            "title": "가족의 구성원으로 사는 것도 피곤한 일?",
            "startPage": 33,
            "endPage": 36,
            "label": "생각의 화두 05"
          },
          {
            "title": "퇴계 이황의 다사다난한 가족 이야기",
            "startPage": 37,
            "endPage": 40,
            "label": "생각의 화두 06"
          },
          {
            "title": "브람스의 또 다른 가족 이야기",
            "startPage": 41,
            "endPage": 44,
            "label": "생각의 화두 07"
          },
          {
            "title": "가족, 지혜로운 인간관계의 시작",
            "startPage": 45,
            "endPage": 48,
            "label": "생각의 화두 08"
          }
        ]
      },
      {
        "index": 4,
        "label": "3장",
        "title": "규칙",
        "startPage": 49,
        "endPage": 64,
        "sections": [
          {
            "title": "규칙이란 무엇일까?",
            "startPage": 49,
            "endPage": 53,
            "label": "생각의 화두 09"
          },
          {
            "title": "안중근을 통해 본 규칙 이야기",
            "startPage": 54,
            "endPage": 58,
            "label": "생각의 화두 10"
          },
          {
            "title": "규칙을 만들 때 중요한 것은?",
            "startPage": 59,
            "endPage": 64,
            "label": "생각의 화두 11"
          }
        ]
      },
      {
        "index": 5,
        "label": "4장",
        "title": "기호와 상징",
        "startPage": 65,
        "endPage": 80,
        "sections": [
          {
            "title": "여자는 외모? 남자는 돈?",
            "startPage": 65,
            "endPage": 69,
            "label": "생각의 화두 12"
          },
          {
            "title": "삶을 축복하고 위로하는 기호와 상징",
            "startPage": 70,
            "endPage": 74,
            "label": "생각의 화두 13"
          },
          {
            "title": "나는 어떤 기호와 상징일까?",
            "startPage": 75,
            "endPage": 80,
            "label": "생각의 화두 14"
          }
        ]
      },
      {
        "index": 6,
        "label": "5장",
        "title": "추리 놀이",
        "startPage": 81,
        "endPage": 96,
        "sections": [
          {
            "title": "착시와 착각, 그리고 마법!",
            "startPage": 81,
            "endPage": 84,
            "label": "생각의 화두 15"
          },
          {
            "title": "셜록 홈스의 추리 비법",
            "startPage": 85,
            "endPage": 88,
            "label": "생각의 화두 16"
          },
          {
            "title": "우리가 흔히 저지르는 세 가지 추리의 오류",
            "startPage": 89,
            "endPage": 92,
            "label": "생각의 화두 17"
          },
          {
            "title": "위험하지만, 아름다운 유비추리",
            "startPage": 93,
            "endPage": 96,
            "label": "생각의 화두 18"
          }
        ]
      },
      {
        "index": 7,
        "label": "6장",
        "title": "소유와 주인의식",
        "startPage": 97,
        "endPage": 112,
        "sections": [
          {
            "title": "주인이 있는 것, 주인이 없는 것, 주인이 있어서는 안 되는 것",
            "startPage": 97,
            "endPage": 100,
            "label": "생각의 화두 19"
          },
          {
            "title": "주인이라는 게 뭘까?",
            "startPage": 101,
            "endPage": 104,
            "label": "생각의 화두 20"
          },
          {
            "title": "공(公), 나의 이익보다 먼저인 것",
            "startPage": 105,
            "endPage": 108,
            "label": "생각의 화두 21"
          },
          {
            "title": "권정생 할아버지의 유언장",
            "startPage": 109,
            "endPage": 112,
            "label": "생각의 화두 22"
          }
        ]
      },
      {
        "index": 8,
        "label": "7장",
        "title": "‘화’나는 마음",
        "startPage": 113,
        "endPage": 128,
        "sections": [
          {
            "title": "우리가 ‘화’나는 이유",
            "startPage": 113,
            "endPage": 116,
            "label": "생각의 화두 23"
          },
          {
            "title": "기분과 감정은 수시로 바뀌는 것?",
            "startPage": 117,
            "endPage": 120,
            "label": "생각의 화두 24"
          },
          {
            "title": "동양철학에서 화를 다스리는 법",
            "startPage": 121,
            "endPage": 124,
            "label": "생각의 화두 25"
          },
          {
            "title": "화를 보듬고 치유해주는 힘의 근원",
            "startPage": 125,
            "endPage": 128,
            "label": "생각의 화두 26"
          }
        ]
      },
      {
        "index": 9,
        "label": "8장",
        "title": "시간과 나",
        "startPage": 129,
        "endPage": 144,
        "sections": [
          {
            "title": "시간을 느껴본 적이 있니?",
            "startPage": 129,
            "endPage": 132,
            "label": "생각의 화두 27"
          },
          {
            "title": "독일 시인 실러가 시간에 대해 한 말",
            "startPage": 133,
            "endPage": 136,
            "label": "생각의 화두 28"
          },
          {
            "title": "시간을 이야기하는 예술작품",
            "startPage": 137,
            "endPage": 140,
            "label": "생각의 화두 29"
          },
          {
            "title": "시간과 마음의 관계",
            "startPage": 141,
            "endPage": 144,
            "label": "생각의 화두 30"
          }
        ]
      },
      {
        "index": 10,
        "label": "9장",
        "title": "스콜레, 학교 이야기",
        "startPage": 145,
        "endPage": 160,
        "sections": [
          {
            "title": "이미륵의 두 학교 이야기",
            "startPage": 145,
            "endPage": 148,
            "label": "생각의 화두 31"
          },
          {
            "title": "지금은 너무 낯선 글자, 한문",
            "startPage": 149,
            "endPage": 152,
            "label": "생각의 화두 32"
          },
          {
            "title": "토토가 경험한 새로운 학교",
            "startPage": 153,
            "endPage": 156,
            "label": "생각의 화두 33"
          },
          {
            "title": "학교는 스콜레를 누리는 곳",
            "startPage": 157,
            "endPage": 160,
            "label": "생각의 화두 34"
          }
        ]
      },
      {
        "index": 11,
        "label": "10장",
        "title": "원더랜드",
        "startPage": 161,
        "endPage": 176,
        "sections": [
          {
            "title": "내게 환상의 나라를 보여줘",
            "startPage": 161,
            "endPage": 165,
            "label": "생각의 화두 35"
          },
          {
            "title": "불가사의하고 신비로운 것, 원더랜드는 바로 여기에",
            "startPage": 166,
            "endPage": 170,
            "label": "생각의 화두 36"
          },
          {
            "title": "새로운 세계와 익숙한 세계",
            "startPage": 171,
            "endPage": 176,
            "label": "생각의 화두 37"
          }
        ]
      },
      {
        "index": 12,
        "label": "11장",
        "title": "성격",
        "startPage": 177,
        "endPage": 192,
        "sections": [
          {
            "title": "성격에 관한 명언들",
            "startPage": 177,
            "endPage": 181,
            "label": "생각의 화두 38"
          },
          {
            "title": "나의 성격 마주보기",
            "startPage": 182,
            "endPage": 186,
            "label": "생각의 화두 39"
          },
          {
            "title": "개인의 성격, 공동체의 성격",
            "startPage": 187,
            "endPage": 192,
            "label": "생각의 화두 40"
          }
        ]
      },
      {
        "index": 13,
        "label": "12장",
        "title": "기억과 망각",
        "startPage": 193,
        "endPage": 208,
        "sections": [
          {
            "title": "어렸을 때의 기억과 트라우마",
            "startPage": 193,
            "endPage": 196,
            "label": "생각의 화두 41"
          },
          {
            "title": "안톤 슈낙과 윤동주가 기억하는 것들",
            "startPage": 197,
            "endPage": 200,
            "label": "생각의 화두 42"
          },
          {
            "title": "기억을 글로 써보는 연습",
            "startPage": 201,
            "endPage": 204,
            "label": "생각의 화두 43"
          },
          {
            "title": "잊어버리는 것도 중요하다",
            "startPage": 205,
            "endPage": 208,
            "label": "생각의 화두 44"
          }
        ]
      },
      {
        "index": 14,
        "label": "",
        "title": "나가는 글",
        "startPage": 209,
        "endPage": 224,
        "sections": [
          {
            "title": "나가는 글",
            "startPage": 209,
            "endPage": 224
          }
        ]
      },
      {
        "index": 15,
        "label": "",
        "title": "참고문헌",
        "startPage": 225,
        "endPage": 252,
        "sections": [
          {
            "title": "참고문헌",
            "startPage": 225,
            "endPage": 252
          }
        ]
      }
    ],
    "costKrw": 0.7468649999999999,
    "inputTokens": 2561,
    "outputTokens": 1138
  }
};
