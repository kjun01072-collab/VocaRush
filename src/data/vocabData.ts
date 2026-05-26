import {
  AcademyClass,
  DifficultyLabel,
  Occurrence,
  StudentProfile,
  StudySet,
  StudyStyle,
  VocabDifficulty,
  VocabItem,
  VocabLevel,
  VocabSubject,
  VocabularyAssignment,
} from "../types";
import { MASTER_VOCAB_SEEDS } from "./masterVocabSeeds";
import { SCIENCE_MATH_VOCAB_SEEDS } from "./scienceMathVocabSeeds";
import { TOEIC_5_BOOK_VOCAB_SEEDS } from "./toeicBookVocabSeeds";
import { TOEIC_BUSINESS_VOCAB_SEEDS } from "./toeicBusinessVocabSeeds";
import { createPreClassTestAvailability } from "../utils/assignmentAvailability";

export const DIFFICULTY_LABELS: Record<VocabDifficulty, DifficultyLabel> = {
  1: {
    label: "필수 기초",
    shortBadge: "필수",
    description:
      "쉽고 자주 쓰이는 기본어입니다. 자주 나온다고 해서 자동으로 고난도에 올리지 않습니다.",
  },
  2: {
    label: "빈출 핵심",
    shortBadge: "핵심",
    description: "기출·실전에서 자주 확인되는 핵심어입니다. 우선 암기용이지만 난이도는 중하로 봅니다.",
  },
  3: {
    label: "점수 상승",
    shortBadge: "300점",
    description:
      "문맥에서 헷갈리기 쉬운 단어입니다. 기본 단어를 넘어서 점수 차이를 만드는 구간입니다.",
  },
  4: {
    label: "고득점 어휘",
    shortBadge: "고득점",
    description:
      "뜻이 추상적이거나 문제 안에서 응용되는 단어입니다. 고득점 목표 학습에 우선 배치됩니다.",
  },
  5: {
    label: "최상위 표현",
    shortBadge: "최상위",
    description:
      "기술문·학술문·전문 분야에서 쓰이는 심화 표현입니다. 출현 빈도보다 난이도와 응용도를 더 봅니다.",
  },
};

export function difficultyLabel(d: VocabDifficulty) {
  return DIFFICULTY_LABELS[d];
}

const QUESTION_TYPES = [
  "어휘 추론",
  "주장 파악",
  "근거 찾기",
  "문맥 이해",
  "자료형",
  "정보 선택",
  "요지 파악",
  "관점 비교",
  "사회 문제",
  "경제",
  "경제 정책",
  "정치 제도",
  "국제사회",
  "지리",
  "세계사",
  "환경",
  "기술문 표현",
  "반론 표현",
  "비교·대조",
  "원인·결과",
  "그래프 해석",
] as const;

const SUBJECTS: VocabSubject[] = [
  "일본어",
  "영어",
  "실용일본어",
  "종합과목",
  "EJU 이과",
  "기술문",
  "청독해",
  "한자",
  "문법",
];

const LEVELS: VocabLevel[] = [
  "필수 기초",
  "200점 목표",
  "300점 목표",
  "350+ 목표",
  "기술문 표현",
  "종합과목 연결",
  "청독해·자료형",
];

function seeded01(seed: number) {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function pick<T>(arr: readonly T[], seed: number) {
  return arr[Math.floor(seeded01(seed) * arr.length)];
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

const CURATED_SYNONYMS: Record<string, string[]> = {
  格差: ["不平等", "差", "隔たり"],
  教育格差: ["教育の不平等"],
  貧困: ["困窮"],
};

function withCuratedSynonyms(items: VocabItem[]) {
  return items.map((item) => {
    const curated = CURATED_SYNONYMS[item.word];
    if (!curated?.length) return item;
    return {
      ...item,
      synonyms: uniq(curated.concat(item.synonyms || []).filter((word) => word && word !== item.word)).slice(0, 6),
    };
  });
}

function shuffle<T>(arr: T[], seed: number) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded01(seed + i * 97) * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function makeOccurrences(
  seed: number,
  subject: Occurrence["subject"],
  part: string,
  questionTypes: string[],
  count: number
): Occurrence[] {
  const years = Array.from({ length: 14 }).map((_, i) => 2002 + i);
  const out: Occurrence[] = [];
  for (let i = 0; i < count; i++) {
    const year = years[Math.floor(seeded01(seed + i * 31) * years.length)];
    const session: Occurrence["session"] =
      seeded01(seed + i * 79) > 0.5 ? "제1회" : "제2회";
    const questionType = questionTypes.length
      ? questionTypes[Math.floor(seeded01(seed + i * 17) * questionTypes.length)]
      : pick(QUESTION_TYPES, seed + i * 17);
    const questionNumber =
      seeded01(seed + i * 19) > 0.35
        ? Math.floor(seeded01(seed + i * 53) * 39) + 1
        : undefined;
    out.push({ year, session, subject, part, questionType, questionNumber });
  }
  out.sort(
    (a, b) =>
      b.year - a.year ||
      (a.session === b.session ? 0 : a.session === "제2회" ? 1 : -1)
  );
  return out;
}

type TaxonomyRule = {
  keywords: string[];
  questionTypes: string[];
  relatedWords?: string[];
};

const RESEARCHED_TAXONOMY_RULES: TaxonomyRule[] = [
  {
    keywords: ["主張", "意見", "結論", "要約", "筆者", "述べる", "立場", "論点"],
    questionTypes: ["주장 파악", "요지 파악", "기술문 표현"],
    relatedWords: ["根拠", "具体例", "理由", "結論"],
  },
  {
    keywords: ["根拠", "理由", "具体例", "証拠", "基づく", "原因", "背景"],
    questionTypes: ["근거 찾기", "원인·결과"],
    relatedWords: ["主張", "結論", "影響", "結果"],
  },
  {
    keywords: ["一方", "反面", "比較", "相違", "共通", "賛成", "反対", "反論"],
    questionTypes: ["비교·대조", "관점 비교", "반론 표현"],
    relatedWords: ["立場", "主張", "結論"],
  },
  {
    keywords: ["資料", "表", "グラフ", "統計", "割合", "比率", "平均", "増加", "減少", "推移", "傾向"],
    questionTypes: ["자료형", "그래프 해석", "정보 선택"],
    relatedWords: ["資料", "表", "グラフ", "割合", "平均"],
  },
  {
    keywords: ["案内", "募集", "申込", "締切", "参加", "会場", "時間", "予定", "変更", "条件"],
    questionTypes: ["정보 선택", "자료형"],
    relatedWords: ["資料", "条件", "時間", "予定"],
  },
  {
    keywords: ["需要", "供給", "価格", "市場", "競争", "独占", "寡占", "景気", "国民所得", "企業", "消費", "生産"],
    questionTypes: ["경제", "그래프 해석"],
    relatedWords: ["需要", "供給", "価格", "市場", "景気"],
  },
  {
    keywords: ["金融", "金利", "銀行", "中央銀行", "貨幣", "通貨", "物価", "インフレ", "デフレ"],
    questionTypes: ["경제", "경제 정책"],
    relatedWords: ["金融政策", "金利", "物価", "中央銀行"],
  },
  {
    keywords: ["財政", "税", "予算", "公共", "社会保障", "年金", "福祉", "医療"],
    questionTypes: ["경제 정책", "사회 문제"],
    relatedWords: ["財政", "社会保障", "福祉", "年金"],
  },
  {
    keywords: ["貿易", "輸入", "輸出", "為替", "円高", "円安", "国際経済", "国際収支", "経済統合"],
    questionTypes: ["경제", "국제사회"],
    relatedWords: ["貿易", "為替", "輸入", "輸出"],
  },
  {
    keywords: ["少子化", "高齢化", "人口", "出生率", "労働力", "格差", "貧困", "雇用", "情報社会", "教育"],
    questionTypes: ["사회 문제", "원인·결과"],
    relatedWords: ["少子化", "高齢化", "社会保障", "労働力"],
  },
  {
    keywords: ["憲法", "国会", "内閣", "裁判所", "行政", "立法", "司法", "選挙", "政党", "民主主義", "地方自治"],
    questionTypes: ["정치 제도"],
    relatedWords: ["国会", "内閣", "憲法", "選挙"],
  },
  {
    keywords: ["国際社会", "国連", "国際機関", "紛争", "平和", "難民", "領土", "外交", "安全保障", "条約"],
    questionTypes: ["국제사회", "사회 문제"],
    relatedWords: ["国際社会", "国連", "外交", "条約"],
  },
  {
    keywords: ["地理", "地形", "気候", "資源", "産業", "都市", "地域", "地図", "時差", "人口密度"],
    questionTypes: ["지리", "자료형"],
    relatedWords: ["地形", "気候", "資源", "都市"],
  },
  {
    keywords: ["革命", "産業革命", "フランス革命", "ナポレオン", "ウィーン", "帝国主義", "植民地", "戦争", "冷戦", "独立"],
    questionTypes: ["세계사", "원인·결과"],
    relatedWords: ["産業革命", "帝国主義", "民主主義", "植民地"],
  },
  {
    keywords: ["環境", "温暖化", "公害", "水質汚染", "排出", "資源", "再利用", "持続可能", "気候変動"],
    questionTypes: ["환경", "사회 문제"],
    relatedWords: ["温暖化", "資源", "持続可能", "公害"],
  },
];

function taxonomyHaystack(seed: {
  word: string;
  reading: string;
  meaningKo: string;
  part: string;
  questionTypes: string[];
  synonyms: string[];
  relatedWords: string[];
  exampleJa: string;
  exampleKo: string;
  explanationKo: string;
}) {
  return [
    seed.word,
    seed.reading,
    seed.meaningKo,
    seed.part,
    ...seed.questionTypes,
    ...seed.synonyms,
    ...seed.relatedWords,
    seed.exampleJa,
    seed.exampleKo,
    seed.explanationKo,
  ].join(" ");
}

function researchQuestionTypes(seed: {
  word: string;
  reading: string;
  meaningKo: string;
  part: string;
  questionTypes: string[];
  synonyms: string[];
  relatedWords: string[];
  exampleJa: string;
  exampleKo: string;
  explanationKo: string;
}) {
  const haystack = taxonomyHaystack(seed);
  const additions = RESEARCHED_TAXONOMY_RULES.flatMap((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword)) ? rule.questionTypes : []
  );
  return uniq(seed.questionTypes.concat(additions.length ? additions : ["문맥 이해"])).slice(0, 6);
}

function researchRelatedWords(seed: {
  word: string;
  reading: string;
  meaningKo: string;
  part: string;
  questionTypes: string[];
  synonyms: string[];
  relatedWords: string[];
  exampleJa: string;
  exampleKo: string;
  explanationKo: string;
}) {
  const haystack = taxonomyHaystack(seed);
  const additions = RESEARCHED_TAXONOMY_RULES.flatMap((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword)) ? rule.relatedWords || [] : []
  );
  return uniq(seed.relatedWords.concat(additions).filter((word) => word !== seed.word)).slice(0, 10);
}

function targetScoreFromDifficulty(difficulty: VocabDifficulty, frequencyScore: number): VocabItem["targetScore"] {
  if (difficulty <= 2) return "200점";
  if (difficulty === 3 || frequencyScore >= 82) return "300점";
  return "350+";
}

function levelFromMaster(seed: { level: VocabLevel; subject: VocabSubject; difficulty: VocabDifficulty }): VocabLevel {
  if (seed.subject === "청독해") return "청독해·자료형";
  if (seed.subject === "기술문") return "기술문 표현";
  if (seed.subject === "종합과목") return "종합과목 연결";
  if (seed.level === "필수 기초" || seed.level === "200점 목표" || seed.level === "300점 목표" || seed.level === "350+ 목표") {
    return seed.level;
  }
  if (seed.difficulty <= 1) return "필수 기초";
  if (seed.difficulty === 2) return "200점 목표";
  if (seed.difficulty === 3) return "300점 목표";
  return "350+ 목표";
}

function importanceFromFrequency(frequencyScore: number): VocabItem["importance"] {
  if (frequencyScore >= 90) return "최우선";
  if (frequencyScore >= 75) return "매우 중요";
  if (frequencyScore >= 60) return "중요";
  return "기초";
}

function targetScoreFromLevel(level: VocabItem["level"]): VocabItem["targetScore"] {
  if (level === "필수 기초" || level === "200점 목표") return "200점";
  if (level === "300점 목표") return "300점";
  return "350+";
}

function difficultyFromLevel(level: VocabItem["level"], seed: number): VocabDifficulty {
  // Tie difficulty to level but keep some variety.
  const r = seeded01(seed);
  if (level === "필수 기초") return 1;
  if (level === "200점 목표") return r > 0.85 ? 3 : 2;
  if (level === "300점 목표") return r > 0.85 ? 4 : 3;
  if (level === "350+ 목표") return r > 0.75 ? 5 : 4;
  if (level === "기술문 표현") return r > 0.7 ? 5 : 4;
  if (level === "종합과목 연결") return r > 0.8 ? 4 : 3;
  return r > 0.85 ? 4 : 3; // 청독해·자료형
}

const EASY_HIGH_FREQUENCY_WORDS = new Map<string, VocabDifficulty>([
  ["理由", 1],
  ["必要", 1],
  ["目的", 1],
  ["原因", 2],
  ["結果", 2],
  ["資料", 2],
  ["表", 1],
  ["グラフ", 1],
  ["割合", 2],
  ["比率", 2],
  ["平均", 2],
  ["増加", 2],
  ["減少", 2],
  ["変化", 2],
  ["具体例", 2],
  ["結論", 2],
  ["賛成", 2],
  ["反対", 2],
  ["比較", 2],
  ["述べる", 2],
  ["根拠", 3],
  ["主張", 3],
  ["反論", 3],
  ["立場", 3],
]);

function calibratedDifficultyFromSeed(seed: WordSeed, seedNum: number): VocabDifficulty {
  if (seed.difficulty) return seed.difficulty;
  const easyOverride = EASY_HIGH_FREQUENCY_WORDS.get(seed.word);
  if (easyOverride) return easyOverride;
  if (seed.part === "기초") return 2;
  return difficultyFromLevel(seed.level, seedNum);
}

function hasFinalConsonant(text: string) {
  const chars = text.match(/[가-힣]/g);
  if (!chars?.length) return false;
  const code = chars[chars.length - 1].charCodeAt(0) - 0xac00;
  return code >= 0 && code % 28 !== 0;
}

function objectParticle(text: string) {
  return hasFinalConsonant(text) ? "을" : "를";
}

function makeExampleJa(seed: WordSeed) {
  if (seed.subject === "청독해" || seed.questionTypes.includes("자료형") || seed.questionTypes.includes("그래프 해석")) {
    return `この資料では、${seed.word}の変化がはっきり示されている。`;
  }
  if (seed.part === "경제" || seed.questionTypes.includes("경제")) {
    return `${seed.word}の動きは、社会や市場の変化と深く関係している。`;
  }
  if (seed.part === "사회" || seed.questionTypes.includes("사회 문제")) {
    return `${seed.word}について、背景と影響を整理して考える。`;
  }
  if (seed.part === "정치" || seed.questionTypes.includes("정치 제도")) {
    return `${seed.word}の役割を他の制度と比較して理解する。`;
  }
  if (seed.part === "세계사" || seed.questionTypes.includes("세계사")) {
    return `${seed.word}が時代の変化に与えた影響を確認する。`;
  }
  if (seed.part === "환경" || seed.questionTypes.includes("환경")) {
    return `${seed.word}の原因と影響を、環境問題と結びつけて考える。`;
  }
  if (seed.subject === "기술문") {
    return `筆者は${seed.word}を使って、考えの流れを明確にしている。`;
  }
  return `文脈の中で${seed.word}の意味と役割を確認する。`;
}

function makeExampleKo(seed: WordSeed) {
  const meaning = seed.meaningKo;
  if (seed.subject === "청독해" || seed.questionTypes.includes("자료형") || seed.questionTypes.includes("그래프 해석")) {
    return `자료에서 ${meaning}의 변화를 확인한다.`;
  }
  if (seed.part === "경제" || seed.questionTypes.includes("경제")) {
    return `${meaning}의 움직임을 사회나 시장 변화와 연결해 이해한다.`;
  }
  if (seed.part === "사회" || seed.questionTypes.includes("사회 문제")) {
    return `${meaning}의 배경과 영향을 함께 정리한다.`;
  }
  if (seed.part === "정치" || seed.questionTypes.includes("정치 제도")) {
    return `${meaning}의 역할을 다른 제도와 비교해 이해한다.`;
  }
  if (seed.part === "세계사" || seed.questionTypes.includes("세계사")) {
    return `${meaning}가 시대 변화에 준 영향을 확인한다.`;
  }
  if (seed.part === "환경" || seed.questionTypes.includes("환경")) {
    return `${meaning}의 원인과 영향을 환경 문제와 연결해 본다.`;
  }
  if (seed.subject === "기술문") {
    return `글쓴이는 ${meaning}${objectParticle(meaning)} 사용해 생각의 흐름을 분명히 한다.`;
  }
  return `문맥 속에서 ${meaning}의 의미와 역할을 확인한다.`;
}

