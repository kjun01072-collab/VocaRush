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

export const DIFFICULTY_LABELS: Record<VocabDifficulty, DifficultyLabel> = {
  1: {
    label: "필수 기초",
    shortBadge: "필수",
    description:
      "처음부터 반드시 외워야 하는 단어입니다. N3~N2 학생과 200점 목표 학생에게 추천됩니다.",
  },
  2: {
    label: "빈출 핵심",
    shortBadge: "핵심",
    description: "EJU 기출에 자주 나오고 기본 점수 확보에 중요한 단어입니다.",
  },
  3: {
    label: "점수 상승",
    shortBadge: "300점",
    description:
      "300점 목표 학생이 약점을 줄이기 위해 외워야 하는 단어입니다.",
  },
  4: {
    label: "고득점 어휘",
    shortBadge: "고득점",
    description:
      "350+ 목표 학생에게 필요한 어려운 단어와 표현입니다.",
  },
  5: {
    label: "최상위 표현",
    shortBadge: "최상위",
    description:
      "기술문, 학술 독해, 상위권 학생에게 필요한 고난도 표현입니다.",
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
  "종합과목",
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

    const difficulty = difficultyFromLevel(seed.level, seedNum + 29);
    const importance = importanceFromFrequency(frequencyScore);
    const targetScore = targetScoreFromLevel(seed.level);

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
      isFavorite: seeded01(seedNum + 201) > 0.92,
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
      difficulty: difficultyFromLevel(m.level, 9999),
      importance: "매우 중요",
      targetScore: targetScoreFromLevel(m.level),
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
  const difficulty = difficultyFromLevel(seed.level, seedNum + 29);
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
    isFavorite: seeded01(seedNum + 201) > 0.92,
    ...review,
  };
}

function generateMasterVocabData(): VocabItem[] {
  return MASTER_VOCAB_SEEDS.map((seed, index) => {
    const review = seededReviewState(7000 + index * 41);
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
      targetScore: targetScoreFromDifficulty(seed.difficulty, seed.frequencyScore),
      importance: importanceFromFrequency(seed.frequencyScore),
      questionTypes,
      appearedIn,
      synonyms: seed.synonyms.slice(0, 6),
      relatedWords: researchRelatedWords(seed),
      commonMistake:
        seed.difficulty >= 4
          ? "뜻만 외우기보다 출현 유형과 예문 속 쓰임을 함께 확인하세요."
          : undefined,
      sourceType: "기출분석" as const,
      isFavorite: seeded01(9000 + index * 53) > 0.94,
      ...review,
    };
  });
}

export function generateVocabData(): VocabItem[] {
  const master = generateMasterVocabData();
  if (master.length >= 260) {
    const seenWords = new Set(master.map((v) => v.word));
    const supplements = MUST_WORDS.concat(EXTRA_SEEDS)
      .filter((seed) => !seenWords.has(seed.word))
      .map((seed, index) => vocabItemFromSeed(seed, master.length + index, "vocab_required"));
    return master.concat(supplements);
  }
  return generateFallbackVocabData();
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

  const topFreq = vocab
    .slice()
    .sort((a, b) => b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount)
    .slice(0, 100)
    .map((v) => v.id);

  const forTarget = (t: VocabItem["targetScore"], limit: number) =>
    vocab
      .filter((v) => v.targetScore === t)
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, limit)
      .map((v) => v.id);

  const forLevel = (level: VocabLevel, limit: number) =>
    vocab
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

  const forSubjectPart = (subject: VocabSubject, part: string, limit: number) =>
    vocab
      .filter((v) => v.subject === subject && v.part === part)
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, limit)
      .map((v) => v.id);

  const forKeywords = (keywords: string[], limit: number) =>
    uniq([
      ...vocab
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
      ...vocab.filter(
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
  const wrong = vocab.filter((v) => v.wrongCount > 0).map((v) => v.id);

  const sets: StudySet[] = [
    setFromIds("set_top100", "EJU 최빈출 100", "기출 빈도 기준 상위 100단어", "builtin", topFreq),
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
    setFromIds("set_highlight", "형광펜 단어장", "스캔으로 추가한 단어", "highlight", highlight),
    setFromIds("set_wrong", "오답 단어장", "틀린 단어부터 다시", "wrong", wrong),
  ];

  // Clean empty sets in case of initial dummy state.
  return sets
    .map((s) => ({ ...s, wordIds: s.wordIds.filter((id) => byId.has(id)), wordCount: s.wordIds.length }))
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
    const a: VocabularyAssignment = {
      id,
      title,
      classId,
      wordIds,
      dueDate: dueStr,
      requiredAccuracy,
      teacherMemo,
      createdBy: "EJUEDU 선생님",
      statusByStudent: {},
      progressByStudent: {},
      accuracyByStudent: {},
    };
    const cls = EJUEDU_CLASSES.find((c) => c.id === classId);
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