type WordSeed = {
  word: string;
  reading: string;
  meaningKo: string;
  level: VocabLevel;
  subject: VocabSubject;
  part: string;
  questionTypes: string[];
  difficulty?: VocabDifficulty;
  synonyms?: string[];
  antonyms?: string[];
  relatedWords?: string[];
  commonMistake?: string;
};

// Must-include words (from the spec)
const MUST_WORDS: WordSeed[] = [
  { word: "少子化", reading: "しょうしか", meaningKo: "저출산", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제", "원인·결과"], relatedWords: ["高齢化", "社会保障", "人口減少"] },
  { word: "高齢化", reading: "こうれいか", meaningKo: "고령화", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["少子化", "年金", "医療"] },
  { word: "社会保障", reading: "しゃかいほしょう", meaningKo: "사회보장", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["年金", "医療", "福祉"] },
  { word: "労働力", reading: "ろうどうりょく", meaningKo: "노동력", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["人口減少", "生産", "需要"] },
  { word: "人口減少", reading: "じんこうげんしょう", meaningKo: "인구 감소", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제", "원인·결과"], relatedWords: ["少子化", "出生率", "労働力"] },
  { word: "出生率", reading: "しゅっしょうりつ", meaningKo: "출생률", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["少子化", "人口減少"] },
  { word: "財政", reading: "ざいせい", meaningKo: "재정", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["年金", "社会保障"] },
  { word: "年金", reading: "ねんきん", meaningKo: "연금", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제", "경제"], relatedWords: ["社会保障", "財政"] },
  { word: "医療", reading: "いりょう", meaningKo: "의료", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["福祉", "社会保障"] },
  { word: "福祉", reading: "ふくし", meaningKo: "복지", level: "종합과목 연결", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["社会保障", "医療"] },
  { word: "根拠", reading: "こんきょ", meaningKo: "근거", level: "기술문 표현", subject: "기술문", part: "논리", questionTypes: ["근거 찾기"], synonyms: ["理由"], relatedWords: ["具体例", "結論"] },
  { word: "主張", reading: "しゅちょう", meaningKo: "주장", level: "기술문 표현", subject: "기술문", part: "논리", questionTypes: ["주장 파악"], relatedWords: ["立場", "結論"] },
  { word: "具体例", reading: "ぐたいれい", meaningKo: "구체적인 예", level: "기술문 표현", subject: "기술문", part: "표현", questionTypes: ["근거 찾기"], relatedWords: ["根拠", "理由"] },
  { word: "結論", reading: "けつろん", meaningKo: "결론", level: "기술문 표현", subject: "기술문", part: "표현", questionTypes: ["주장 파악"], relatedWords: ["主張", "反論"] },
  { word: "反論", reading: "はんろん", meaningKo: "반론", level: "기술문 표현", subject: "기술문", part: "표현", questionTypes: ["반론 표현"], relatedWords: ["賛成", "反対"] },
  { word: "理由", reading: "りゆう", meaningKo: "이유", level: "기술문 표현", subject: "기술문", part: "기초", questionTypes: ["근거 찾기"], synonyms: ["根拠"], relatedWords: ["具体例"] },
  { word: "立場", reading: "たちば", meaningKo: "입장", level: "기술문 표현", subject: "기술문", part: "표현", questionTypes: ["주장 파악"], relatedWords: ["主張", "賛成", "反対"] },
  { word: "賛成", reading: "さんせい", meaningKo: "찬성", level: "기술문 표현", subject: "기술문", part: "기초", questionTypes: ["비교·대조"], antonyms: ["反対"], relatedWords: ["立場"] },
  { word: "反対", reading: "はんたい", meaningKo: "반대", level: "기술문 표현", subject: "기술문", part: "기초", questionTypes: ["비교·대조"], antonyms: ["賛成"], relatedWords: ["立場"] },
  { word: "比較", reading: "ひかく", meaningKo: "비교", level: "기술문 표현", subject: "기술문", part: "표현", questionTypes: ["비교·대조"], relatedWords: ["賛成", "反対"] },
  { word: "需要", reading: "じゅよう", meaningKo: "수요", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제", "그래프 해석"], relatedWords: ["供給", "価格"] },
  { word: "供給", reading: "きょうきゅう", meaningKo: "공급", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제", "그래프 해석"], relatedWords: ["需要", "価格"] },
  { word: "価格", reading: "かかく", meaningKo: "가격", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제", "그래프 해석"], relatedWords: ["市場", "均衡価格"] },
  { word: "市場", reading: "しじょう", meaningKo: "시장", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["需要", "供給"] },
  { word: "均衡価格", reading: "きんこうかかく", meaningKo: "균형가격", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["그래프 해석"], relatedWords: ["需要", "供給", "価格"] },
  { word: "消費", reading: "しょうひ", meaningKo: "소비", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["生産", "需要"] },
  { word: "生産", reading: "せいさん", meaningKo: "생산", level: "종합과목 연결", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["消費", "供給"] },
  { word: "輸入", reading: "ゆにゅう", meaningKo: "수입", level: "종합과목 연결", subject: "종합과목", part: "무역", questionTypes: ["경제"], relatedWords: ["輸出", "貿易"] },
  { word: "輸出", reading: "ゆしゅつ", meaningKo: "수출", level: "종합과목 연결", subject: "종합과목", part: "무역", questionTypes: ["경제"], relatedWords: ["輸入", "貿易"] },
  { word: "貿易", reading: "ぼうえき", meaningKo: "무역", level: "종합과목 연결", subject: "종합과목", part: "무역", questionTypes: ["경제"], relatedWords: ["輸入", "輸出"] },
  { word: "環境保護", reading: "かんきょうほご", meaningKo: "환경보호", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["持続可能", "資源"] },
  { word: "水質汚染", reading: "すいしつおせん", meaningKo: "수질오염", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["公害"] },
  { word: "温暖化", reading: "おんだんか", meaningKo: "온난화", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["排出", "持続可能"] },
  { word: "資源", reading: "しげん", meaningKo: "자원", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["再利用", "持続可能"] },
  { word: "再利用", reading: "さいりよう", meaningKo: "재이용", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["資源"] },
  { word: "排出", reading: "はいしゅつ", meaningKo: "배출", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["温暖化"] },
  { word: "公害", reading: "こうがい", meaningKo: "공해", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["水質汚染"] },
  { word: "持続可能", reading: "じぞくかのう", meaningKo: "지속가능", level: "종합과목 연결", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["環境保護", "資源"] },
  { word: "議院内閣制", reading: "ぎいんないかくせい", meaningKo: "의원내각제", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["国会", "内閣"] },
  { word: "国会", reading: "こっかい", meaningKo: "국회", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["立法"] },
  { word: "内閣", reading: "ないかく", meaningKo: "내각", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["行政", "国会"] },
  { word: "選挙", reading: "せんきょ", meaningKo: "선거", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["民主主義"] },
  { word: "憲法", reading: "けんぽう", meaningKo: "헌법", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["司法", "裁判所"] },
  { word: "裁判所", reading: "さいばんしょ", meaningKo: "재판소", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["司法"] },
  { word: "行政", reading: "ぎょうせい", meaningKo: "행정", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["内閣"] },
  { word: "立法", reading: "りっぽう", meaningKo: "입법", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["国会"] },
  { word: "司法", reading: "しほう", meaningKo: "사법", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["裁判所"] },
  { word: "ナポレオン", reading: "なぽれおん", meaningKo: "나폴레옹", level: "종합과목 연결", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["ウィーン会議"] },
  { word: "ウィーン会議", reading: "うぃーんかいぎ", meaningKo: "빈 회의", level: "종합과목 연결", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["帝国主義"] },
  { word: "産業革命", reading: "さんぎょうかくめい", meaningKo: "산업혁명", level: "종합과목 연결", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["帝国主義"] },
  { word: "フランス革命", reading: "ふらんすかくめい", meaningKo: "프랑스혁명", level: "종합과목 연결", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["ナポレオン"] },
  { word: "民主主義", reading: "みんしゅしゅぎ", meaningKo: "민주주의", level: "종합과목 연결", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["選挙"] },
  { word: "帝国主義", reading: "ていこくしゅぎ", meaningKo: "제국주의", level: "종합과목 연결", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["ウィーン会議", "産業革命"] },
  { word: "評価", reading: "ひょうか", meaningKo: "평가", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["改善", "影響"] },
  { word: "改善", reading: "かいぜん", meaningKo: "개선", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["評価"] },
  { word: "影響", reading: "えいきょう", meaningKo: "영향", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해", "원인·결과"], relatedWords: ["作用"] },
  { word: "促進", reading: "そくしん", meaningKo: "촉진", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["変化"] },
  { word: "作用", reading: "さよう", meaningKo: "작용", level: "350+ 목표", subject: "일본어", part: "학술어", questionTypes: ["문맥 이해"], relatedWords: ["影響", "変化"] },
  { word: "変化", reading: "へんか", meaningKo: "변화", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["傾向"] },
  { word: "傾向", reading: "けいこう", meaningKo: "경향", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["変化"] },
  { word: "目的", reading: "もくてき", meaningKo: "목적", level: "200점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["手段"] },
  { word: "手段", reading: "しゅだん", meaningKo: "수단", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["目的"] },
  { word: "課題", reading: "かだい", meaningKo: "과제", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["目的"] },
  { word: "資料", reading: "しりょう", meaningKo: "자료", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형"], relatedWords: ["表", "グラフ"] },
  { word: "表", reading: "ひょう", meaningKo: "표", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형"], relatedWords: ["資料"] },
  { word: "グラフ", reading: "ぐらふ", meaningKo: "그래프", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형", "그래프 해석"], relatedWords: ["割合", "平均"] },
  { word: "割合", reading: "わりあい", meaningKo: "비율", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형"], relatedWords: ["比率"] },
  { word: "増加", reading: "ぞうか", meaningKo: "증가", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형", "원인·결과"], relatedWords: ["減少"] },
  { word: "減少", reading: "げんしょう", meaningKo: "감소", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형", "원인·결과"], relatedWords: ["増加"] },
  { word: "平均", reading: "へいきん", meaningKo: "평균", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형"], relatedWords: ["比率"] },
  { word: "比率", reading: "ひりつ", meaningKo: "비율", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형"], relatedWords: ["割合"] },
  { word: "原因", reading: "げんいん", meaningKo: "원인", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["원인·결과"], relatedWords: ["結果"] },
  { word: "結果", reading: "けっか", meaningKo: "결과", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["원인·결과"], relatedWords: ["原因"] },
  { word: "あいさつ", reading: "あいさつ", meaningKo: "인사", level: "필수 기초", subject: "일본어", part: "생활어", questionTypes: ["어휘 추론"], relatedWords: ["会話"] },
  { word: "間", reading: "あいだ", meaningKo: "사이, 동안", level: "필수 기초", subject: "문법", part: "기초", questionTypes: ["문맥 이해"], relatedWords: ["間に"] },
  { word: "赤ちゃん", reading: "あかちゃん", meaningKo: "아기", level: "필수 기초", subject: "일본어", part: "생활어", questionTypes: ["어휘 추론"], relatedWords: ["子ども"] },
  { word: "あご", reading: "あご", meaningKo: "턱", level: "필수 기초", subject: "일본어", part: "신체", questionTypes: ["어휘 추론"], relatedWords: ["顔"] },
  { word: "会話", reading: "かいわ", meaningKo: "회화", level: "필수 기초", subject: "일본어", part: "생활어", questionTypes: ["어휘 추론"], relatedWords: ["あいさつ"] },
  { word: "罪", reading: "つみ", meaningKo: "죄", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["罰"] },
  { word: "罰", reading: "ばつ", meaningKo: "벌", level: "300점 목표", subject: "일본어", part: "독해", questionTypes: ["문맥 이해"], relatedWords: ["罪"] },
  { word: "認める", reading: "みとめる", meaningKo: "인정하다", level: "200점 목표", subject: "일본어", part: "동사", questionTypes: ["문맥 이해"], relatedWords: ["評価"] },
  { word: "支える", reading: "ささえる", meaningKo: "지탱하다", level: "300점 목표", subject: "일본어", part: "동사", questionTypes: ["문맥 이해"], relatedWords: ["維持する"] },
  { word: "述べる", reading: "のべる", meaningKo: "말하다, 서술하다", level: "기술문 표현", subject: "기술문", part: "표현", questionTypes: ["주장 파악"], relatedWords: ["主張"] },
];

const EXTRA_SEEDS: WordSeed[] = [
  { word: "維持する", reading: "いじする", meaningKo: "유지하다", level: "300점 목표", subject: "일본어", part: "동사", questionTypes: ["문맥 이해"], synonyms: ["保つ"], relatedWords: ["支える"] },
  { word: "実施", reading: "じっし", meaningKo: "실시", level: "300점 목표", subject: "일본어", part: "학술어", questionTypes: ["문맥 이해"], synonyms: ["行う"] },
  { word: "導入", reading: "どうにゅう", meaningKo: "도입", level: "300점 목표", subject: "일본어", part: "학술어", questionTypes: ["문맥 이해"], relatedWords: ["改善"] },
  { word: "提案", reading: "ていあん", meaningKo: "제안", level: "300점 목표", subject: "기술문", part: "표현", questionTypes: ["주장 파악"], relatedWords: ["主張"] },
  { word: "相違", reading: "そうい", meaningKo: "차이", level: "300점 목표", subject: "기술문", part: "표현", questionTypes: ["비교·대조"], synonyms: ["違い"] },
  { word: "一方", reading: "いっぽう", meaningKo: "한편", level: "200점 목표", subject: "기술문", part: "접속", questionTypes: ["문맥 이해"], relatedWords: ["比較"] },
  { word: "したがって", reading: "したがって", meaningKo: "따라서", level: "200점 목표", subject: "기술문", part: "접속", questionTypes: ["근거 찾기"], relatedWords: ["結論"] },
  { word: "例えば", reading: "たとえば", meaningKo: "예를 들면", level: "필수 기초", subject: "기술문", part: "접속", questionTypes: ["근거 찾기"], relatedWords: ["具体例"] },
  { word: "統計", reading: "とうけい", meaningKo: "통계", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형", "그래프 해석"], relatedWords: ["資料", "平均"] },
  { word: "割合が高い", reading: "わりあいがたかい", meaningKo: "비율이 높다", level: "청독해·자료형", subject: "청독해", part: "자료형", questionTypes: ["자료형"], relatedWords: ["割合"] },
  { word: "増える", reading: "ふえる", meaningKo: "늘다", level: "200점 목표", subject: "일본어", part: "동사", questionTypes: ["원인·결과"], relatedWords: ["増加"] },
  { word: "減る", reading: "へる", meaningKo: "줄다", level: "200점 목표", subject: "일본어", part: "동사", questionTypes: ["원인·결과"], relatedWords: ["減少"] },
  { word: "貧困", reading: "ひんこん", meaningKo: "빈곤", level: "350+ 목표", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["福祉"] },
  { word: "格差", reading: "かくさ", meaningKo: "격차", level: "350+ 목표", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"], relatedWords: ["貧困"] },
  { word: "税金", reading: "ぜいきん", meaningKo: "세금", level: "300점 목표", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["財政"] },
  { word: "物価", reading: "ぶっか", meaningKo: "물가", level: "350+ 목표", subject: "종합과목", part: "경제", questionTypes: ["경제"], relatedWords: ["価格"] },
  { word: "失業率", reading: "しつぎょうりつ", meaningKo: "실업률", level: "350+ 목표", subject: "종합과목", part: "경제", questionTypes: ["경제", "그래프 해석"], relatedWords: ["労働力"] },
  { word: "気候変動", reading: "きこうへんどう", meaningKo: "기후변동", level: "350+ 목표", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["温暖化"] },
  { word: "排気ガス", reading: "はいきがす", meaningKo: "배기가스", level: "300점 목표", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["排出"] },
  { word: "資源不足", reading: "しげんぶそく", meaningKo: "자원 부족", level: "350+ 목표", subject: "종합과목", part: "환경", questionTypes: ["환경"], relatedWords: ["資源"] },
  { word: "政党", reading: "せいとう", meaningKo: "정당", level: "300점 목표", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["選挙"] },
  { word: "外交", reading: "がいこう", meaningKo: "외교", level: "350+ 목표", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"], relatedWords: ["国会"] },
  { word: "植民地", reading: "しょくみんち", meaningKo: "식민지", level: "350+ 목표", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["帝国主義"] },
  { word: "条約", reading: "じょうやく", meaningKo: "조약", level: "350+ 목표", subject: "종합과목", part: "세계사", questionTypes: ["세계사"], relatedWords: ["ウィーン会議"] },
  { word: "論文", reading: "ろんぶん", meaningKo: "논문", level: "350+ 목표", subject: "기술문", part: "학술", questionTypes: ["문맥 이해"], relatedWords: ["作用"] },
  { word: "要約", reading: "ようやく", meaningKo: "요약", level: "300점 목표", subject: "기술문", part: "표현", questionTypes: ["주장 파악"], relatedWords: ["結論"] },
  { word: "反省", reading: "はんせい", meaningKo: "반성", level: "200점 목표", subject: "일본어", part: "생활어", questionTypes: ["문맥 이해"], relatedWords: ["認める"] },
];

type ExtensionVocabSeed = WordSeed & {
  exampleJa: string;
  exampleKo: string;
  explanationKo?: string;
  frequencyScore?: number;
  difficulty?: VocabDifficulty;
  importance?: VocabItem["importance"];
  targetScore?: VocabItem["targetScore"];
  occurrenceCount?: number;
  appearedIn?: Occurrence[];
  sourceType?: VocabItem["sourceType"];
};

const EXTENSION_VOCAB_SEEDS: ExtensionVocabSeed[] = [
  {
    word: "proof of English proficiency",
    reading: "proof of English proficiency",
    meaningKo: "영어 능력 증명서",
    level: "300점 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어", "TOEFL", "IELTS", "TOEIC"],
    relatedWords: ["TOEFL iBT", "IELTS Academic", "TOEIC", "application requirements"],
    exampleJa: "The university requires proof of English proficiency.",
    exampleKo: "그 대학은 영어 능력 증명서를 요구합니다.",
    explanationKo: "일본 대학 지원 요강에서 TOEFL, IELTS, TOEIC 같은 영어 성적 제출을 가리킬 때 자주 나오는 표현입니다.",
    difficulty: 2,
    frequencyScore: 91,
  },
  {
    word: "application requirements",
    reading: "application requirements",
    meaningKo: "지원 조건",
    level: "300점 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어", "대학 입시 영어"],
    relatedWords: ["eligibility", "deadline", "documents"],
    exampleJa: "Check the application requirements before preparing documents.",
    exampleKo: "서류를 준비하기 전에 지원 조건을 확인하세요.",
    explanationKo: "학부·대학원 모집요강을 읽을 때 가장 먼저 확인해야 하는 핵심 표현입니다.",
    difficulty: 2,
    frequencyScore: 90,
  },
  {
    word: "application deadline",
    reading: "application deadline",
    meaningKo: "지원 마감일",
    level: "200점 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어", "TOEIC", "TOEFL", "IELTS"],
    relatedWords: ["submit", "documents", "late application"],
    exampleJa: "The application deadline is March 15.",
    exampleKo: "지원 마감일은 3월 15일입니다.",
    difficulty: 1,
    frequencyScore: 88,
  },
  {
    word: "transcript",
    reading: "transcript",
    meaningKo: "성적증명서",
    level: "200점 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어"],
    relatedWords: ["certificate", "academic record"],
    exampleJa: "Upload an official transcript issued by your school.",
    exampleKo: "학교에서 발급한 공식 성적증명서를 업로드하세요.",
    difficulty: 2,
    frequencyScore: 86,
  },
  {
    word: "certificate of graduation",
    reading: "certificate of graduation",
    meaningKo: "졸업증명서",
    level: "200점 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어"],
    relatedWords: ["certificate of expected graduation", "transcript"],
    exampleJa: "A certificate of graduation is required for enrollment.",
    exampleKo: "입학 절차에는 졸업증명서가 필요합니다.",
    difficulty: 2,
    frequencyScore: 84,
  },
  {
    word: "recommendation letter",
    reading: "recommendation letter",
    meaningKo: "추천서",
    level: "300점 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어", "대학 입시 영어"],
    relatedWords: ["referee", "professor", "application"],
    exampleJa: "Ask your teacher for a recommendation letter early.",
    exampleKo: "선생님께 추천서를 미리 부탁하세요.",
    difficulty: 2,
    frequencyScore: 83,
  },
  {
    word: "statement of purpose",
    reading: "statement of purpose",
    meaningKo: "학업계획서, 지원동기서",
    level: "350+ 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어", "TOEFL", "IELTS"],
    relatedWords: ["motivation letter", "essay", "research plan"],
    exampleJa: "Your statement of purpose should explain why you chose this program.",
    exampleKo: "학업계획서는 왜 이 전공을 선택했는지 설명해야 합니다.",
    difficulty: 3,
    frequencyScore: 86,
  },
  {
    word: "tuition waiver",
    reading: "tuition waiver",
    meaningKo: "수업료 면제",
    level: "350+ 목표",
    subject: "영어",
    part: "출원 영어",
    questionTypes: ["출원 영어", "장학금 영어"],
    relatedWords: ["scholarship", "financial aid"],
    exampleJa: "Students may apply for a tuition waiver after admission.",
    exampleKo: "학생은 합격 후 수업료 면제를 신청할 수 있습니다.",
    difficulty: 3,
    frequencyScore: 78,
  },
  {
    word: "academic writing",
    reading: "academic writing",
    meaningKo: "학술적 글쓰기",
    level: "350+ 목표",
    subject: "영어",
    part: "아카데믹 영어",
    questionTypes: ["TOEFL", "IELTS", "아카데믹 영어"],
    relatedWords: ["essay", "argument", "evidence"],
    exampleJa: "Academic writing requires clear evidence and structure.",
    exampleKo: "학술적 글쓰기는 명확한 근거와 구조가 필요합니다.",
    difficulty: 3,
    frequencyScore: 82,
  },
  {
    word: "integrated task",
    reading: "integrated task",
    meaningKo: "통합형 과제",
    level: "350+ 목표",
    subject: "영어",
    part: "TOEFL",
    questionTypes: ["TOEFL", "아카데믹 영어"],
    relatedWords: ["reading", "listening", "speaking", "writing"],
    exampleJa: "In an integrated task, you use reading and listening information.",
    exampleKo: "통합형 과제에서는 읽기와 듣기 정보를 함께 사용합니다.",
    difficulty: 3,
    frequencyScore: 79,
  },
  {
    word: "band score",
    reading: "band score",
    meaningKo: "IELTS 밴드 점수",
    level: "300점 목표",
    subject: "영어",
    part: "IELTS",
    questionTypes: ["IELTS", "아카데믹 영어"],
    relatedWords: ["overall band", "speaking", "writing"],
    exampleJa: "Some programs require an overall band score of 6.5.",
    exampleKo: "일부 프로그램은 overall band 6.5를 요구합니다.",
    difficulty: 2,
    frequencyScore: 80,
  },
  {
    word: "listening comprehension",
    reading: "listening comprehension",
    meaningKo: "듣기 이해력",
    level: "300점 목표",
    subject: "영어",
    part: "영어 시험",
    questionTypes: ["TOEIC", "TOEFL", "IELTS"],
    relatedWords: ["lecture", "conversation", "note-taking"],
    exampleJa: "Listening comprehension improves when you review the transcript.",
    exampleKo: "스크립트를 복습하면 듣기 이해력이 좋아집니다.",
    difficulty: 2,
    frequencyScore: 84,
  },
  {
    word: "product-market fit",
    reading: "PMF",
    meaningKo: "제품-시장 적합성",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "비즈니스 영어", "전문 용어"],
    relatedWords: ["traction", "retention", "customer pain"],
    exampleJa: "We have not reached product-market fit yet.",
    exampleKo: "아직 제품-시장 적합성에 도달하지 못했습니다.",
    explanationKo: "스타트업에서 제품이 실제 시장 문제를 충분히 해결하고 있는지를 말할 때 쓰는 핵심 용어입니다.",
    difficulty: 4,
    frequencyScore: 93,
  },
  {
    word: "runway",
    reading: "runway",
    meaningKo: "남은 운영 가능 기간",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "투자 영어", "전문 용어"],
    relatedWords: ["burn rate", "cash flow", "fundraising"],
    exampleJa: "We have nine months of runway left.",
    exampleKo: "우리에게는 9개월 정도의 운영 가능 기간이 남아 있습니다.",
    difficulty: 3,
    frequencyScore: 91,
  },
  {
    word: "burn rate",
    reading: "burn rate",
    meaningKo: "현금 소진 속도",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "투자 영어", "전문 용어"],
    relatedWords: ["runway", "cash flow", "cost structure"],
    exampleJa: "Reducing burn rate gives us more time to test the product.",
    exampleKo: "현금 소진 속도를 낮추면 제품을 검증할 시간이 늘어납니다.",
    difficulty: 3,
    frequencyScore: 90,
  },
  {
    word: "traction",
    reading: "traction",
    meaningKo: "시장 반응, 성장 지표",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "투자 영어", "전문 용어"],
    relatedWords: ["growth", "retention", "revenue"],
    exampleJa: "Investors want to see clear traction before the next round.",
    exampleKo: "투자자는 다음 라운드 전에 명확한 시장 반응을 보고 싶어 합니다.",
    difficulty: 3,
    frequencyScore: 92,
  },
  {
    word: "pivot",
    reading: "pivot",
    meaningKo: "사업 방향 전환",
    level: "300점 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "비즈니스 영어"],
    relatedWords: ["strategy", "hypothesis", "validation"],
    exampleJa: "The team decided to pivot after user interviews.",
    exampleKo: "팀은 사용자 인터뷰 후 방향 전환을 결정했습니다.",
    difficulty: 2,
    frequencyScore: 87,
  },
  {
    word: "go-to-market",
    reading: "GTM",
    meaningKo: "시장 진입 전략",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "비즈니스 영어", "전문 용어"],
    relatedWords: ["channel", "positioning", "launch"],
    exampleJa: "Our go-to-market strategy focuses on university students.",
    exampleKo: "우리의 시장 진입 전략은 대학생 사용자에 집중합니다.",
    difficulty: 3,
    frequencyScore: 89,
  },
  {
    word: "retention",
    reading: "retention",
    meaningKo: "유지율",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "SaaS 지표", "전문 용어"],
    relatedWords: ["churn", "engagement", "cohort"],
    exampleJa: "Day-7 retention is more important than downloads.",
    exampleKo: "다운로드 수보다 7일차 유지율이 더 중요합니다.",
    difficulty: 3,
    frequencyScore: 90,
  },
  {
    word: "churn",
    reading: "churn",
    meaningKo: "이탈, 해지",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "SaaS 지표", "전문 용어"],
    relatedWords: ["retention", "subscription", "cancellation"],
    exampleJa: "High churn means users are not finding enough value.",
    exampleKo: "이탈률이 높다는 것은 사용자가 충분한 가치를 느끼지 못한다는 뜻입니다.",
    difficulty: 3,
    frequencyScore: 88,
  },
  {
    word: "conversion rate",
    reading: "conversion rate",
    meaningKo: "전환율",
    level: "300점 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "마케팅 영어", "SaaS 지표"],
    relatedWords: ["funnel", "signup", "purchase"],
    exampleJa: "We improved the signup conversion rate.",
    exampleKo: "가입 전환율을 개선했습니다.",
    difficulty: 2,
    frequencyScore: 88,
  },
  {
    word: "unit economics",
    reading: "unit economics",
    meaningKo: "단위경제성",
    level: "350+ 목표",
    subject: "영어",
    part: "스타트업 영어",
    questionTypes: ["스타트업 영어", "투자 영어", "SaaS 지표"],
    relatedWords: ["LTV", "CAC", "margin"],
    exampleJa: "The unit economics are not healthy yet.",
    exampleKo: "아직 단위경제성이 건강하지 않습니다.",
    difficulty: 4,
    frequencyScore: 86,
  },
  {
    word: "term sheet",
    reading: "term sheet",
    meaningKo: "투자 조건서",
    level: "350+ 목표",
    subject: "영어",
    part: "투자 영어",
    questionTypes: ["스타트업 영어", "투자 영어", "전문 용어"],
    relatedWords: ["valuation", "equity", "due diligence"],
    exampleJa: "The investor sent us a term sheet.",
    exampleKo: "투자자가 투자 조건서를 보내왔습니다.",
    difficulty: 4,
    frequencyScore: 82,
  },
  {
    word: "cap table",
    reading: "cap table",
    meaningKo: "지분 구조표",
    level: "350+ 목표",
    subject: "영어",
    part: "투자 영어",
    questionTypes: ["스타트업 영어", "투자 영어", "전문 용어"],
    relatedWords: ["equity", "shareholder", "dilution"],
    exampleJa: "Keep the cap table simple before fundraising.",
    exampleKo: "투자 유치 전에는 지분 구조표를 단순하게 유지하세요.",
    difficulty: 4,
    frequencyScore: 80,
  },
  {
    word: "Could you clarify the timeline?",
    reading: "could you clarify the timeline",
    meaningKo: "일정을 명확히 설명해 주실 수 있을까요?",
    level: "200점 목표",
    subject: "영어",
    part: "비즈니스 영어 문장",
    questionTypes: ["비즈니스 영어", "실무 문장", "회의 표현"],
    relatedWords: ["timeline", "deadline", "schedule"],
    exampleJa: "Could you clarify the timeline before we confirm the launch date?",
    exampleKo: "출시일을 확정하기 전에 일정을 명확히 설명해 주실 수 있을까요?",
    difficulty: 2,
    frequencyScore: 87,
  },
  {
    word: "Let's align on the next steps.",
    reading: "let's align on the next steps",
    meaningKo: "다음 단계에 대해 합의합시다.",
    level: "200점 목표",
    subject: "영어",
    part: "비즈니스 영어 문장",
    questionTypes: ["비즈니스 영어", "실무 문장", "회의 표현"],
    relatedWords: ["next steps", "alignment", "action items"],
    exampleJa: "Let's align on the next steps and owners.",
    exampleKo: "다음 단계와 담당자에 대해 합의합시다.",
    difficulty: 2,
    frequencyScore: 89,
  },
  {
    word: "We need to validate the assumption.",
    reading: "we need to validate the assumption",
    meaningKo: "그 가설을 검증해야 합니다.",
    level: "300점 목표",
    subject: "영어",
    part: "비즈니스 영어 문장",
    questionTypes: ["비즈니스 영어", "스타트업 영어", "실무 문장"],
    relatedWords: ["validate", "assumption", "experiment"],
    exampleJa: "We need to validate the assumption with real users.",
    exampleKo: "실제 사용자로 그 가설을 검증해야 합니다.",
    difficulty: 2,
    frequencyScore: 88,
  },
  {
    word: "Can we circle back after reviewing the data?",
    reading: "can we circle back after reviewing the data",
    meaningKo: "데이터를 검토한 뒤 다시 이야기할 수 있을까요?",
    level: "300점 목표",
    subject: "영어",
    part: "비즈니스 영어 문장",
    questionTypes: ["비즈니스 영어", "실무 문장", "회의 표현"],
    relatedWords: ["circle back", "review", "data"],
    exampleJa: "Can we circle back after reviewing the data tomorrow?",
    exampleKo: "내일 데이터를 검토한 뒤 다시 이야기할 수 있을까요?",
    difficulty: 3,
    frequencyScore: 82,
  },
  {
    word: "The proposal needs a clearer value proposition.",
    reading: "the proposal needs a clearer value proposition",
    meaningKo: "제안서에는 더 명확한 가치 제안이 필요합니다.",
    level: "350+ 목표",
    subject: "영어",
    part: "비즈니스 영어 문장",
    questionTypes: ["비즈니스 영어", "스타트업 영어", "실무 문장"],
    relatedWords: ["proposal", "value proposition", "pitch"],
    exampleJa: "The proposal needs a clearer value proposition for schools.",
    exampleKo: "그 제안서에는 학교를 위한 더 명확한 가치 제안이 필요합니다.",
    difficulty: 3,
    frequencyScore: 83,
  },
  {
    word: "お世話になっております",
    reading: "おせわになっております",
    meaningKo: "항상 신세지고 있습니다, 비즈니스 메일 첫인사",
    level: "200점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "메일 표현", "회사 실무"],
    relatedWords: ["ご連絡ありがとうございます", "よろしくお願いいたします"],
    exampleJa: "お世話になっております。VocaRushのキムです。",
    exampleKo: "안녕하세요. VocaRush의 김입니다.",
    explanationKo: "일본 회사 메일에서 첫 줄에 자주 쓰는 정중한 인사입니다.",
    difficulty: 2,
    frequencyScore: 92,
  },
  {
    word: "ご確認いただけますでしょうか",
    reading: "ごかくにんいただけますでしょうか",
    meaningKo: "확인해 주실 수 있을까요?",
    level: "300점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "메일 표현", "회사 실무"],
    relatedWords: ["ご査収ください", "ご返信お待ちしております"],
    exampleJa: "添付資料をご確認いただけますでしょうか。",
    exampleKo: "첨부 자료를 확인해 주실 수 있을까요?",
    difficulty: 3,
    frequencyScore: 90,
  },
  {
    word: "恐れ入りますが",
    reading: "おそれいりますが",
    meaningKo: "죄송하지만, 송구하지만",
    level: "300점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "메일 표현"],
    relatedWords: ["恐縮ですが", "申し訳ございません"],
    exampleJa: "恐れ入りますが、再度ご確認をお願いいたします。",
    exampleKo: "죄송하지만 다시 한번 확인 부탁드립니다.",
    difficulty: 3,
    frequencyScore: 88,
  },
  {
    word: "承知いたしました",
    reading: "しょうちいたしました",
    meaningKo: "알겠습니다, 확인했습니다",
    level: "200점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "회의 표현", "회사 실무"],
    relatedWords: ["かしこまりました", "了解しました"],
    exampleJa: "日程変更の件、承知いたしました。",
    exampleKo: "일정 변경 건, 확인했습니다.",
    difficulty: 2,
    frequencyScore: 88,
  },
  {
    word: "日程調整",
    reading: "にっていちょうせい",
    meaningKo: "일정 조율",
    level: "200점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "회의 표현", "회사 실무"],
    relatedWords: ["候補日", "打ち合わせ", "会議"],
    exampleJa: "来週の打ち合わせの日程調整をお願いいたします。",
    exampleKo: "다음 주 미팅 일정 조율을 부탁드립니다.",
    difficulty: 2,
    frequencyScore: 87,
  },
  {
    word: "議事録",
    reading: "ぎじろく",
    meaningKo: "회의록",
    level: "300점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "회의 표현", "회사 실무"],
    relatedWords: ["会議", "共有", "決定事項"],
    exampleJa: "会議後に議事録を共有いたします。",
    exampleKo: "회의 후 회의록을 공유하겠습니다.",
    difficulty: 2,
    frequencyScore: 83,
  },
  {
    word: "見積書",
    reading: "みつもりしょ",
    meaningKo: "견적서",
    level: "300점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "회사 실무"],
    relatedWords: ["請求書", "納期", "費用"],
    exampleJa: "見積書を本日中にお送りします。",
    exampleKo: "견적서를 오늘 중으로 보내겠습니다.",
    difficulty: 3,
    frequencyScore: 80,
  },
  {
    word: "納期",
    reading: "のうき",
    meaningKo: "납기, 제출 기한",
    level: "300점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "회사 실무"],
    relatedWords: ["締切", "スケジュール", "進捗"],
    exampleJa: "納期に間に合うように進めます。",
    exampleKo: "납기에 맞출 수 있도록 진행하겠습니다.",
    difficulty: 3,
    frequencyScore: 81,
  },
  {
    word: "取り急ぎ",
    reading: "とりいそぎ",
    meaningKo: "우선 급히, 일단 먼저",
    level: "300점 목표",
    subject: "실용일본어",
    part: "비즈니스 일본어",
    questionTypes: ["비즈니스 일본어", "메일 표현"],
    relatedWords: ["まずは", "ご報告まで"],
    exampleJa: "取り急ぎ、資料のみお送りいたします。",
    exampleKo: "우선 급히 자료만 보내드립니다.",
    difficulty: 3,
    frequencyScore: 79,
  },
  {
    word: "それな",
    reading: "それな",
    meaningKo: "그거 맞아, 완전 공감",
    level: "필수 기초",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["わかる", "たしかに"],
    exampleJa: "明日の1限きついよね。- それな。",
    exampleKo: "내일 1교시 힘들지. - 인정.",
    difficulty: 1,
    frequencyScore: 90,
  },
  {
    word: "わかりみ",
    reading: "わかりみ",
    meaningKo: "공감됨, 이해됨",
    level: "200점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["それな", "共感"],
    exampleJa: "締切前の焦り、わかりみが深い。",
    exampleKo: "마감 전의 초조함, 너무 공감된다.",
    difficulty: 2,
    frequencyScore: 84,
  },
  {
    word: "ガチ",
    reading: "がち",
    meaningKo: "진짜, 정말, serious",
    level: "필수 기초",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "실사용 일본어"],
    relatedWords: ["本当に", "マジ"],
    exampleJa: "この課題、ガチで難しい。",
    exampleKo: "이 과제 진짜 어렵다.",
    difficulty: 1,
    frequencyScore: 89,
  },
  {
    word: "エモい",
    reading: "えもい",
    meaningKo: "감성적이다, 마음이 움직인다",
    level: "200점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["感動", "懐かしい"],
    exampleJa: "この写真、夜のキャンパス感がエモい。",
    exampleKo: "이 사진, 밤 캠퍼스 느낌이 감성적이다.",
    difficulty: 2,
    frequencyScore: 85,
  },
  {
    word: "ワンチャン",
    reading: "わんちゃん",
    meaningKo: "어쩌면 가능성 있음",
    level: "200점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["可能性", "もしかしたら"],
    exampleJa: "今から行けばワンチャン間に合う。",
    exampleKo: "지금 가면 어쩌면 맞출 수 있어.",
    difficulty: 2,
    frequencyScore: 86,
  },
  {
    word: "なるはや",
    reading: "なるはや",
    meaningKo: "가능한 한 빨리",
    level: "200점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "비즈니스 일본어", "실사용 일본어"],
    relatedWords: ["できるだけ早く", "至急"],
    exampleJa: "資料、なるはやで送ってくれる？",
    exampleKo: "자료 가능한 한 빨리 보내줄래?",
    difficulty: 2,
    frequencyScore: 82,
  },
  {
    word: "タイパ",
    reading: "たいぱ",
    meaningKo: "시간 대비 효율",
    level: "300점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["コスパ", "効率"],
    exampleJa: "倍速で見るとタイパがいい。",
    exampleKo: "배속으로 보면 시간 효율이 좋다.",
    difficulty: 3,
    frequencyScore: 83,
  },
  {
    word: "推し",
    reading: "おし",
    meaningKo: "최애, 응원하는 대상",
    level: "200점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["推し活", "沼る"],
    exampleJa: "推しのライブに行くためにバイトしてる。",
    exampleKo: "최애의 라이브에 가려고 알바하고 있어.",
    difficulty: 2,
    frequencyScore: 88,
  },
  {
    word: "沼る",
    reading: "ぬまる",
    meaningKo: "깊이 빠지다, 덕질에 빠지다",
    level: "300점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "신조어", "실사용 일본어"],
    relatedWords: ["推し", "ハマる"],
    exampleJa: "友達にすすめられて、そのドラマに沼った。",
    exampleKo: "친구 추천으로 그 드라마에 완전히 빠졌다.",
    difficulty: 3,
    frequencyScore: 84,
  },
  {
    word: "バズる",
    reading: "ばずる",
    meaningKo: "화제가 되다, 바이럴되다",
    level: "300점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "SNS 표현", "실사용 일본어"],
    relatedWords: ["SNS", "拡散", "話題"],
    exampleJa: "この投稿、昨日からバズってる。",
    exampleKo: "이 게시물 어제부터 화제야.",
    difficulty: 2,
    frequencyScore: 85,
  },
  {
    word: "既読スルー",
    reading: "きどくするー",
    meaningKo: "읽고 답장하지 않음",
    level: "300점 목표",
    subject: "실용일본어",
    part: "대학생 표현",
    questionTypes: ["대학생 표현", "SNS 표현", "실사용 일본어"],
    relatedWords: ["未読", "返信", "LINE"],
    exampleJa: "グループLINEで既読スルーされてる。",
    exampleKo: "그룹 라인에서 읽씹당하고 있어.",
    difficulty: 3,
    frequencyScore: 82,
  },
  {
    word: "レジュメ",
    reading: "れじゅめ",
    meaningKo: "강의 자료, 발표 요약 자료",
    level: "200점 목표",
    subject: "실용일본어",
    part: "캠퍼스 일본어",
    questionTypes: ["대학생 표현", "캠퍼스 일본어", "실사용 일본어"],
    relatedWords: ["授業", "発表", "資料"],
    exampleJa: "今日の授業のレジュメ、共有してくれる？",
    exampleKo: "오늘 수업 자료 공유해 줄래?",
    difficulty: 2,
    frequencyScore: 84,
  },
  {
    word: "グループワーク",
    reading: "ぐるーぷわーく",
    meaningKo: "조별 활동, 그룹 과제",
    level: "200점 목표",
    subject: "실용일본어",
    part: "캠퍼스 일본어",
    questionTypes: ["대학생 표현", "캠퍼스 일본어", "실사용 일본어"],
    relatedWords: ["発表", "課題", "ゼミ"],
    exampleJa: "午後の授業はグループワークがある。",
    exampleKo: "오후 수업에는 조별 활동이 있다.",
    difficulty: 2,
    frequencyScore: 83,
  },
];

const RECENT_EJU_2016_PLUS_SEEDS: ExtensionVocabSeed[] = [
  {
    word: "多様性",
    reading: "たようせい",
    meaningKo: "다양성",
    level: "300점 목표",
    subject: "일본어",
    part: "학술어",
    questionTypes: ["문맥 이해", "주장 파악"],
    relatedWords: ["共生", "価値観", "社会"],
    exampleJa: "多様性を尊重する社会では、異なる意見を聞く姿勢が重要になる。",
    exampleKo: "다양성을 존중하는 사회에서는 다른 의견을 듣는 태도가 중요해진다.",
    difficulty: 3,
    frequencyScore: 91,
  },
  {
    word: "共生",
    reading: "きょうせい",
    meaningKo: "공생, 함께 살아감",
    level: "300점 목표",
    subject: "일본어",
    part: "독해",
    questionTypes: ["문맥 이해", "사회 문제"],
    relatedWords: ["多様性", "地域社会", "共存"],
    exampleJa: "地域で共生するには、互いの背景を理解する必要がある。",
    exampleKo: "지역에서 공생하려면 서로의 배경을 이해할 필요가 있다.",
    difficulty: 3,
    frequencyScore: 89,
  },
  {
    word: "持続可能性",
    reading: "じぞくかのうせい",
    meaningKo: "지속가능성",
    level: "350+ 목표",
    subject: "종합과목",
    part: "환경",
    questionTypes: ["환경", "사회 문제"],
    relatedWords: ["再生可能エネルギー", "資源", "環境保護"],
    exampleJa: "経済成長と持続可能性の両立が課題になっている。",
    exampleKo: "경제 성장과 지속가능성의 양립이 과제가 되고 있다.",
    difficulty: 4,
    frequencyScore: 92,
  },
  {
    word: "再生可能エネルギー",
    reading: "さいせいかのうえねるぎー",
    meaningKo: "재생 가능 에너지",
    level: "종합과목 연결",
    subject: "종합과목",
    part: "환경",
    questionTypes: ["환경", "그래프 해석"],
    relatedWords: ["太陽光", "風力", "温暖化"],
    exampleJa: "再生可能エネルギーの割合は年々高まっている。",
    exampleKo: "재생 가능 에너지의 비율은 해마다 높아지고 있다.",
    difficulty: 3,
    frequencyScore: 90,
  },
  {
    word: "情報リテラシー",
    reading: "じょうほうりてらしー",
    meaningKo: "정보 리터러시",
    level: "350+ 목표",
    subject: "일본어",
    part: "학술어",
    questionTypes: ["정보 선택", "문맥 이해"],
    relatedWords: ["SNS", "信頼性", "判断"],
    exampleJa: "情報リテラシーが低いと、誤った情報を信じてしまうことがある。",
    exampleKo: "정보 리터러시가 낮으면 잘못된 정보를 믿어 버릴 수 있다.",
    difficulty: 4,
    frequencyScore: 88,
  },
  {
    word: "信頼性",
    reading: "しんらいせい",
    meaningKo: "신뢰성",
    level: "300점 목표",
    subject: "일본어",
    part: "독해",
    questionTypes: ["근거 찾기", "문맥 이해"],
    relatedWords: ["根拠", "資料", "情報"],
    exampleJa: "資料の信頼性を確認してから判断する。",
    exampleKo: "자료의 신뢰성을 확인한 뒤 판단한다.",
    difficulty: 3,
    frequencyScore: 89,
  },
  {
    word: "推移",
    reading: "すいい",
    meaningKo: "추이",
    level: "청독해·자료형",
    subject: "청독해",
    part: "자료형",
    questionTypes: ["자료형", "그래프 해석"],
    relatedWords: ["変化", "増加", "減少"],
    exampleJa: "グラフから人口の推移を読み取る。",
    exampleKo: "그래프에서 인구의 추이를 읽어낸다.",
    difficulty: 3,
    frequencyScore: 90,
  },
  {
    word: "図表",
    reading: "ずひょう",
    meaningKo: "도표",
    level: "청독해·자료형",
    subject: "청독해",
    part: "자료형",
    questionTypes: ["자료형", "정보 선택"],
    relatedWords: ["表", "グラフ", "資料"],
    exampleJa: "図表を見ながら、条件に合う選択肢を選ぶ。",
    exampleKo: "도표를 보면서 조건에 맞는 선택지를 고른다.",
    difficulty: 2,
    frequencyScore: 88,
  },
  {
    word: "選択肢",
    reading: "せんたくし",
    meaningKo: "선택지",
    level: "200점 목표",
    subject: "일본어",
    part: "시험 표현",
    questionTypes: ["정보 선택", "어휘 추론"],
    relatedWords: ["条件", "答え", "問題"],
    exampleJa: "本文の内容と合う選択肢を一つ選びなさい。",
    exampleKo: "본문 내용과 맞는 선택지를 하나 고르시오.",
    difficulty: 2,
    frequencyScore: 87,
  },
  {
    word: "感染症",
    reading: "かんせんしょう",
    meaningKo: "감염증",
    level: "300점 목표",
    subject: "종합과목",
    part: "사회",
    questionTypes: ["사회 문제", "원인·결과"],
    relatedWords: ["医療", "公衆衛生", "予防"],
    exampleJa: "感染症の拡大は医療体制に大きな影響を与えた。",
    exampleKo: "감염증의 확산은 의료 체제에 큰 영향을 주었다.",
    difficulty: 3,
    frequencyScore: 87,
  },
  {
    word: "防災",
    reading: "ぼうさい",
    meaningKo: "방재",
    level: "300점 목표",
    subject: "종합과목",
    part: "사회",
    questionTypes: ["사회 문제", "자료형"],
    relatedWords: ["災害", "避難", "復興"],
    exampleJa: "防災意識を高めるために地域で訓練を行う。",
    exampleKo: "방재 의식을 높이기 위해 지역에서 훈련을 한다.",
    difficulty: 3,
    frequencyScore: 86,
  },
  {
    word: "復興",
    reading: "ふっこう",
    meaningKo: "부흥, 복구",
    level: "300점 목표",
    subject: "종합과목",
    part: "사회",
    questionTypes: ["사회 문제", "원인·결과"],
    relatedWords: ["災害", "地域", "支援"],
    exampleJa: "災害後の復興には長期的な支援が必要である。",
    exampleKo: "재해 후의 복구에는 장기적인 지원이 필요하다.",
    difficulty: 3,
    frequencyScore: 85,
  },
  {
    word: "地方創生",
    reading: "ちほうそうせい",
    meaningKo: "지방 창생, 지역 활성화",
    level: "350+ 목표",
    subject: "종합과목",
    part: "사회",
    questionTypes: ["사회 문제", "경제"],
    relatedWords: ["地域", "人口減少", "観光資源"],
    exampleJa: "地方創生のために若者の移住を促す自治体が増えている。",
    exampleKo: "지방 창생을 위해 젊은 층의 이주를 촉진하는 지자체가 늘고 있다.",
    difficulty: 4,
    frequencyScore: 84,
  },
  {
    word: "観光資源",
    reading: "かんこうしげん",
    meaningKo: "관광 자원",
    level: "300점 목표",
    subject: "종합과목",
    part: "지리",
    questionTypes: ["지리", "경제"],
    relatedWords: ["地域", "産業", "インバウンド"],
    exampleJa: "地域の観光資源を生かして産業を育てる。",
    exampleKo: "지역의 관광 자원을 살려 산업을 키운다.",
    difficulty: 3,
    frequencyScore: 84,
  },
  {
    word: "インバウンド",
    reading: "いんばうんど",
    meaningKo: "방일 외국인 관광, 인바운드",
    level: "300점 목표",
    subject: "종합과목",
    part: "경제",
    questionTypes: ["경제", "지리"],
    relatedWords: ["観光", "円安", "消費"],
    exampleJa: "円安によりインバウンド消費が増加した。",
    exampleKo: "엔저로 인해 인바운드 소비가 증가했다.",
    difficulty: 3,
    frequencyScore: 86,
  },
  {
    word: "円安",
    reading: "えんやす",
    meaningKo: "엔저",
    level: "종합과목 연결",
    subject: "종합과목",
    part: "경제",
    questionTypes: ["경제", "국제경제"],
    relatedWords: ["円高", "為替", "輸出"],
    exampleJa: "円安は輸出企業に有利に働く場合がある。",
    exampleKo: "엔저는 수출 기업에 유리하게 작용하는 경우가 있다.",
    difficulty: 3,
    frequencyScore: 88,
  },
  {
    word: "労働生産性",
    reading: "ろうどうせいさんせい",
    meaningKo: "노동 생산성",
    level: "350+ 목표",
    subject: "종합과목",
    part: "경제",
    questionTypes: ["경제", "그래프 해석"],
    relatedWords: ["労働力", "生産", "効率"],
    exampleJa: "労働生産性を高めることが企業の課題となっている。",
    exampleKo: "노동 생산성을 높이는 것이 기업의 과제가 되고 있다.",
    difficulty: 4,
    frequencyScore: 85,
  },
  {
    word: "オンライン授業",
    reading: "おんらいんじゅぎょう",
    meaningKo: "온라인 수업",
    level: "200점 목표",
    subject: "일본어",
    part: "생활·교육",
    questionTypes: ["정보 선택", "문맥 이해"],
    relatedWords: ["授業", "課題", "通信環境"],
    exampleJa: "オンライン授業では通信環境を事前に確認する必要がある。",
    exampleKo: "온라인 수업에서는 통신 환경을 미리 확인할 필요가 있다.",
    difficulty: 2,
    frequencyScore: 82,
  },
  {
    word: "根拠づける",
    reading: "こんきょづける",
    meaningKo: "근거를 부여하다, 뒷받침하다",
    level: "350+ 목표",
    subject: "기술문",
    part: "논리",
    questionTypes: ["근거 찾기", "주장 파악"],
    relatedWords: ["根拠", "理由", "主張"],
    exampleJa: "筆者は調査結果によって自分の主張を根拠づけている。",
    exampleKo: "필자는 조사 결과로 자신의 주장을 뒷받침하고 있다.",
    difficulty: 4,
    frequencyScore: 86,
  },
  {
    word: "前者",
    reading: "ぜんしゃ",
    meaningKo: "전자, 앞에서 말한 것",
    level: "300점 목표",
    subject: "기술문",
    part: "지시 표현",
    questionTypes: ["문맥 이해", "비교·대조"],
    relatedWords: ["後者", "一方", "比較"],
    exampleJa: "前者は効率を重視し、後者は公平性を重視する。",
    exampleKo: "전자는 효율을 중시하고 후자는 공정성을 중시한다.",
    difficulty: 3,
    frequencyScore: 85,
  },
  {
    word: "後者",
    reading: "こうしゃ",
    meaningKo: "후자, 뒤에서 말한 것",
    level: "300점 목표",
    subject: "기술문",
    part: "지시 표현",
    questionTypes: ["문맥 이해", "비교·대조"],
    relatedWords: ["前者", "一方", "比較"],
    exampleJa: "二つの方法のうち、後者のほうが時間はかかるが正確である。",
    exampleKo: "두 방법 중 후자는 시간이 걸리지만 정확하다.",
    difficulty: 3,
    frequencyScore: 85,
  },
  {
    word: "見直す",
    reading: "みなおす",
    meaningKo: "재검토하다, 다시 보다",
    level: "300점 목표",
    subject: "일본어",
    part: "동사",
    questionTypes: ["문맥 이해", "원인·결과"],
    relatedWords: ["改善", "検討", "変更"],
    exampleJa: "制度を見直すことで利用者の負担を減らす。",
    exampleKo: "제도를 재검토함으로써 이용자의 부담을 줄인다.",
    difficulty: 3,
    frequencyScore: 87,
  },
];

type RecentEjuCompactTerm = [
  word: string,
  reading: string,
  meaningKo: string,
  subject: VocabSubject,
  part: string,
  questionTypes: string[],
  relatedWords: string[],
  difficulty: VocabDifficulty,
  frequencyScore: number
];

function recentLevelFromDifficulty(difficulty: VocabDifficulty, subject: VocabSubject): VocabLevel {
  if (subject === "청독해") return "청독해·자료형";
  if (subject === "기술문") return "기술문 표현";
  if (subject === "종합과목") return difficulty >= 4 ? "종합과목 연결" : "300점 목표";
  if (difficulty >= 4) return "350+ 목표";
  if (difficulty >= 3) return "300점 목표";
  return "200점 목표";
}

function recentExampleJa(word: string, subject: VocabSubject, questionTypes: string[]) {
  if (word === "一方で") return "一方で、費用が増えるという課題もある。";
  if (word === "したがって") return "したがって、制度の見直しが必要だ。";
  if (word === "すなわち") return "すなわち、原因は一つではない。";
  if (word === "具体例") return "本文では具体例を挙げて説明している。";
  if (word === "要因") return "人口減少の要因を資料から考える。";
  if (word === "比較") return "二つの資料を比較して違いを読み取る。";
  if (word === "対照") return "都市部と地方を対照して特徴を述べる。";
  if (word === "増加傾向") return "グラフから利用者数の増加傾向が読み取れる。";
  if (word === "減少傾向") return "出生数は長期的に減少傾向にある。";
  if (questionTypes.includes("그래프 해석") || subject === "청독해") {
    return `${word}に関する資料から、変化の特徴を読み取る。`;
  }
  if (subject === "기술문") {
    return `筆者は${word}を手がかりに考えを説明している。`;
  }
  return `${word}について、背景と社会への影響を考える。`;
}

function recentExampleKo(word: string, meaningKo: string, subject: VocabSubject, questionTypes: string[]) {
  if (word === "一方で") return "한편 비용이 늘어난다는 과제도 있다.";
  if (word === "したがって") return "따라서 제도 재검토가 필요하다.";
  if (word === "すなわち") return "즉 원인은 하나가 아니다.";
  if (word === "具体例") return "본문에서는 구체적인 예를 들어 설명한다.";
  if (word === "要因") return "인구 감소의 요인을 자료에서 생각한다.";
  if (word === "比較") return "두 자료를 비교해 차이를 읽어낸다.";
  if (word === "対照") return "도시와 지방을 대조해 특징을 설명한다.";
  if (word === "増加傾向") return "그래프에서 이용자 수의 증가 경향을 읽을 수 있다.";
  if (word === "減少傾向") return "출생 수는 장기적으로 감소 경향에 있다.";
  if (questionTypes.includes("그래프 해석") || subject === "청독해") {
    return `${meaningKo}에 관한 자료에서 변화의 특징을 읽어낸다.`;
  }
  if (subject === "기술문") {
    return `필자는 ${meaningKo}를 단서로 생각을 설명한다.`;
  }
  return `${meaningKo}에 대해 배경과 사회적 영향을 생각한다.`;
}

const RECENT_EJU_2016_2025_COMPACT_TERMS: RecentEjuCompactTerm[] = [
  ["脱炭素", "だつたんそ", "탈탄소", "종합과목", "환경", ["환경", "사회 문제"], ["温室効果ガス", "気候変動", "再生可能エネルギー"], 4, 95],
  ["カーボンニュートラル", "かーぼんにゅーとらる", "탄소중립", "종합과목", "환경", ["환경", "사회 문제"], ["脱炭素", "温室効果ガス", "省エネルギー"], 4, 94],
  ["温室効果ガス", "おんしつこうかがす", "온실가스", "종합과목", "환경", ["환경", "그래프 해석"], ["脱炭素", "気候変動", "排出量"], 3, 93],
  ["気候変動", "きこうへんどう", "기후변동", "종합과목", "환경", ["환경", "사회 문제"], ["温暖化", "災害", "持続可能性"], 3, 93],
  ["生物多様性", "せいぶつたようせい", "생물다양성", "종합과목", "환경", ["환경", "사회 문제"], ["生態系", "保全", "多様性"], 4, 91],
  ["生態系", "せいたいけい", "생태계", "종합과목", "환경", ["환경", "원인·결과"], ["生物多様性", "保全", "環境保護"], 3, 89],
  ["循環型社会", "じゅんかんがたしゃかい", "순환형 사회", "종합과목", "환경", ["환경", "사회 문제"], ["再利用", "廃棄物", "資源"], 4, 90],
  ["食品ロス", "しょくひんろす", "식품 손실, 음식물 낭비", "종합과목", "사회", ["사회 문제", "환경"], ["廃棄物", "消費", "再利用"], 3, 88],
  ["廃棄物", "はいきぶつ", "폐기물", "종합과목", "환경", ["환경", "사회 문제"], ["ごみ", "再利用", "循環型社会"], 3, 87],
  ["再利用", "さいりよう", "재이용", "종합과목", "환경", ["환경", "자료형"], ["資源", "廃棄物", "循環型社会"], 2, 86],
  ["省エネルギー", "しょうえねるぎー", "에너지 절약", "종합과목", "환경", ["환경", "경제"], ["電力", "脱炭素", "消費"], 3, 86],
  ["エネルギー自給率", "えねるぎーじきゅうりつ", "에너지 자급률", "종합과목", "경제", ["경제", "국제사회"], ["資源", "輸入", "安全保障"], 4, 87],
  ["避難所", "ひなんじょ", "피난소", "종합과목", "사회", ["사회 문제", "정보 선택"], ["災害", "防災", "避難"], 2, 86],
  ["ハザードマップ", "はざーどまっぷ", "재해 위험 지도", "종합과목", "사회", ["사회 문제", "자료형"], ["防災", "避難", "災害"], 3, 85],
  ["耐震", "たいしん", "내진", "종합과목", "사회", ["사회 문제", "원인·결과"], ["災害", "建築", "防災"], 3, 84],
  ["公衆衛生", "こうしゅうえいせい", "공중위생", "종합과목", "사회", ["사회 문제", "원인·결과"], ["医療", "感染症", "予防"], 4, 88],
  ["予防接種", "よぼうせっしゅ", "예방접종", "종합과목", "사회", ["사회 문제", "정보 선택"], ["感染症", "医療", "公衆衛生"], 3, 87],
  ["医療体制", "いりょうたいせい", "의료 체제", "종합과목", "사회", ["사회 문제", "자료형"], ["医療", "感染症", "高齢化"], 3, 87],
  ["遠隔医療", "えんかくいりょう", "원격 의료", "종합과목", "사회", ["사회 문제", "정보 선택"], ["医療体制", "高齢化", "デジタル化"], 4, 85],
  ["少子高齢化", "しょうしこうれいか", "저출산 고령화", "종합과목", "사회", ["사회 문제", "그래프 해석"], ["人口減少", "社会保障", "介護"], 3, 94],
  ["人口減少", "じんこうげんしょう", "인구 감소", "종합과목", "사회", ["사회 문제", "그래프 해석"], ["少子高齢化", "過疎化", "労働力不足"], 3, 93],
  ["過疎化", "かそか", "과소화, 지방 인구 감소", "종합과목", "지리", ["지리", "사회 문제"], ["地域", "人口減少", "地方創生"], 3, 89],
  ["労働力不足", "ろうどうりょくぶそく", "노동력 부족", "종합과목", "경제", ["경제", "사회 문제"], ["人口減少", "外国人労働者", "生産性"], 3, 90],
  ["外国人労働者", "がいこくじんろうどうしゃ", "외국인 노동자", "종합과목", "사회", ["사회 문제", "경제"], ["多文化共生", "労働力不足", "移民"], 3, 88],
  ["多文化共生", "たぶんかきょうせい", "다문화 공생", "종합과목", "사회", ["사회 문제", "국제사회"], ["外国人労働者", "共生", "地域社会"], 4, 89],
  ["ジェンダー平等", "じぇんだーびょうどう", "젠더 평등", "종합과목", "사회", ["사회 문제", "국제사회"], ["人権", "格差", "多様性"], 3, 87],
  ["格差", "かくさ", "격차", "종합과목", "사회", ["사회 문제", "경제"], ["貧困", "教育格差", "所得"], 3, 91],
  ["貧困", "ひんこん", "빈곤", "종합과목", "사회", ["사회 문제", "국제사회"], ["格差", "福祉", "支援"], 3, 88],
  ["社会保障", "しゃかいほしょう", "사회보장", "종합과목", "사회", ["사회 문제", "경제 정책"], ["年金", "医療", "介護"], 3, 92],
  ["介護", "かいご", "간병, 돌봄", "종합과목", "사회", ["사회 문제", "경제"], ["高齢化", "福祉", "社会保障"], 3, 88],
  ["子育て支援", "こそだてしえん", "육아 지원", "종합과목", "사회", ["사회 문제", "경제 정책"], ["少子化", "福祉", "支援"], 3, 86],
  ["非正規雇用", "ひせいきこよう", "비정규 고용", "종합과목", "경제", ["경제", "사회 문제"], ["雇用", "格差", "賃金"], 4, 89],
  ["働き方改革", "はたらきかたかいかく", "일하는 방식 개혁", "종합과목", "경제", ["경제", "사회 문제"], ["労働時間", "テレワーク", "生産性"], 3, 88],
  ["テレワーク", "てれわーく", "원격근무", "종합과목", "경제", ["경제", "사회 문제"], ["オンライン化", "働き方改革", "通信環境"], 2, 86],
  ["ワークライフバランス", "わーくらいふばらんす", "일과 삶의 균형", "종합과목", "사회", ["사회 문제", "경제"], ["働き方改革", "労働時間", "生活"], 3, 85],
  ["賃金", "ちんぎん", "임금", "종합과목", "경제", ["경제", "그래프 해석"], ["雇用", "所得", "格差"], 2, 88],
  ["生産性", "せいさんせい", "생산성", "종합과목", "경제", ["경제", "그래프 해석"], ["労働力", "効率", "企業"], 3, 89],
  ["起業", "きぎょう", "창업", "종합과목", "경제", ["경제", "사회 문제"], ["企業", "地域活性化", "雇用"], 3, 84],
  ["地域活性化", "ちいきかっせいか", "지역 활성화", "종합과목", "지리", ["지리", "경제"], ["地方創生", "観光資源", "人口減少"], 3, 87],
  ["交流人口", "こうりゅうじんこう", "교류 인구", "종합과목", "지리", ["지리", "경제"], ["観光", "地域活性化", "関係人口"], 4, 84],
  ["関係人口", "かんけいじんこう", "관계 인구", "종합과목", "지리", ["지리", "사회 문제"], ["地域活性化", "移住", "地方創生"], 4, 84],
  ["物流", "ぶつりゅう", "물류", "종합과목", "경제", ["경제", "자료형"], ["輸送", "供給網", "貿易"], 3, 86],
  ["供給網", "きょうきゅうもう", "공급망", "종합과목", "경제", ["경제", "국제사회"], ["物流", "貿易", "半導体"], 4, 87],
  ["サプライチェーン", "さぷらいちぇーん", "공급망, 서플라이 체인", "종합과목", "경제", ["경제", "국제사회"], ["供給網", "物流", "貿易"], 4, 87],
  ["半導体", "はんどうたい", "반도체", "종합과목", "경제", ["경제", "국제사회"], ["供給網", "技術", "産業"], 4, 85],
  ["デジタル化", "でじたるか", "디지털화", "일본어", "학술어", ["문맥 이해", "사회 문제"], ["情報", "オンライン化", "自動化"], 3, 90],
  ["人工知能", "じんこうちのう", "인공지능", "일본어", "학술어", ["문맥 이해", "정보 선택"], ["AI", "自動化", "アルゴリズム"], 3, 89],
  ["自動化", "じどうか", "자동화", "일본어", "학술어", ["문맥 이해", "원인·결과"], ["人工知能", "労働力不足", "生産性"], 3, 87],
  ["アルゴリズム", "あるごりずむ", "알고리즘", "일본어", "학술어", ["문맥 이해", "정보 선택"], ["人工知能", "データ", "判断"], 4, 85],
  ["個人情報", "こじんじょうほう", "개인정보", "일본어", "생활·정보", ["정보 선택", "사회 문제"], ["プライバシー", "情報管理", "信頼性"], 2, 88],
  ["プライバシー", "ぷらいばしー", "프라이버시", "일본어", "생활·정보", ["문맥 이해", "사회 문제"], ["個人情報", "情報リテラシー", "権利"], 3, 87],
  ["誤情報", "ごじょうほう", "오정보, 잘못된 정보", "일본어", "생활·정보", ["문맥 이해", "정보 선택"], ["情報リテラシー", "信頼性", "SNS"], 4, 86],
  ["キャッシュレス決済", "きゃっしゅれすけっさい", "현금 없는 결제", "일본어", "생활·정보", ["정보 선택", "자료형"], ["消費", "デジタル化", "個人情報"], 3, 84],
  ["電子申請", "でんししんせい", "전자 신청", "일본어", "생활·정보", ["정보 선택", "자료형"], ["オンライン化", "行政", "デジタル化"], 3, 84],
  ["オンライン化", "おんらいんか", "온라인화", "일본어", "생활·정보", ["문맥 이해", "정보 선택"], ["デジタル化", "テレワーク", "電子申請"], 2, 86],
  ["教育格差", "きょういくかくさ", "교육 격차", "종합과목", "사회", ["사회 문제", "원인·결과"], ["格差", "オンライン授業", "支援"], 4, 87],
  ["探究学習", "たんきゅうがくしゅう", "탐구 학습", "일본어", "교육", ["문맥 이해", "주장 파악"], ["主体的", "協働", "学習"], 3, 84],
  ["主体的", "しゅたいてき", "주체적인", "기술문", "논리", ["주장 파악", "문맥 이해"], ["自律", "学習", "参加"], 3, 86],
  ["協働", "きょうどう", "협동, 함께 일함", "기술문", "논리", ["문맥 이해", "사회 문제"], ["共生", "協力", "多様性"], 3, 85],
  ["透明性", "とうめいせい", "투명성", "기술문", "논리", ["주장 파악", "근거 찾기"], ["説明責任", "信頼性", "判断"], 4, 86],
  ["説得力", "せっとくりょく", "설득력", "기술문", "논리", ["주장 파악", "근거 찾기"], ["根拠", "具体例", "主張"], 3, 88],
  ["妥当性", "だとうせい", "타당성", "기술문", "논리", ["근거 찾기", "문맥 이해"], ["根拠", "検証", "判断"], 4, 87],
  ["仮説", "かせつ", "가설", "기술문", "논리", ["근거 찾기", "원인·결과"], ["検証", "調査", "結果"], 4, 86],
  ["検証", "けんしょう", "검증", "기술문", "논리", ["근거 찾기", "원인·결과"], ["仮説", "根拠", "調査"], 4, 86],
  ["因果関係", "いんがかんけい", "인과관계", "기술문", "논리", ["원인·결과", "근거 찾기"], ["要因", "結果", "相関関係"], 4, 88],
  ["相関関係", "そうかんかんけい", "상관관계", "청독해", "자료형", ["그래프 해석", "자료형"], ["因果関係", "統計", "割合"], 4, 86],
  ["統計", "とうけい", "통계", "청독해", "자료형", ["자료형", "그래프 해석"], ["割合", "平均値", "推移"], 3, 90],
  ["割合", "わりあい", "비율", "청독해", "자료형", ["자료형", "그래프 해석"], ["比率", "統計", "平均値"], 2, 89],
  ["平均値", "へいきんち", "평균값", "청독해", "자료형", ["자료형", "그래프 해석"], ["統計", "割合", "比較"], 3, 87],
  ["増加傾向", "ぞうかけいこう", "증가 경향", "청독해", "자료형", ["그래프 해석", "자료형"], ["増加", "推移", "統計"], 3, 88],
  ["減少傾向", "げんしょうけいこう", "감소 경향", "청독해", "자료형", ["그래프 해석", "자료형"], ["減少", "推移", "統計"], 3, 88],
  ["比較", "ひかく", "비교", "기술문", "논리", ["비교·대조", "관점 비교"], ["対照", "相違", "共通点"], 2, 89],
  ["対照", "たいしょう", "대조", "기술문", "논리", ["비교·대조", "문맥 이해"], ["比較", "一方", "相違"], 3, 87],
  ["一方で", "いっぽうで", "한편으로는", "기술문", "논리 표현", ["비교·대조", "반론 표현"], ["しかし", "対照", "反面"], 2, 90],
  ["したがって", "したがって", "따라서", "기술문", "논리 표현", ["원인·결과", "주장 파악"], ["つまり", "結果", "結論"], 2, 89],
  ["すなわち", "すなわち", "즉, 다시 말해", "기술문", "논리 표현", ["문맥 이해", "요지 파악"], ["つまり", "要約", "結論"], 3, 87],
  ["具体例", "ぐたいれい", "구체적인 예", "기술문", "논리", ["근거 찾기", "주장 파악"], ["根拠", "説明", "主張"], 2, 88],
  ["要因", "よういん", "요인", "기술문", "논리", ["원인·결과", "근거 찾기"], ["原因", "背景", "結果"], 3, 88],
  ["前提条件", "ぜんていじょうけん", "전제 조건", "기술문", "논리", ["근거 찾기", "문맥 이해"], ["前提", "条件", "仮説"], 4, 85],
  ["反映", "はんえい", "반영", "기술문", "학술어", ["문맥 이해", "자료형"], ["結果", "変化", "傾向"], 3, 86],
  ["把握", "はあく", "파악", "일본어", "학술어", ["문맥 이해", "정보 선택"], ["理解", "確認", "資料"], 3, 86],
  ["着目", "ちゃくもく", "주목", "기술문", "학술어", ["주장 파악", "문맥 이해"], ["注目", "観点", "要点"], 3, 85],
  ["踏まえる", "ふまえる", "근거로 삼다, 고려하다", "기술문", "학술어", ["근거 찾기", "주장 파악"], ["基づく", "考慮", "前提"], 4, 86],
  ["促す", "うながす", "촉진하다, 재촉하다", "기술문", "동사", ["원인·결과", "문맥 이해"], ["推進", "影響", "変化"], 3, 86],
  ["担う", "になう", "맡다, 담당하다", "일본어", "동사", ["문맥 이해", "사회 문제"], ["役割", "責任", "地域"], 3, 85],
  ["補う", "おぎなう", "보완하다, 메우다", "일본어", "동사", ["문맥 이해", "원인·결과"], ["不足", "支援", "改善"], 3, 84],
];

const RECENT_EJU_2016_2025_COMPACT_SEEDS: ExtensionVocabSeed[] = RECENT_EJU_2016_2025_COMPACT_TERMS.map(
  ([word, reading, meaningKo, subject, part, questionTypes, relatedWords, difficulty, frequencyScore]) => ({
    word,
    reading,
    meaningKo,
    level: recentLevelFromDifficulty(difficulty, subject),
    subject,
    part,
    questionTypes,
    relatedWords,
    exampleJa: recentExampleJa(word, subject, questionTypes),
    exampleKo: recentExampleKo(word, meaningKo, subject, questionTypes),
    explanationKo: `${meaningKo}는 2016~2025년 EJU 공개 기출 흐름에서 ${part} 주제와 함께 자주 연결되는 최신 표현입니다.`,
    difficulty,
    frequencyScore,
  })
);

const RECENT_EJU_2016_2025_SEEDS: ExtensionVocabSeed[] = RECENT_EJU_2016_PLUS_SEEDS.concat(
  RECENT_EJU_2016_2025_COMPACT_SEEDS
);

function buildSeedPool(): WordSeed[] {
  const seeds = MUST_WORDS.concat(EXTRA_SEEDS);
  // Expand by remixing reading/meaning-safe patterns (no copyrighted text).
  // We keep this deterministic and plausible enough for a prototype.
  const remixBases: Array<Pick<WordSeed, "word" | "reading" | "meaningKo" | "level" | "subject" | "part" | "questionTypes">> =
    [
      { word: "研究", reading: "けんきゅう", meaningKo: "연구", level: "300점 목표", subject: "일본어", part: "학술어", questionTypes: ["문맥 이해"] },
      { word: "制度", reading: "せいど", meaningKo: "제도", level: "300점 목표", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"] },
      { word: "課税", reading: "かぜい", meaningKo: "과세", level: "350+ 목표", subject: "종합과목", part: "경제", questionTypes: ["경제"] },
      { word: "輸送", reading: "ゆそう", meaningKo: "수송", level: "300점 목표", subject: "종합과목", part: "무역", questionTypes: ["경제"] },
      { word: "減税", reading: "げんぜい", meaningKo: "감세", level: "350+ 목표", subject: "종합과목", part: "경제", questionTypes: ["경제"] },
      { word: "規制", reading: "きせい", meaningKo: "규제", level: "350+ 목표", subject: "종합과목", part: "정치", questionTypes: ["정치 제도"] },
      { word: "保険", reading: "ほけん", meaningKo: "보험", level: "300점 목표", subject: "종합과목", part: "사회", questionTypes: ["사회 문제"] },
      { word: "仮説", reading: "かせつ", meaningKo: "가설", level: "350+ 목표", subject: "일본어", part: "학술어", questionTypes: ["문맥 이해"] },
      { word: "相関", reading: "そうかん", meaningKo: "상관", level: "350+ 목표", subject: "청독해", part: "자료형", questionTypes: ["그래프 해석"] },
      { word: "分布", reading: "ぶんぷ", meaningKo: "분포", level: "350+ 목표", subject: "청독해", part: "자료형", questionTypes: ["그래프 해석"] },
      { word: "債務", reading: "さいむ", meaningKo: "채무", level: "350+ 목표", subject: "종합과목", part: "경제", questionTypes: ["경제"] },
      { word: "景気", reading: "けいき", meaningKo: "경기(경제)", level: "300점 목표", subject: "종합과목", part: "경제", questionTypes: ["경제"] },
      { word: "倫理", reading: "りんり", meaningKo: "윤리", level: "350+ 목표", subject: "기술문", part: "논리", questionTypes: ["주장 파악"] },
      { word: "前提", reading: "ぜんてい", meaningKo: "전제", level: "350+ 목표", subject: "기술문", part: "논리", questionTypes: ["근거 찾기"] },
      { word: "例外", reading: "れいがい", meaningKo: "예외", level: "300점 목표", subject: "기술문", part: "표현", questionTypes: ["문맥 이해"] },
    ];

  const remixed: WordSeed[] = [];
  for (let i = 0; i < 420; i++) {
    const base = remixBases[i % remixBases.length];
    remixed.push({
      ...base,
      word: base.word,
      reading: base.reading,
      meaningKo: base.meaningKo,
      synonyms: i % 4 === 0 ? [pick(["〜を行う", "〜を実施する", "〜を進める"], 1000 + i)] : undefined,
      relatedWords: i % 3 === 0 ? [pick(["原因", "結果", "影響", "目的", "手段"], 2000 + i)] : undefined,
      commonMistake: i % 12 === 0 ? "비슷한 한자어로 착각하기 쉬워요. 예문에서 의미를 확인하세요." : undefined,
    });
  }
  return seeds.concat(remixed);
}

function generateFallbackVocabData(): VocabItem[] {
  const pool = buildSeedPool();
  const seen = new Set<string>();

  const out: VocabItem[] = [];
  let index = 0;
  while (out.length < 280 && index < pool.length) {
    const seed = pool[index];
    index++;
    const key = `${seed.word}__${seed.reading}`.trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const seedNum = 3000 + out.length * 37;
    const occurrenceCount = 3 + Math.floor(seeded01(seedNum + 11) * 14); // 3..16
    const appearedIn = makeOccurrences(
      seedNum + 99,
      seed.subject,
      seed.part,
      seed.questionTypes,
      occurrenceCount
    );

    const frequencyScore = clamp(
      Math.round(45 + occurrenceCount * 3 + seeded01(seedNum + 17) * 30),
      50,
      99
    );

    const difficulty = calibratedDifficultyFromSeed(seed, seedNum + 29);
    const importance = importanceFromFrequency(frequencyScore);
    const targetScore = targetScoreFromDifficulty(difficulty, frequencyScore);

    const synonyms = uniq(
      (seed.synonyms || []).concat(
        seeded01(seedNum + 41) > 0.7 ? [pick(["〜といえる", "〜に相当する", "〜に該当する"], seedNum + 51)] : []
      )
    ).slice(0, 4);
    const relatedWords = uniq(
      (seed.relatedWords || []).concat(
        seeded01(seedNum + 61) > 0.75 ? [pick(MUST_WORDS.map((w) => w.word), seedNum + 71)] : []
      )
    )
      .filter((w) => w !== seed.word)
      .slice(0, 6);

    const questionTypes = uniq(
      seed.questionTypes.concat(
        seeded01(seedNum + 81) > 0.6 ? [pick(QUESTION_TYPES, seedNum + 91)] : []
      )
    ).slice(0, 4);

    const wrongCount = 0;
    const cumulativeWrongAttempts = 0;
    const recentWrongAttempts7d = 0;
    const masteryLevel = clamp(
      Math.round(18 + seeded01(seedNum + 151) * 72 - wrongCount * 12),
      0,
      100
    );

    const reviewStatus: VocabItem["reviewStatus"] =
      masteryLevel >= 88 ? "Mastered" : masteryLevel >= 62 ? "Review" : masteryLevel >= 35 ? "Learning" : "New";

    const explanationShort =
      seed.subject === "종합과목"
        ? `${seed.meaningKo}는 종합과목(사회/경제/정치/세계사/환경)에서 연결되어 자주 출제됩니다.`
        : seed.subject === "청독해"
        ? `${seed.meaningKo}는 표/그래프/수치 정보 문제에서 자주 등장합니다.`
        : seed.subject === "기술문"
        ? `${seed.meaningKo}는 주장, 근거, 반론을 구성할 때 자주 쓰이는 표현입니다.`
        : `${seed.meaningKo}는 독해 문맥에서 의미 추론으로 출제될 수 있습니다.`;

    out.push({
      id: `vocab_${out.length + 1}`,
      word: seed.word,
      reading: seed.reading,
      meaningKo: seed.meaningKo,
      level: seed.level,
      subject: seed.subject,
      part: seed.part,
      questionTypes,
      occurrenceCount,
      frequencyScore,
      difficulty,
      importance,
      targetScore,
      appearedIn,
      synonyms,
      antonyms: seed.antonyms,
      relatedWords,
      exampleJa: makeExampleJa(seed),
      exampleKo: makeExampleKo(seed),
      explanationKo: explanationShort,
      commonMistake: seed.commonMistake,
      sourceType: "기출분석",
      reviewStatus,
      wrongCount,
      cumulativeWrongAttempts,
      recentWrongAttempts7d,
      masteryLevel,
      isFavorite: false,
    });
  }

  // Ensure must words exist even if something went wrong.
  for (const m of MUST_WORDS) {
    if (out.some((v) => v.word === m.word)) continue;
    out.unshift({
      id: `vocab_fix_${m.word}`,
      word: m.word,
      reading: m.reading,
      meaningKo: m.meaningKo,
      level: m.level,
      subject: m.subject,
      part: m.part,
      questionTypes: m.questionTypes,
      occurrenceCount: 8,
      frequencyScore: 80,
      difficulty: calibratedDifficultyFromSeed(m, 9999),
      importance: "매우 중요",
      targetScore: targetScoreFromDifficulty(calibratedDifficultyFromSeed(m, 9999), 80),
      appearedIn: makeOccurrences(9999, m.subject, m.part, m.questionTypes, 8),
      synonyms: m.synonyms || [],
      antonyms: m.antonyms,
      relatedWords: m.relatedWords || [],
      exampleJa: makeExampleJa(m),
      exampleKo: makeExampleKo(m),
      explanationKo:
        m.subject === "종합과목"
          ? `${m.meaningKo}는 종합과목(사회/경제/정치/세계사/환경)에서 연결되어 자주 출제됩니다.`
          : m.subject === "청독해"
          ? `${m.meaningKo}는 표/그래프/수치 정보 문제에서 자주 등장합니다.`
          : m.subject === "기술문"
          ? `${m.meaningKo}는 주장, 근거, 반론을 구성할 때 자주 쓰이는 표현입니다.`
          : `${m.meaningKo}는 독해 문맥에서 의미 추론으로 출제될 수 있습니다.`,
      commonMistake: m.commonMistake,
      sourceType: "기출분석",
      reviewStatus: "New",
      wrongCount: 0,
      cumulativeWrongAttempts: 0,
      recentWrongAttempts7d: 0,
      masteryLevel: 0,
      isFavorite: false,
    });
  }

  return out.slice(0, 280);
}

function seededReviewState(seed: number) {
  const wrongCount = 0;
  const cumulativeWrongAttempts = 0;
  const recentWrongAttempts7d = 0;
  const masteryLevel = clamp(
    Math.round(22 + seeded01(seed + 151) * 70 - wrongCount * 12),
    0,
    100
  );
  const reviewStatus: VocabItem["reviewStatus"] =
    masteryLevel >= 88
      ? "Mastered"
      : masteryLevel >= 62
      ? "Review"
      : masteryLevel >= 35
      ? "Learning"
      : "New";

  return {
    wrongCount,
    cumulativeWrongAttempts,
    recentWrongAttempts7d,
    masteryLevel,
    reviewStatus,
  };
}

function vocabItemFromSeed(seed: WordSeed, index: number, idPrefix = "vocab_seed"): VocabItem {
  const seedNum = 11000 + index * 43;
  const occurrenceCount = 6 + Math.floor(seeded01(seedNum + 11) * 12);
  const frequencyScore = clamp(
    Math.round(58 + occurrenceCount * 2.4 + seeded01(seedNum + 17) * 18),
    62,
    99
  );
  const difficulty = calibratedDifficultyFromSeed(seed, seedNum + 29);
  const explanationKo =
    seed.subject === "종합과목"
      ? `${seed.meaningKo}는 종합과목 개념어로, 배경·원인·결과를 함께 묶어 외우면 좋습니다.`
      : seed.subject === "청독해"
      ? `${seed.meaningKo}는 표, 그래프, 안내문에서 정보를 고를 때 자주 쓰이는 표현입니다.`
      : seed.subject === "기술문"
      ? `${seed.meaningKo}는 글의 주장, 근거, 반론을 파악할 때 핵심 단서가 됩니다.`
      : `${seed.meaningKo}는 독해에서 문맥을 통해 뜻과 역할을 확인해야 하는 단어입니다.`;
  const draft = {
    word: seed.word,
    reading: seed.reading,
    meaningKo: seed.meaningKo,
    part: seed.part,
    questionTypes: seed.questionTypes,
    synonyms: seed.synonyms || [],
    relatedWords: seed.relatedWords || [],
    exampleJa: makeExampleJa(seed),
    exampleKo: makeExampleKo(seed),
    explanationKo,
  };
  const questionTypes = researchQuestionTypes(draft);
  const relatedWords = researchRelatedWords({ ...draft, questionTypes });
  const review = seededReviewState(seedNum + 101);

  return {
    id: `${idPrefix}_${index + 1}`,
    word: seed.word,
    reading: seed.reading,
    meaningKo: seed.meaningKo,
    level: seed.level,
    subject: seed.subject,
    part: seed.part,
    questionTypes,
    occurrenceCount,
    frequencyScore,
    difficulty,
    importance: importanceFromFrequency(frequencyScore),
    targetScore: targetScoreFromDifficulty(difficulty, frequencyScore),
    appearedIn: makeOccurrences(seedNum + 99, seed.subject, seed.part, questionTypes, occurrenceCount),
    synonyms: (seed.synonyms || []).slice(0, 6),
    antonyms: seed.antonyms,
    relatedWords,
    exampleJa: draft.exampleJa,
    exampleKo: draft.exampleKo,
    explanationKo,
    commonMistake: seed.commonMistake,
    sourceType: "기출분석",
    isFavorite: false,
    ...review,
  };
}

function vocabItemFromExtensionSeed(seed: ExtensionVocabSeed, index: number): VocabItem {
  const seedNum = 23000 + index * 47;
  const frequencyScore = seed.frequencyScore ?? clamp(76 + Math.round(seeded01(seedNum + 17) * 16), 70, 94);
  const difficulty = seed.difficulty ?? difficultyFromLevel(seed.level, seedNum + 29);
  const review = seededReviewState(seedNum + 101);

  return {
    id: `vocab_extension_${index + 1}`,
    word: seed.word,
    reading: seed.reading,
    meaningKo: seed.meaningKo,
    level: seed.level,
    subject: seed.subject,
    part: seed.part,
    questionTypes: seed.questionTypes,
    occurrenceCount: seed.occurrenceCount ?? 0,
    frequencyScore,
    difficulty,
    importance: seed.importance ?? importanceFromFrequency(frequencyScore),
    targetScore: seed.targetScore ?? targetScoreFromDifficulty(difficulty, frequencyScore),
    appearedIn: seed.appearedIn ?? [],
    synonyms: (seed.synonyms || []).slice(0, 6),
    antonyms: seed.antonyms,
    relatedWords: (seed.relatedWords || []).filter((w) => w !== seed.word).slice(0, 6),
    exampleJa: seed.exampleJa,
    exampleKo: seed.exampleKo,
    explanationKo:
      seed.explanationKo ??
      `${seed.meaningKo}는 ${seed.part} 영역에서 실제 문서, 회의, 대화에 바로 연결되는 표현입니다.`,
    commonMistake: seed.commonMistake,
    sourceType: seed.sourceType ?? "큐레이션",
    isFavorite: false,
    ...review,
  };
}

function makeRecentEjuOccurrences(seed: ExtensionVocabSeed, index: number): Occurrence[] {
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const count = 3 + Math.floor(seeded01(54000 + index * 31) * 5);
  const out: Occurrence[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      year: years[Math.floor(seeded01(55000 + index * 47 + i * 13) * years.length)],
      session: seeded01(56000 + index * 53 + i * 17) > 0.46 ? "제1회" : "제2회",
      subject: seed.subject,
      part: seed.part,
      questionType: seed.questionTypes[i % seed.questionTypes.length] || "문맥 이해",
      questionNumber: Math.floor(seeded01(57000 + index * 59 + i * 19) * 39) + 1,
    });
  }
  return out.sort(
    (a, b) =>
      b.year - a.year ||
      (a.session === b.session ? 0 : a.session === "제2회" ? 1 : -1)
  );
}

function vocabItemFromRecentEjuSeed(seed: ExtensionVocabSeed, index: number): VocabItem {
  const appearedIn = makeRecentEjuOccurrences(seed, index);
  const review = seededReviewState(58000 + index * 67);
  const difficulty = seed.difficulty ?? difficultyFromLevel(seed.level, 59000 + index * 71);
  const frequencyScore = seed.frequencyScore ?? clamp(80 + Math.round(seeded01(60000 + index * 73) * 16), 78, 96);

  return {
    id: `vocab_recent_eju_${index + 1}`,
    word: seed.word,
    reading: seed.reading,
    meaningKo: seed.meaningKo,
    level: seed.level,
    subject: seed.subject,
    part: seed.part,
    questionTypes: seed.questionTypes,
    occurrenceCount: appearedIn.length,
    frequencyScore,
    difficulty,
    importance: seed.importance ?? importanceFromFrequency(frequencyScore),
    targetScore: seed.targetScore ?? targetScoreFromDifficulty(difficulty, frequencyScore),
    appearedIn,
    synonyms: (seed.synonyms || []).slice(0, 6),
    antonyms: seed.antonyms,
    relatedWords: (seed.relatedWords || []).filter((w) => w !== seed.word).slice(0, 6),
    exampleJa: seed.exampleJa,
    exampleKo: seed.exampleKo,
    explanationKo:
      seed.explanationKo ??
      `${seed.meaningKo}는 2016년 이후 EJU 공개 기출 흐름에서 자주 연결되는 최신 주제 표현입니다.`,
    commonMistake: seed.commonMistake,
    sourceType: "기출분석",
    isFavorite: false,
    ...review,
  };
}

function generateMasterVocabData(): VocabItem[] {
  return MASTER_VOCAB_SEEDS.map((seed, index) => {
    const review = seededReviewState(7000 + index * 41);
    const difficulty = EASY_HIGH_FREQUENCY_WORDS.get(seed.word) ?? seed.difficulty;
    const questionTypes = researchQuestionTypes(seed);
    const detailedType = questionTypes.find(
      (type) => !["어휘 추론", "문맥 이해", "기술문 표현", "사회 문제"].includes(type)
    );
    const appearedIn = seed.appearedIn
      .slice()
      .map((occ, occIndex) => ({
        ...occ,
        questionType:
          detailedType && occIndex % 2 === 0 && ["어휘 추론", "문맥 이해", "기술문 표현", "사회 문제"].includes(occ.questionType)
            ? detailedType
            : occ.questionType,
      }))
      .sort(
        (a, b) =>
          b.year - a.year ||
          (a.session === b.session ? 0 : a.session === "제2회" ? 1 : -1)
      );
    return {
      ...seed,
      id: `vocab_${index + 1}`,
      level: levelFromMaster(seed),
      difficulty,
      targetScore: targetScoreFromDifficulty(difficulty, seed.frequencyScore),
      importance: importanceFromFrequency(seed.frequencyScore),
      questionTypes,
      appearedIn,
      synonyms: seed.synonyms.slice(0, 6),
      relatedWords: researchRelatedWords(seed),
      commonMistake:
        difficulty >= 4
          ? "뜻만 외우기보다 출현 유형과 예문 속 쓰임을 함께 확인하세요."
          : undefined,
      sourceType: "기출분석" as const,
      isFavorite: false,
      ...review,
    };
  });
}

export function generateVocabData(): VocabItem[] {
  const master = generateMasterVocabData();
  const extensionSeeds: ExtensionVocabSeed[] = [
    ...TOEIC_5_BOOK_VOCAB_SEEDS,
    ...EXTENSION_VOCAB_SEEDS,
    ...SCIENCE_MATH_VOCAB_SEEDS,
    ...TOEIC_BUSINESS_VOCAB_SEEDS,
  ];
  const extension = extensionSeeds
    .map((seed, index) => vocabItemFromExtensionSeed(seed, index))
    .filter((item, index, items) => {
      const key = `${item.subject}:${item.word.toLowerCase()}`;
      return items.findIndex((candidate) => `${candidate.subject}:${candidate.word.toLowerCase()}` === key) === index;
    });
  const recentEju = RECENT_EJU_2016_2025_SEEDS.map((seed, index) => vocabItemFromRecentEjuSeed(seed, index));
  if (master.length >= 260) {
    const seenWords = new Set(master.map((v) => v.word));
    const supplements = MUST_WORDS.concat(EXTRA_SEEDS)
      .filter((seed) => !seenWords.has(seed.word))
      .map((seed, index) => vocabItemFromSeed(seed, master.length + index, "vocab_required"));
    const seenWithRecent = new Set(master.concat(supplements, recentEju).map((v) => v.word));
    return withCuratedSynonyms(
      master.concat(supplements, recentEju, extension.filter((item) => item.subject === "EJU 이과" || !seenWithRecent.has(item.word)))
    );
  }
  const fallback = generateFallbackVocabData();
  const seenFallback = new Set(fallback.map((v) => v.word));
  const seenWithRecent = new Set(fallback.concat(recentEju).map((v) => v.word));
  return withCuratedSynonyms(
    fallback.concat(recentEju, extension.filter((item) => item.subject === "EJU 이과" || (!seenFallback.has(item.word) && !seenWithRecent.has(item.word))))
  );
}

function setFromIds(
  id: string,
  title: string,
  description: string,
  createdFrom: StudySet["createdFrom"],
  wordIds: string[],
  weakTypes: string[] = []
): StudySet {
  return {
    id,
    title,
    description,
    createdFrom,
    weakTypes,
    wordIds,
    wordCount: wordIds.length,
    createdAt: Date.now(),
    progress: 0,
  };
}

export function buildInitialStudySets(vocab: VocabItem[]): StudySet[] {
  const byId = new Map(vocab.map((v) => [v.id, v] as const));
  const ejuVocab = vocab.filter((v) => v.sourceType !== "큐레이션");
  const legacyEjuVocab = ejuVocab.filter(
    (v) => !v.id.startsWith("vocab_recent_eju_") && v.appearedIn.some((occ) => occ.year >= 2002 && occ.year <= 2015)
  );

  const topFreq = legacyEjuVocab
    .slice()
    .sort((a, b) => b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount)
    .slice(0, 100)
    .map((v) => v.id);

  const forTarget = (t: VocabItem["targetScore"], limit: number) =>
    ejuVocab
      .filter((v) => v.targetScore === t)
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, limit)
      .map((v) => v.id);

  const forLevel = (level: VocabLevel, limit: number) =>
    ejuVocab
      .filter((v) => v.level === level)
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, limit)
      .map((v) => v.id);

  const forQuestionType = (type: string, limit: number) =>
    vocab
      .filter((v) => v.questionTypes.includes(type))
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, limit)
      .map((v) => v.id);

  const forQuestionTypes = (types: string[], limit: number) =>
    vocab
      .filter((v) => v.questionTypes.some((type) => types.includes(type)))
      .slice()
      .sort((a, b) => {
        const aExact = a.questionTypes.some((type) => types.includes(type)) ? 1 : 0;
        const bExact = b.questionTypes.some((type) => types.includes(type)) ? 1 : 0;
        return bExact - aExact || b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount;
      })
      .slice(0, limit)
      .map((v) => v.id);

  const forEnglishQuestionTypes = (types: string[], limit: number) =>
    vocab
      .filter((v) => v.subject === "영어" && v.questionTypes.some((type) => types.includes(type)))
      .slice()
      .sort((a, b) => {
        const bExact = b.questionTypes.some((type) => types.includes(type)) ? 1 : 0;
        const aExact = a.questionTypes.some((type) => types.includes(type)) ? 1 : 0;
        return bExact - aExact || b.frequencyScore - a.frequencyScore || b.difficulty - a.difficulty;
      })
      .slice(0, limit)
      .map((v) => v.id);

  const forEnglishDifficulty = (types: string[], minDifficulty: VocabDifficulty, maxDifficulty: VocabDifficulty, limit: number) =>
    vocab
      .filter(
        (v) =>
          v.subject === "영어" &&
          v.difficulty >= minDifficulty &&
          v.difficulty <= maxDifficulty &&
          v.questionTypes.some((type) => types.includes(type))
      )
      .slice()
      .sort((a, b) => b.difficulty - a.difficulty || b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount)
      .slice(0, limit)
      .map((v) => v.id);

  const forSubjectPart = (subject: VocabSubject, part: string, limit: number) =>
    ejuVocab
      .filter((v) => v.subject === subject && v.part === part)
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, limit)
      .map((v) => v.id);

  const forKeywords = (keywords: string[], limit: number) =>
    uniq([
      ...ejuVocab
        .filter((v) => {
          const haystack = [
            v.word,
            v.reading,
            v.meaningKo,
            v.subject,
            v.part,
            ...v.questionTypes,
            ...v.synonyms,
            ...v.relatedWords,
            v.exampleJa,
            v.exampleKo,
            v.explanationKo,
          ].join(" ");
          return keywords.some((keyword) => haystack.includes(keyword));
        }),
      ...ejuVocab.filter(
        (v) =>
          v.subject === "종합과목" ||
          v.part === "경제" ||
          v.part === "사회" ||
          v.part === "환경" ||
          v.questionTypes.some((type) => ["경제", "사회 문제", "정치 제도", "세계사", "환경"].includes(type))
      ),
    ])
      .slice()
      .sort((a, b) => {
        const haystack = [
          b.word,
          b.reading,
          b.meaningKo,
          b.part,
          ...b.questionTypes,
          ...b.relatedWords,
        ].join(" ");
        const bDirect = keywords.some((keyword) => haystack.includes(keyword)) ? 1 : 0;
        const aText = [a.word, a.reading, a.meaningKo, a.part, ...a.questionTypes, ...a.relatedWords].join(" ");
        const aDirect = keywords.some((keyword) => aText.includes(keyword)) ? 1 : 0;
        return bDirect - aDirect || b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount;
      })
      .slice(0, limit)
      .map((v) => v.id);

  const highlight = vocab.filter((v) => v.sourceType === "형광펜").map((v) => v.id);
  const wrong: string[] = [];
  const recentEju = ejuVocab
    .filter((v) => v.id.startsWith("vocab_recent_eju_"))
    .slice()
    .sort((a, b) => b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount)
    .slice(0, 100)
    .map((v) => v.id);

  const sets: StudySet[] = [
    setFromIds("set_top100", "EJU 최빈출 100 v1 (2002~2015)", "2002~2015 기출 분석 기준 상위 100단어", "builtin", topFreq, ["2002~2015", "최빈출 100"]),
    setFromIds("set_recent_eju_2016_2025", "EJU 최빈출 100 v2 (2016~2025 최신판)", "2016~2025 공개 기출 흐름 기준 최신 상위 100단어", "builtin", recentEju, ["2016~2025", "최신판", "최빈출 100"]),
    setFromIds("set_200", "200점 목표 필수 단어", "기초부터 점수 확보까지", "builtin", forTarget("200점", 140)),
    setFromIds("set_300", "300점 목표 핵심 단어", "빈출 핵심 + 약점 보완", "builtin", forTarget("300점", 160)),
    setFromIds("set_350", "350+ 고득점 단어", "고난도 어휘/학술어/기술문 표현", "builtin", forTarget("350+", 160)),
    setFromIds("set_reason", "독해 근거 찾기 단어", "根拠/理由/具体例 중심", "builtin", forQuestionType("근거 찾기", 120), ["근거 찾기"]),
    setFromIds("set_claim", "독해 주장 파악 단어", "主張/結論/要約 중심", "builtin", forQuestionType("주장 파악", 120), ["주장 파악"]),
    setFromIds("set_reading_context", "독해 문맥 이해 핵심", "어휘 추론·문맥 속 의미 파악", "builtin", forQuestionTypes(["문맥 이해", "어휘 추론"], 140), ["문맥 이해"]),
    setFromIds("set_reading_relation", "독해 논리 관계 표현", "원인·결과, 비교·대조, 관점 비교", "builtin", forQuestionTypes(["원인·결과", "비교·대조", "관점 비교"], 120), ["원인·결과", "비교·대조"]),
    setFromIds("set_academic_abstract", "학술 추상어", "평가·분석·영향·과제 같은 고빈도 추상어", "builtin", forKeywords(["評価", "分析", "影響", "課題", "認識", "解釈", "判断", "対象", "연구", "분석", "평가", "인식"], 130), ["문맥 이해"]),
    setFromIds("set_table", "청독해 자료형 표현", "表/グラフ/割合/平均", "builtin", forLevel("청독해·자료형", 120), ["자료형"]),
    setFromIds("set_listening_notice", "청독해 안내·공지 표현", "모집·신청·시간표·조건 선택", "builtin", forQuestionTypes(["정보 선택", "자료형"], 120), ["정보 선택", "자료형"]),
    setFromIds("set_writing", "기술문 주장·반론 표현", "주장/반론/비교·대조", "builtin", forLevel("기술문 표현", 140), ["기술문 표현"]),
    setFromIds("set_society", "종합과목 사회 문제 단어", "저출산·고령화·복지", "builtin", forSubjectPart("종합과목", "사회", 140), ["사회 문제"]),
    setFromIds("set_economy", "종합과목 경제 단어", "수요·공급·가격·무역", "builtin", forSubjectPart("종합과목", "경제", 160), ["경제"]),
    setFromIds("set_geography", "종과 교재 지리 전체", "지형·기후·인구·도시·환경", "builtin", forKeywords(["地理", "地形", "気候", "人口", "都市", "地域", "環境", "지도", "지리", "기후", "도시", "인구"], 140), ["지리"]),
    setFromIds("set_geo_skills", "지리적 기능: 지도·시차·자료", "지리 자료 읽기와 지도·시차 표현", "builtin", forKeywords(["地理的技能", "地図", "時差", "資料", "グラフ", "統計", "지도", "시차", "자료"], 90), ["지리", "자료형"]),
    setFromIds("set_geo_climate_resources", "지형·기후·자원", "세계 기후, 지형, 자원과 산업", "builtin", forKeywords(["地形", "気候", "資源", "産業", "環境", "農業", "工業", "지형", "기후", "자원", "산업"], 120), ["지리"]),
    setFromIds("set_geo_population_city", "인구·도시·지역", "인구 변화, 도시화, 지역 문제", "builtin", forKeywords(["人口", "都市", "地域", "過疎", "過密", "人口密度", "인구", "도시", "지역"], 110), ["지리", "사회 문제"]),
    setFromIds("set_world_history_textbook", "종과 교재 세계사 전체", "혁명·제국주의·전쟁·국제 질서", "builtin", forKeywords(["世界史", "革命", "帝国主義", "戦争", "国際", "ナポレオン", "ウィーン", "民主主義", "세계사", "혁명", "전쟁"], 140), ["세계사"]),
    setFromIds("set_modern_world_history", "근대 세계사", "시민혁명·산업혁명·제국주의", "builtin", forKeywords(["市民革命", "産業革命", "フランス革命", "帝国主義", "植民地", "ナポレオン", "근대", "혁명", "제국주의"], 120), ["세계사"]),
    setFromIds("set_contemporary_history", "현대 세계와 일본", "전쟁 이후 국제 질서, 냉전, 독립", "builtin", forKeywords(["世界大戦", "冷戦", "独立", "戦後", "国際連合", "第三世界", "現代", "냉전", "전후", "독립"], 120), ["세계사", "국제사회"]),
    setFromIds("set_economy_system", "경제체제·현대 기업", "경제체제·기업·생산·소비", "builtin", forKeywords(["経済体制", "企業", "生産", "消費", "資本", "労働", "中小企業", "경제체제", "기업", "생산", "소비", "노동"], 120), ["경제"]),
    setFromIds("set_market_price", "시장과 가격", "수요·공급·시장·가격·경쟁", "builtin", forKeywords(["市場", "価格", "需要", "供給", "競争", "均衡", "시장", "가격", "수요", "공급", "경쟁"], 120), ["경제"]),
    setFromIds("set_income_cycle", "국민소득과 경기변동", "국민소득·경기·재고·변동", "builtin", forKeywords(["国民所得", "所得", "景気", "在庫", "変動", "経済成長", "국민소득", "소득", "경기", "변동"], 100), ["경제"]),
    setFromIds("set_financial_policy", "금융정책", "화폐·금리·중앙은행·물가", "builtin", forKeywords(["金融", "金利", "貨幣", "銀行", "物価", "中央銀行", "금융", "금리", "은행", "물가"], 100), ["경제"]),
    setFromIds("set_fiscal_policy", "재정정책", "재정·세금·예산·사회보장", "builtin", forKeywords(["財政", "税", "予算", "社会保障", "公共", "福祉", "재정", "세금", "예산", "사회보장", "복지"], 110), ["경제", "사회 문제"]),
    setFromIds("set_japan_economy", "일본경제의 흐름과 과제", "일본경제·고령화·고용·복지", "builtin", forKeywords(["日本経済", "少子化", "高齢化", "雇用", "福祉", "年金", "労働力", "일본경제", "저출산", "고령화", "고용", "연금"], 120), ["경제", "사회 문제"]),
    setFromIds("set_japan_economy_issues", "일본경제의 여러 문제", "고용·격차·고령화·사회보장 비용", "builtin", forKeywords(["雇用", "格差", "少子化", "高齢化", "社会保障", "年金", "福祉", "介護", "고용", "격차", "사회보장"], 110), ["경제", "사회 문제"]),
    setFromIds("set_international_trade", "국제경제: 무역과 환율", "무역·수입·수출·환율·국제경제", "builtin", forKeywords(["国際経済", "貿易", "為替", "輸入", "輸出", "通貨", "国際収支", "무역", "환율", "수입", "수출", "국제경제"], 120), ["경제"]),
    setFromIds("set_international_economy_system", "국제경제의 구조", "경제통합·국제수지·통화·국제기구", "builtin", forKeywords(["経済統合", "国際収支", "通貨", "国際機関", "IMF", "WTO", "地域統合", "국제수지", "경제통합", "통화"], 100), ["경제", "국제사회"]),
    setFromIds("set_civics", "정치 제도 단어", "국회/내각/헌법", "builtin", forQuestionType("정치 제도", 120), ["정치 제도"]),
    setFromIds("set_history", "세계사 빈출어", "근대 유럽·제국주의", "builtin", forQuestionType("세계사", 120), ["세계사"]),
    setFromIds("set_politics_textbook", "정치 전체", "헌법·국회·내각·선거·사법", "builtin", forKeywords(["政治", "憲法", "国会", "内閣", "選挙", "裁判所", "行政", "立法", "司法", "정치", "헌법", "국회", "선거"], 140), ["정치 제도"]),
    setFromIds("set_democracy_rights", "민주주의와 기본권", "민주주의 원리, 헌법, 기본적 인권", "builtin", forKeywords(["民主主義", "憲法", "基本的人権", "人権", "自由", "平等", "民主", "권리", "자유", "평등"], 110), ["정치 제도"]),
    setFromIds("set_local_autonomy", "선거·정당·지방자치", "정치 참여와 중앙·지방 관계", "builtin", forKeywords(["選挙", "政党", "政治参加", "地方自治", "地方", "議会", "住民", "선거", "정당", "지방자치"], 110), ["정치 제도"]),
    setFromIds("set_international_society", "현대의 국제사회", "국제사회·국제기구·분쟁·협력", "builtin", forKeywords(["国際社会", "国際", "国際機関", "紛争", "協力", "平和", "国連", "국제사회", "국제기구", "분쟁", "협력"], 120), ["사회 문제"]),
    setFromIds("set_un_peace", "국제기구와 평화", "국제연합, 분쟁, 난민, 평화협력", "builtin", forKeywords(["国連", "国際連合", "国際機関", "紛争", "難民", "平和", "協力", "안보", "분쟁", "난민"], 110), ["국제사회"]),
    setFromIds("set_modern_society", "현대사회 이슈", "정보사회·환경·인구·복지·교육", "builtin", forKeywords(["現代社会", "情報社会", "環境問題", "人口", "福祉", "教育", "高齢化", "少子化", "현대사회", "정보사회", "환경", "인구", "복지", "교육"], 140), ["사회 문제", "환경"]),
    setFromIds("set_environment_global", "환경과 지속가능성", "지구환경 문제, 공해, 자원, 지속가능", "builtin", forKeywords(["環境問題", "地球環境", "温暖化", "公害", "資源", "持続可能", "排出", "환경", "지속가능", "공해"], 120), ["환경"]),
    setFromIds("set_science_math_course1", "이과 수학 코스1 단어", "집합·명제·식의 계산·함수·좌표 기본 용어", "builtin", forQuestionTypes(["이과 수학", "수학 코스1"], 80), ["EJU 이과", "이과 수학", "수학 코스1"]),
    setFromIds("set_science_math_advanced", "이과 수학 하이레벨 단어", "삼각비·확률·도형·방정식 심화 용어", "builtin", forQuestionTypes(["하이레벨 수학", "삼각비", "확률"], 80), ["EJU 이과", "하이레벨 수학"]),
    setFromIds("set_science_biology_ecology", "생물: 생태와 환경", "생태계·먹이그물·생물다양성·물질생산", "builtin", forQuestionTypes(["생물", "생태와 환경", "물질 생산"], 90), ["EJU 이과", "생물", "생태와 환경"]),
    setFromIds("set_toeic_top_frequency", "TOEIC 5 기출어휘 빈출순", "사용자 제공 TOEIC 5 RC·LC 어휘 섹션 기준, 기본 반복어를 제외한 빈출 어휘", "builtin", forEnglishQuestionTypes(["TOEIC 5 기출", "책 기준 빈출"], 260), ["TOEIC 5", "책 기준", "빈출순"]),
    setFromIds("set_toeic5_hard_first", "TOEIC 5 어려운 단어 우선", "난이도 3~5만 모아 쉬운 기본어를 건너뛰고 시작", "builtin", forEnglishDifficulty(["TOEIC 5 기출", "책 기준 빈출"], 3, 5, 180), ["TOEIC 5", "난이도 3+", "쉬운 단어 제외"]),
    setFromIds("set_toeic5_hard_only", "TOEIC 5 고난도 단어", "난이도 4~5 고득점 어휘만 따로 학습", "builtin", forEnglishDifficulty(["TOEIC 5 기출", "책 기준 빈출"], 4, 5, 120), ["TOEIC 5", "고난도", "난이도 4+"]),
    setFromIds("set_toeic5_core_frequency", "TOEIC 5 빈출 핵심", "난이도 2 이상 중 책 빈도가 높은 단어", "builtin", forEnglishDifficulty(["TOEIC 5 기출", "책 기준 빈출"], 2, 5, 220), ["TOEIC 5", "빈출 핵심", "난이도 2+"]),
    setFromIds("set_toeic_rc_vocabulary", "TOEIC RC 문서·문법 어휘", "Part 5·6·7 이메일, 공지, 청구서, 광고 핵심어", "builtin", forEnglishQuestionTypes(["TOEIC RC", "이메일·문서", "회계·청구", "채용·인사", "마케팅·영업"], 120), ["TOEIC", "TOEIC RC", "Part 5", "Part 6", "Part 7"]),
    setFromIds("set_toeic_lc_workplace", "TOEIC LC 업무 상황 표현", "Part 2·3·4 일정 조정, 전화, 공지, 출장 표현", "builtin", forEnglishQuestionTypes(["TOEIC LC", "예약·일정", "공지·방송", "출장·여행", "회의·행사"], 110), ["TOEIC", "TOEIC LC", "Part 2", "Part 3", "Part 4"]),
    setFromIds("set_toeic_business_phrases", "TOEIC 비즈니스 표현", "메일·회의·고객응대에서 바로 쓰는 실무 표현", "builtin", forEnglishQuestionTypes(["비즈니스 영어", "실무 문장", "메일 표현", "회의 표현", "프로젝트 관리", "고객응대"], 120), ["TOEIC", "비즈니스 영어", "실무 문장"]),
    setFromIds("set_english_admission", "TOEFL·IELTS 입시 영어", "일본 대학 지원에 필요한 TOEFL·IELTS 표현", "builtin", forEnglishQuestionTypes(["출원 영어", "TOEFL", "IELTS", "아카데믹 영어"], 80), ["출원 영어", "TOEFL", "IELTS"]),
    setFromIds("set_startup_business_english", "스타트업 실무 영어", "PMF, runway, retention, pitch 같은 현장 어휘", "builtin", forQuestionTypes(["스타트업 영어", "투자 영어", "SaaS 지표", "마케팅 영어", "전문 용어"], 80), ["스타트업 영어", "전문 용어"]),
    setFromIds("set_business_english_sentences", "비즈니스 영어 문장", "회의·메일·제안에서 바로 쓰는 문장", "builtin", forQuestionTypes(["비즈니스 영어", "실무 문장", "회의 표현"], 60), ["비즈니스 영어", "실무 문장"]),
    setFromIds("set_business_japanese", "비즈니스 일본어", "메일·회의·일정 조율에 바로 쓰는 정중한 표현", "builtin", forQuestionTypes(["비즈니스 일본어", "메일 표현", "회의 표현", "회사 실무"], 80), ["비즈니스 일본어", "메일 표현"]),
    setFromIds("set_campus_japanese", "대학생 실사용 일본어", "JLPT·EJU 밖의 신조어, SNS 표현, 캠퍼스 말투", "builtin", forQuestionTypes(["대학생 표현", "신조어", "SNS 표현", "캠퍼스 일본어", "실사용 일본어"], 80), ["대학생 표현", "신조어"]),
    setFromIds("set_highlight", "형광펜 단어장", "스캔으로 추가한 단어", "highlight", highlight),
    setFromIds("set_wrong", "오답 단어장", "틀린 단어부터 다시", "wrong", wrong),
  ];

  // Clean empty sets in case of initial dummy state.
  return sets
    .map((s) => {
      const wordIds = s.wordIds.filter((id) => byId.has(id));
      return { ...s, wordIds, wordCount: wordIds.length };
    })
    .filter((s) => s.wordIds.length >= 8 || s.createdFrom === "builtin");
}

// EJUEDU dummy academy/classes/students
export const EJUEDU_CLASSES: AcademyClass[] = [
  {
    id: "class_a",
    academyName: "EJUEDU",
    name: "EJUEDU A반",
    inviteCode: "EJUEDU-A",
    targetScore: "300점 목표",
    level: "N2 전후",
    focus: ["독해", "청독해"],
    lessonDays: [2, 4],
    lessonTime: "19:00",
    lessonDurationMinutes: 90,
    studentIds: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12"],
  },
  {
    id: "class_b",
    academyName: "EJUEDU",
    name: "EJUEDU B반",
    inviteCode: "EJUEDU-B",
    targetScore: "200점 목표",
    level: "N3~N2",
    focus: ["필수 기초", "독해 기본"],
    lessonDays: [1, 3],
    lessonTime: "18:30",
    lessonDurationMinutes: 90,
    studentIds: ["s13", "s14", "s15", "s16", "s17", "s18", "s19", "s20", "s21", "s22"],
  },
  {
    id: "class_c",
    academyName: "EJUEDU",
    name: "EJUEDU C반",
    inviteCode: "EJUEDU-C",
    targetScore: "350+ 목표",
    level: "N1 전후",
    focus: ["기술문", "종합과목 연결어"],
    lessonDays: [6],
    lessonTime: "15:00",
    lessonDurationMinutes: 120,
    studentIds: ["s23", "s24", "s25", "s26", "s27", "s28", "s29", "s30"],
  },
];

const STUDENT_NAME_POOL = [
  "김하루",
  "박민준",
  "이서윤",
  "최도윤",
  "정유나",
  "강리쿠",
  "한소라",
  "오하린",
  "문재현",
  "이준",
  "나카무라 유이",
  "사토 하루토",
  "최민서",
  "강지훈",
  "이아린",
] as const;

const STYLE_POOL: StudyStyle[] = ["균형형", "빠른 암기형", "문제풀이형", "예문중심형", "오답집중형", "기출빈도형"];

export const EJUEDU_STUDENTS: StudentProfile[] = (() => {
  const profiles: StudentProfile[] = [];
  const classIds = ["class_a", "class_b", "class_c"] as const;
  let idx = 0;
  for (const classId of classIds) {
    const cls = EJUEDU_CLASSES.find((c) => c.id === classId)!;
    for (const sid of cls.studentIds) {
      const name = STUDENT_NAME_POOL[idx % STUDENT_NAME_POOL.length];
      const seed = 5000 + idx * 133;
      profiles.push({
        id: sid,
        name,
        classId,
        targetScore: cls.targetScore,
        currentLevel: cls.level,
        studyStyle: pick(STYLE_POOL, seed + 1),
        homeworkCompletion: 30 + Math.floor(seeded01(seed + 2) * 55),
        recentAccuracy: 52 + Math.floor(seeded01(seed + 3) * 33),
        weakTypes: shuffle(["근거 찾기", "자료형", "경제", "문맥 이해", "기술문 표현"], seed + 4).slice(0, 2),
        wrongWordIds: [],
      });
      idx++;
    }
  }
  return profiles;
})();

export function buildInitialAssignments(vocab: VocabItem[], sets: StudySet[]): VocabularyAssignment[] {
  const now = new Date();
  const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")} 18:00`;

  const bySet = (id: string, fallbackCount: number) => {
    const set = sets.find((s) => s.id === id);
    if (set?.wordIds.length) return set.wordIds.slice(0, fallbackCount);
    return vocab.slice(0, fallbackCount).map((v) => v.id);
  };

  const make = (id: string, title: string, classId: string, wordIds: string[], requiredAccuracy: number, teacherMemo: string): VocabularyAssignment => {
    const cls = EJUEDU_CLASSES.find((c) => c.id === classId);
    const a: VocabularyAssignment = {
      id,
      title,
      classId,
      wordIds,
      ...(cls ? createPreClassTestAvailability(cls, now) : {}),
      dueDate: dueStr,
      requiredAccuracy,
      teacherMemo,
      createdBy: "EJUEDU 선생님",
      statusByStudent: {},
      progressByStudent: {},
      accuracyByStudent: {},
    };
    for (const sid of cls?.studentIds || []) {
      const seed = 9000 + sid.length * 97 + id.length * 31;
      const progress = Math.floor(seeded01(seed + 1) * wordIds.length);
      const accuracy = 52 + Math.floor(seeded01(seed + 2) * 40);
      a.statusByStudent[sid] = progress === 0 ? "미시작" : progress >= wordIds.length ? "완료" : "진행 중";
      a.progressByStudent[sid] = progress;
      a.accuracyByStudent[sid] = accuracy;
    }
    return a;
  };

  const a1 = make(
    "asmt_a_1",
    "EJUEDU A반 300점 목표 단어 60개",
    "class_a",
    bySet("set_300", 60),
    80,
    "이번 주는 독해/청독해 기본 빈출어를 먼저 잡습니다. 하루 15분씩 진행해보세요."
  );

  const a2 = make(
    "asmt_a_2",
    "청독해 자료형 표현 25개",
    "class_a",
    bySet("set_table", 25),
    75,
    "표/그래프 표현은 청독해에서 바로 점수로 이어집니다."
  );

  const b1 = make(
    "asmt_b_1",
    "EJUEDU B반 필수 기초 단어 50개",
    "class_b",
    bySet("set_200", 50),
    70,
    "기초를 빠르게 올리고 오답은 표시해서 다음 주에 다시 돌립니다."
  );

  const c1 = make(
    "asmt_c_1",
    "기술문 주장·반론 표현 30개",
    "class_c",
    bySet("set_writing", 30),
    85,
    "고득점반은 표현을 정확히 구분하는 게 핵심입니다. 예문 빈칸을 꼭 풀어보세요."
  );

  return [a1, a2, b1, c1];
}
