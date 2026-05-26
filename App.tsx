import React, { useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";

import {
  buildInitialAssignments,
  buildInitialStudySets,
  EJUEDU_CLASSES,
  EJUEDU_STUDENTS,
  generateVocabData,
} from "./src/data/vocabData";
import { I18nProvider, useI18n } from "./src/i18n";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { COLORS, PRESS_FEEDBACK, RADII, SPACING, TYPO } from "./src/theme";
import { Card, Row } from "./src/components/common";
import {
  AttendanceState,
  AppOverlayScreen,
  DiagnosticResult,
  LearningRecord,
  LearnMode,
  LearnSessionProgress,
  LearningCourse,
  StudentSettings,
  StudentTab,
  StudySessionLog,
  SupabaseProfile,
  RewardItem,
  StudySet,
  TeacherTab,
  UserRole,
  UserStudyFolder,
  VocabItem,
  VocabularyAssignment,
  WeakTypeStat,
} from "./src/types";
import { courseFromProfile, getLearningCourseMeta, wordMatchesLearningCourse } from "./src/data/learningCatalog";
import { fetchProfile, profileErrorMessage, saveProfile } from "./src/lib/profiles";
import { fetchLearningRecords, insertLearningRecord, learningRecordErrorMessage } from "./src/lib/learningRecords";
import { extractHighlightWordsFromFile } from "./src/lib/highlightExtraction";
import { loadLocalAppState, saveLocalAppState } from "./src/lib/localAppState";
import { getSafeErrorMessage, logInternalError } from "./src/utils/errors";
import { canModifyRecord } from "./src/utils/permissions";
import { sanitizeText, validateBulkScheduleImportText, validateRequiredText } from "./src/utils/validation";
import { StudySetRowInput } from "./src/utils/studySetRows";
import { getAssignmentAvailability } from "./src/utils/assignmentAvailability";

import { StudentHomeScreen } from "./src/screens/StudentHomeScreen";
import { VocabularyScreen } from "./src/screens/VocabularyScreen";
import { LearnScreen } from "./src/screens/LearnScreen";
import { WordDetailScreen } from "./src/screens/WordDetailScreen";
import { SetDetailScreen } from "./src/screens/SetDetailScreen";
import { UserFolderDetailScreen } from "./src/screens/UserFolderDetailScreen";
import { HighlightModal } from "./src/screens/HighlightModal";
import { DiagnosticScreen } from "./src/screens/DiagnosticScreen";
import { ReportScreen } from "./src/screens/ReportScreen";
import { MyScreen } from "./src/screens/MyScreen";
import { StudentClassScreen } from "./src/screens/StudentClassScreen";
import { HomeworkDetailScreen } from "./src/screens/HomeworkDetailScreen";
import { TeacherHomeScreen } from "./src/screens/TeacherHomeScreen";
import { TeacherClassesScreen } from "./src/screens/TeacherClassesScreen";
import { TeacherClassDetailScreen } from "./src/screens/TeacherClassDetailScreen";
import { TeacherStudentDetailScreen } from "./src/screens/TeacherStudentDetailScreen";
import { TeacherDistributeScreen } from "./src/screens/TeacherDistributeScreen";
import { TeacherStatusScreen } from "./src/screens/TeacherStatusScreen";
import { TeacherAssignmentDetailScreen } from "./src/screens/TeacherAssignmentDetailScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";

const initialVocab = generateVocabData();
const initialSets = buildInitialStudySets(initialVocab);
const STUDENT_TABS: StudentTab[] = ["home", "vocab", "library", "my"];
const TEACHER_TABS: TeacherTab[] = ["home", "classes", "distribute", "status", "my"];
const LOCAL_LEARNING_RECORD_PREFIX = "local_learning_";
const SELF_ASSESSMENT_ERROR_TYPES = new Set(["낱말카드", "카드 분류", "학습 중"]);
const LEARN_MODES: LearnMode[] = [
  "낱말카드",
  "한자→한국어",
  "뜻→한자",
  "뜻→독음",
  "뜻 맞히기",
  "독음 맞히기",
  "예문 빈칸",
  "동의어 연결",
  "관련어 묶음 퀴즈",
  "유형별 퀴즈",
  "빠른 OX",
  "쓰기 연습",
  "카드 분류",
  "오답 복습",
];

function learnSessionKey(title: string, wordIds: string[]) {
  return `${title.trim()}::${wordIds.join("|")}`;
}

function learnProgressKey(sessionKey: string, mode: LearnMode) {
  return `${sessionKey}::${mode}`;
}

function reviewDerivedSetId(setId?: string) {
  return Boolean(setId && (setId.startsWith("set_wrong") || setId.startsWith("set_learning")));
}

function learningCardBucketKey(sourceSetId: string | undefined, sourceTitle: string | undefined) {
  if (sourceSetId && !reviewDerivedSetId(sourceSetId)) return sourceSetId;
  return `session:${(sourceTitle || "학습 중 낱말카드").trim()}`;
}

function dynamicSetId(prefix: string, key: string) {
  return `${prefix}_${key.replace(/[^A-Za-z0-9가-힣_-]+/g, "_").slice(0, 80)}`;
}

function mergeSavedVocab(saved: VocabItem[] | undefined, options?: { resetFavorites?: boolean }): VocabItem[] | undefined {
  if (!saved?.length) return saved;
  const savedById = new Map(saved.map((item) => [item.id, item] as const));
  const builtinIds = new Set(initialVocab.map((item) => item.id));
  const customItems = saved
    .filter((item) => !builtinIds.has(item.id))
    .map((item) => (options?.resetFavorites ? { ...item, isFavorite: false } : item));
  const mergedBuiltins = initialVocab.map((item) => {
    const previous = savedById.get(item.id);
    if (!previous) return item;
    return {
      ...item,
      userId: previous.userId,
      ownerId: previous.ownerId,
      reviewStatus: previous.reviewStatus,
      wrongCount: previous.wrongCount,
      cumulativeWrongAttempts: previous.cumulativeWrongAttempts,
      recentWrongAttempts7d: previous.recentWrongAttempts7d,
      masteryLevel: previous.masteryLevel,
      isFavorite: options?.resetFavorites ? false : previous.isFavorite,
    };
  });
  return [...customItems, ...mergedBuiltins];
}

function mergeSavedStudySets(saved: StudySet[] | undefined): StudySet[] | undefined {
  if (!saved?.length) return saved;
  const savedById = new Map(saved.map((set) => [set.id, set] as const));
  const builtinIds = new Set(initialSets.map((set) => set.id));
  const customSets = saved.filter((set) => !builtinIds.has(set.id));
  const mergedBuiltins = initialSets.map((set) => {
    const previous = savedById.get(set.id);
    if (!previous) return set;
    return {
      ...set,
      progress: previous.progress,
      createdAt: previous.createdAt,
    };
  });
  return [...mergedBuiltins, ...customSets];
}

function compactVocabForStorage(vocab: VocabItem[]) {
  const initialById = new Map(initialVocab.map((item) => [item.id, item] as const));
  return vocab.filter((item) => {
    const original = initialById.get(item.id);
    if (!original) return true;
    return (
      item.userId !== original.userId ||
      item.ownerId !== original.ownerId ||
      item.reviewStatus !== original.reviewStatus ||
      item.wrongCount !== original.wrongCount ||
      item.cumulativeWrongAttempts !== original.cumulativeWrongAttempts ||
      item.recentWrongAttempts7d !== original.recentWrongAttempts7d ||
      item.masteryLevel !== original.masteryLevel ||
      item.isFavorite !== original.isFavorite
    );
  });
}

function compactStudySetsForStorage(sets: StudySet[]) {
  const initialById = new Map(initialSets.map((set) => [set.id, set] as const));
  return sets.filter((set) => {
    const original = initialById.get(set.id);
    if (!original) return true;
    return set.progress !== original.progress || set.createdAt !== original.createdAt;
  });
}

const rewardStoreItems: RewardItem[] = [
  {
    id: "reward_donki_10",
    title: "돈키호테 10% 할인권",
    brand: "Don Quijote",
    description: "일본 생활용품 쇼핑 할인권 데모",
    requiredXP: 3200,
    category: "할인권",
  },
  {
    id: "reward_daiso_30",
    title: "다이소 30% 할인권",
    brand: "Daiso",
    description: "문구·공부용품 할인권 데모",
    requiredXP: 2600,
    category: "할인권",
  },
  {
    id: "reward_starbucks_5000",
    title: "스타벅스 5,000원 기프트",
    brand: "Starbucks",
    description: "학습 보상용 음료 기프트 데모",
    requiredXP: 5000,
    category: "기프트",
  },
  {
    id: "reward_amazon_10000",
    title: "아마존 10,000원 기프트",
    brand: "Amazon",
    description: "교재·학습용품 구매 지원 데모",
    requiredXP: 9000,
    category: "기프트",
  },
];

function dayKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToKey(dayKey: string, delta: number) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + delta);
  return dayKeyLocal(date);
}

const INITIAL_ATTENDANCE: AttendanceState = {
  checkedDates: [],
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
};

function markAttendanceDay(prev: AttendanceState, todayKey: string): AttendanceState {
  if (prev.checkedDates.includes(todayKey)) return prev;
  const checkedDates = uniq(prev.checkedDates.concat(todayKey)).sort();
  const yesterdayKey = addDaysToKey(todayKey, -1);
  const currentStreak = prev.lastStudyDate === yesterdayKey ? prev.currentStreak + 1 : 1;
  return {
    checkedDates,
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastStudyDate: todayKey,
  };
}

function defaultEjuExamPlans(targetScore: StudentSettings["targetScore"]) {
  const firstTargetScoreValue = targetScore === "350+" ? 350 : targetScore === "300점" ? 300 : 200;
  return [
    { examDate: "2026.06 EJU", targetScore, targetScoreValue: firstTargetScoreValue },
    { examDate: "2026.11 EJU", targetScore: "350+" as const, targetScoreValue: 350 },
  ];
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseCreateSetRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line
        .split(/\t|,| \/ | - | — | – /)
        .map((x) => x.trim())
        .filter(Boolean);
      if (cols.length >= 3) return { word: cols[0], reading: cols[1], meaningKo: cols.slice(2).join(" ") };
      if (cols.length === 2) return { word: cols[0], reading: cols[0], meaningKo: cols[1] };
      return { word: cols[0] || "", reading: cols[0] || "", meaningKo: "" };
    })
    .filter((row) => row.word && row.meaningKo);
}

type CuriosityWordTemplate = {
  reading: string;
  meaningKo: string;
  synonyms: string[];
  antonyms?: string[];
  relatedWords: string[];
  exampleJa: string;
  exampleKo: string;
  explanationKo: string;
  difficulty?: VocabItem["difficulty"];
  level?: VocabItem["level"];
  targetScore?: VocabItem["targetScore"];
};

const CURIOSITY_WORD_BANK: Record<string, CuriosityWordTemplate> = {
  珈琲: {
    reading: "コーヒー",
    meaningKo: "커피",
    synonyms: ["コーヒー飲料", "カフェ"],
    relatedWords: ["飲み物", "注文", "喫茶店", "朝"],
    exampleJa: "朝は珈琲を飲みながら、今日の予定を確認する。",
    exampleKo: "아침에는 커피를 마시면서 오늘 일정을 확인한다.",
    explanationKo: "커피를 한자로 적은 표현입니다. 일상에서는 주로 カタカナ의 コーヒー를 더 많이 씁니다.",
  },
  経験: {
    reading: "けいけん",
    meaningKo: "경험",
    synonyms: ["体験", "経歴"],
    relatedWords: ["学ぶ", "成長", "将来", "挑戦"],
    exampleJa: "海外での経験は、自分の考え方を広げるきっかけになる。",
    exampleKo: "해외에서의 경험은 자신의 사고방식을 넓히는 계기가 된다.",
    explanationKo: "직접 겪거나 해 본 일을 뜻합니다. 진로, 유학, 생활 주제에서 자주 쓰입니다.",
  },
  景気: {
    reading: "けいき",
    meaningKo: "경기, 경제 상황",
    synonyms: ["経済状況", "市況"],
    antonyms: ["不景気"],
    relatedWords: ["需要", "消費", "物価", "雇用"],
    exampleJa: "景気が回復すると、企業の採用活動も活発になる。",
    exampleKo: "경기가 회복되면 기업의 채용 활동도 활발해진다.",
    explanationKo: "경제 전체의 좋고 나쁨을 나타내는 말입니다. 종합과목 경제 문맥에서 자주 연결됩니다.",
    level: "종합과목 연결",
    targetScore: "300점",
  },
  努力: {
    reading: "どりょく",
    meaningKo: "노력",
    synonyms: ["頑張り", "精進"],
    relatedWords: ["目標", "成果", "継続", "成長"],
    exampleJa: "毎日の小さな努力が、試験本番の自信につながる。",
    exampleKo: "매일의 작은 노력이 시험 본番의 자신감으로 이어진다.",
    explanationKo: "목표를 위해 계속 힘쓰는 것을 뜻합니다. 학습 계획과 자기소개 문맥에서 자주 씁니다.",
  },
  相談: {
    reading: "そうだん",
    meaningKo: "상담, 의논",
    synonyms: ["話し合い", "助言を求めること"],
    relatedWords: ["先生", "友人", "問題", "解決"],
    exampleJa: "進路に迷ったときは、早めに先生に相談したほうがいい。",
    exampleKo: "진로가 고민될 때는 빨리 선생님과 상담하는 편이 좋다.",
    explanationKo: "혼자 결정하기 어려운 문제를 다른 사람과 의논하는 상황에 씁니다.",
  },
  確認: {
    reading: "かくにん",
    meaningKo: "확인",
    synonyms: ["チェック", "検証"],
    relatedWords: ["予定", "内容", "提出", "連絡"],
    exampleJa: "提出する前に、名前と受験番号を必ず確認してください。",
    exampleKo: "제출하기 전에 이름과 수험번호를 반드시 확인해 주세요.",
    explanationKo: "틀림이 없는지 다시 살펴보는 행동을 뜻합니다. 안내문과 절차 설명에서 자주 나옵니다.",
  },
  準備: {
    reading: "じゅんび",
    meaningKo: "준비",
    synonyms: ["用意", "支度"],
    relatedWords: ["試験", "計画", "持ち物", "確認"],
    exampleJa: "試験前日は、持ち物を早めに準備しておく。",
    exampleKo: "시험 전날에는 준비물을 미리 준비해 둔다.",
    explanationKo: "어떤 일을 하기 전에 필요한 것을 갖추는 행동입니다.",
  },
  必要: {
    reading: "ひつよう",
    meaningKo: "필요",
    synonyms: ["不可欠", "要ること"],
    antonyms: ["不要"],
    relatedWords: ["条件", "準備", "資料", "確認"],
    exampleJa: "出願には、成績証明書と写真が必要です。",
    exampleKo: "출원에는 성적증명서와 사진이 필요합니다.",
    explanationKo: "반드시 있어야 하거나 해야 하는 것을 나타냅니다.",
  },
  便利: {
    reading: "べんり",
    meaningKo: "편리",
    synonyms: ["使いやすい", "役に立つ"],
    antonyms: ["不便"],
    relatedWords: ["交通", "生活", "道具", "アプリ"],
    exampleJa: "駅に近い部屋は、通学にも買い物にも便利だ。",
    exampleKo: "역에 가까운 방은 통학에도 쇼핑에도 편리하다.",
    explanationKo: "사용하기 쉽고 도움이 되는 상태를 뜻합니다.",
  },
  不便: {
    reading: "ふべん",
    meaningKo: "불편",
    synonyms: ["使いにくい", "不自由"],
    antonyms: ["便利"],
    relatedWords: ["交通", "生活", "時間", "距離"],
    exampleJa: "バスの本数が少ない地域では、通学が不便になることがある。",
    exampleKo: "버스 운행 횟수가 적은 지역에서는 통학이 불편해질 수 있다.",
    explanationKo: "이용하기 어렵거나 생활에 지장이 있는 상태를 뜻합니다.",
  },
  挑戦: {
    reading: "ちょうせん",
    meaningKo: "도전",
    synonyms: ["チャレンジ", "試み"],
    relatedWords: ["目標", "努力", "成長", "経験"],
    exampleJa: "新しい環境に挑戦することで、自分の可能性に気づくことがある。",
    exampleKo: "새로운 환경에 도전하면서 자신의 가능성을 깨닫는 경우가 있다.",
    explanationKo: "어렵거나 새로운 일에 적극적으로 나서는 것을 뜻합니다.",
  },
  成長: {
    reading: "せいちょう",
    meaningKo: "성장",
    synonyms: ["発達", "向上"],
    relatedWords: ["経験", "努力", "学習", "変化"],
    exampleJa: "失敗から学ぶことも、大きな成長につながる。",
    exampleKo: "실패에서 배우는 것도 큰 성장으로 이어진다.",
    explanationKo: "능력이나 상태가 더 나아지는 과정을 뜻합니다.",
  },
  失敗: {
    reading: "しっぱい",
    meaningKo: "실패",
    synonyms: ["ミス", "失策"],
    antonyms: ["成功"],
    relatedWords: ["原因", "改善", "経験", "反省"],
    exampleJa: "失敗の原因を考えることが、次の改善につながる。",
    exampleKo: "실패의 원인을 생각하는 것이 다음 개선으로 이어진다.",
    explanationKo: "목표대로 되지 않은 결과를 뜻하며, 원인·개선과 자주 연결됩니다.",
  },
  成功: {
    reading: "せいこう",
    meaningKo: "성공",
    synonyms: ["達成", "成果"],
    antonyms: ["失敗"],
    relatedWords: ["努力", "目標", "計画", "経験"],
    exampleJa: "計画的に準備したことが、試験の成功につながった。",
    exampleKo: "계획적으로 준비한 것이 시험의 성공으로 이어졌다.",
    explanationKo: "목표한 결과를 이루는 것을 뜻합니다.",
  },
};

const CURIOSITY_KOREAN_LOOKUP: Record<string, string> = {
  커피: "珈琲",
  경험: "経験",
  경기: "景気",
  "경제 상황": "景気",
  노력: "努力",
  상담: "相談",
  의논: "相談",
  확인: "確認",
  준비: "準備",
  필요: "必要",
  편리: "便利",
  불편: "不便",
  도전: "挑戦",
  성장: "成長",
  실패: "失敗",
  성공: "成功",
};

function hasJapaneseText(text: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

function hasLatinText(text: string) {
  return /[A-Za-z]/.test(text);
}

function canAutoSaveCuriosityWord(raw: string) {
  const term = raw.trim();
  if (!term || /[。、！？\n\r]/.test(term)) return false;
  if (hasJapaneseText(term)) return term.length <= 18;
  return hasLatinText(term) && term.length <= 48 && /^[A-Za-z0-9][A-Za-z0-9 .+/#&'()-]*$/.test(term);
}

function curiosityIdFor(term: string) {
  const encoded = encodeURIComponent(term).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 64);
  return `vocab_curiosity_${encoded || "word"}`;
}

function fallbackReading(term: string) {
  return /^[\u3040-\u30ffー]+$/.test(term) ? term : "읽기 확인 필요";
}

function buildCuriosityWord(term: string): VocabItem {
  const isEnglishTerm = hasLatinText(term) && !hasJapaneseText(term);
  const template = CURIOSITY_WORD_BANK[term] || {
    reading: isEnglishTerm ? term : fallbackReading(term),
    meaningKo: "뜻 확인 필요",
    synonyms: ["직접 확인"],
    relatedWords: ["개인 검색", isEnglishTerm ? "영어 전문 용어" : "궁금한 표현"],
    exampleJa: isEnglishTerm
      ? `${term}: add a real sentence from your work or class context.`
      : `${term}の意味を辞書で確認して、自分の例文を追加しましょう。`,
    exampleKo: `${term}의 뜻을 확인하고 나만의 예문을 추가해 보세요.`,
    explanationKo: isEnglishTerm
      ? "검색으로 저장한 영어 전문 용어입니다. 정확한 뜻과 실제 업무 문장은 단어 상세에서 보강해 주세요."
      : "검색으로 저장한 개인 단어입니다. 정확한 뜻과 독음은 사전 확인 후 수정하는 것을 권장합니다.",
  };

  return {
    id: curiosityIdFor(term),
    word: term,
    reading: template.reading,
    meaningKo: template.meaningKo,
    level: template.level || "필수 기초",
    subject: isEnglishTerm ? "영어" : "일본어",
    part: isEnglishTerm ? "궁금한 전문 영어" : "궁금한 표현",
    questionTypes: isEnglishTerm ? ["개인 검색", "전문 용어", "비즈니스 영어"] : ["개인 검색"],
    occurrenceCount: 0,
    frequencyScore: 8,
    difficulty: template.difficulty || 1,
    importance: "기초",
    targetScore: template.targetScore || "200점",
    appearedIn: [],
    synonyms: template.synonyms,
    antonyms: template.antonyms,
    relatedWords: template.relatedWords,
    exampleJa: template.exampleJa,
    exampleKo: template.exampleKo,
    explanationKo: template.explanationKo,
    commonMistake: "개인 검색 단어는 자동 저장 후 뜻과 독음을 한 번 더 확인해 주세요.",
    sourceType: "직접추가",
    reviewStatus: "Learning",
    wrongCount: 0,
    cumulativeWrongAttempts: 0,
    recentWrongAttempts7d: 0,
    masteryLevel: 0,
    isFavorite: false,
  };
}

function lookupDictionaryWord(rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return null;

  if (CURIOSITY_WORD_BANK[query]) return buildCuriosityWord(query);

  const lower = query.toLowerCase();
  const byKorean = CURIOSITY_KOREAN_LOOKUP[query] || CURIOSITY_KOREAN_LOOKUP[lower];
  if (byKorean) return buildCuriosityWord(byKorean);

  const matchedJapanese = Object.keys(CURIOSITY_WORD_BANK).find((word) => {
    const item = CURIOSITY_WORD_BANK[word];
    return (
      item.reading.toLowerCase() === lower ||
      item.meaningKo.split(/[,\s]+/).some((meaning) => meaning === query) ||
      item.synonyms.some((synonym) => synonym.includes(query)) ||
      item.relatedWords.some((related) => related.includes(query))
    );
  });
  if (matchedJapanese) return buildCuriosityWord(matchedJapanese);

  if (canAutoSaveCuriosityWord(query)) return buildCuriosityWord(query);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}

function ProtectedApp() {
  const { loading, isAuthenticated, isGuest, user, signOut } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (loading) return;

      if (!isAuthenticated || isGuest || !user) {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError(null);
      try {
        const nextProfile = await fetchProfile(user.id);
        if (!mounted) return;
        setProfile(nextProfile);
      } catch (error) {
        if (!mounted) return;
        setProfileError(profileErrorMessage(error));
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [loading, isAuthenticated, isGuest, user?.id, reloadKey]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authLoading}>
          <View style={styles.authLoadingMark}>
            <Text style={styles.authLoadingMarkText}>V</Text>
          </View>
          <ActivityIndicator color={COLORS.cyan} />
          <Text style={styles.authLoadingText}>Supabase 세션을 확인하는 중입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return <AuthScreen />;

  if (!isGuest && user && profileLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authLoading}>
          <View style={styles.authLoadingMark}>
            <Text style={styles.authLoadingMarkText}>V</Text>
          </View>
          <ActivityIndicator color={COLORS.cyan} />
          <Text style={styles.authLoadingText}>프로필을 확인하는 중입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isGuest && user && profileError) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.profileErrorWrap}>
          <View style={styles.authLoadingMark}>
            <Text style={styles.authLoadingMarkText}>V</Text>
          </View>
          <Text style={styles.profileErrorTitle}>프로필을 불러오지 못했습니다</Text>
          <Text style={styles.profileErrorBody}>{profileError}</Text>
          <Pressable
            style={styles.profilePrimaryBtn}
            onPress={() => setReloadKey((x) => x + 1)}
            accessibilityRole="button"
            accessibilityLabel="프로필 다시 시도"
          >
            <Text style={styles.profilePrimaryText}>다시 시도</Text>
          </Pressable>
          <Pressable
            style={styles.profileSecondaryBtn}
            onPress={() => {
              signOut().catch((error) => {
                logInternalError(error, "ProtectedApp.profileErrorSignOut");
                Alert.alert("로그아웃", getSafeErrorMessage(error, "한국어"));
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="로그아웃"
          >
            <Text style={styles.profileSecondaryText}>로그아웃</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!isGuest && user && !profile) {
    return (
      <OnboardingScreen
        userId={user.id}
        userEmail={user.email}
        saving={profileSaving}
        error={profileError}
        onSignOut={signOut}
        onSubmit={async (nextProfile) => {
          setProfileSaving(true);
          setProfileError(null);
          try {
            const saved = await saveProfile(nextProfile);
            setProfile(saved);
          } catch (error) {
            setProfileError(profileErrorMessage(error));
          } finally {
            setProfileSaving(false);
          }
        }}
      />
    );
  }

  return <AppShell profile={profile} />;
}

function settingsFromProfile(profile: SupabaseProfile | null): StudentSettings {
  const level = profile?.current_level || "";
  const targetScore =
    profile?.goal === "EJU" && level.includes("350")
      ? "350+"
      : profile?.goal === "EJU" && level.includes("200")
        ? "200점"
        : profile?.goal === "EJU"
          ? "300점"
          : "200점";
  return {
    role: profile?.role || "student",
    learningCourse: courseFromProfile(profile),
    targetScore,
    examDate: profile ? `2026.06 ${profileGoalLabel(profile) || "EJU"}` : "2026.06 EJU",
    ejuExamPlans: defaultEjuExamPlans(targetScore),
    dailyWordGoal: profile?.role === "teacher" ? 20 : 30,
    notificationOn: true,
    studyStyle: "균형형",
    appLanguage: "한국어",
    connectedClassId: profile?.role === "student" ? "class_a" : null,
  };
}

function profileGoalLabel(profile: SupabaseProfile | null) {
  if (!profile) return "";
  if (profile.goal === "other") {
    const [customSubject] = profile.current_level.split(" · ");
    return customSubject?.trim() || "기타 과목";
  }
  const labels: Partial<Record<SupabaseProfile["goal"], string>> = {
    BusinessEnglish: "스타트업 영어",
    BusinessJapanese: "비즈니스 일본어",
    CampusJapanese: "대학생 일본어",
  };
  if (labels[profile.goal]) return labels[profile.goal];
  return profile.goal;
}

function AppShell({ profile }: { profile: SupabaseProfile | null }) {
  const [settings, setSettings] = useState<StudentSettings>({
    ...settingsFromProfile(profile),
  });

  return (
    <I18nProvider language={settings.appLanguage}>
      <AppContent
        profile={profile}
        settings={settings}
        setSettings={setSettings}
      />
    </I18nProvider>
  );
}

function AppContent({
  profile,
  settings,
  setSettings,
}: {
  profile: SupabaseProfile | null;
  settings: StudentSettings;
  setSettings: React.Dispatch<React.SetStateAction<StudentSettings>>;
}) {
  const { t, language } = useI18n();
  const { signOut, user, isGuest } = useAuth();
  const displayName = isGuest
    ? settings.role === "teacher"
      ? "EJUEDU 게스트 선생님"
      : "Guest User"
    : profile?.name || user?.email?.split("@")[0] || "Joon";
  const ownerId = isGuest ? "guest" : user?.id || "anonymous";
  const [studentTab, setStudentTab] = useState<StudentTab>("home");
  const [teacherTab, setTeacherTab] = useState<TeacherTab>("home");

  const [searchQuery, setSearchQuery] = useState("");
  const [setWordFilter, setSetWordFilter] = useState<{ title: string; wordIds: string[] } | null>(null);

  const [vocab, setVocab] = useState<VocabItem[]>(initialVocab);
  const vocabById = useMemo(() => new Map(vocab.map((v) => [v.id, v] as const)), [vocab]);

  const [studySets, setStudySets] = useState<StudySet[]>(initialSets);
  const [assignments, setAssignments] = useState<VocabularyAssignment[]>(
    buildInitialAssignments(initialVocab, initialSets)
  );

  const [overlay, setOverlay] = useState<AppOverlayScreen>({ kind: "none" });
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [createHubOpen, setCreateHubOpen] = useState(false);
  const [quickCreateSetOpen, setQuickCreateSetOpen] = useState(false);
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);

  const [reviewQueueIds, setReviewQueueIds] = useState<string[]>([]);
  const [studiedLog, setStudiedLog] = useState<Array<{ id: string; dayKey: string; ts: number }>>([]);
  const [learningRecords, setLearningRecords] = useState<LearningRecord[]>([]);
  const [studySessions, setStudySessions] = useState<StudySessionLog[]>([]);
  const [learningCardBuckets, setLearningCardBuckets] = useState<Record<string, { title: string; wordIds: string[]; updatedAt: number }>>({});
  const [learningSaveError, setLearningSaveError] = useState<string | null>(null);
  const [totalXP, setTotalXP] = useState(18420);
  const [storeXP, setStoreXP] = useState(4200);
  const [redeemedRewardIds, setRedeemedRewardIds] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState(12);
  const [attendance, setAttendance] = useState<AttendanceState>(INITIAL_ATTENDANCE);

  const [generatedSets, setGeneratedSets] = useState<StudySet[]>([]);
  const [userFolders, setUserFolders] = useState<UserStudyFolder[]>([]);
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticResult | null>(null);
  const [learnProgressBySession, setLearnProgressBySession] = useState<Record<string, LearnSessionProgress>>({});
  const [localStateReady, setLocalStateReady] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState<string | null>(null);
  const [transitionBlocking, setTransitionBlocking] = useState(false);
  const transitionActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runScreenTransition(label: string, action: () => void, options?: { showLoading?: boolean }) {
    if (transitionActionTimerRef.current) clearTimeout(transitionActionTimerRef.current);
    if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);

    if (!options?.showLoading) {
      setTransitionBlocking(false);
      setTransitionLabel(null);
      action();
      return;
    }

    setTransitionBlocking(true);
    setTransitionLabel(null);
    transitionActionTimerRef.current = setTimeout(() => {
      setTransitionLabel(label);
      transitionActionTimerRef.current = setTimeout(() => {
        transitionActionTimerRef.current = null;
        try {
          action();
        } finally {
          transitionHideTimerRef.current = setTimeout(() => {
            transitionHideTimerRef.current = null;
            setTransitionLabel(null);
            setTransitionBlocking(false);
          }, 220);
        }
      }, 40);
    }, 120);
  }

  function switchStudentTab(nextTab: StudentTab) {
    if (nextTab === studentTab) return;
    const labels: Record<StudentTab, string> = {
      home: "홈 여는 중",
      vocab: "단어장 여는 중",
      library: "라이브러리 여는 중",
      my: "마이 여는 중",
    };
    runScreenTransition(labels[nextTab], () => setStudentTab(nextTab), {
      showLoading: nextTab === "vocab" || nextTab === "library",
    });
  }

  function switchTeacherTab(nextTab: TeacherTab) {
    if (nextTab === teacherTab) return;
    const labels: Record<TeacherTab, string> = {
      home: "홈 여는 중",
      classes: "클래스 여는 중",
      distribute: "단어 배포 여는 중",
      status: "과제 현황 여는 중",
      my: "마이 여는 중",
    };
    runScreenTransition(labels[nextTab], () => setTeacherTab(nextTab), {
      showLoading: nextTab === "distribute",
    });
  }

  function switchUserRole(nextRole: UserRole) {
    if (nextRole === settings.role) return;
    const nextLabel = nextRole === "teacher" ? "선생님 모드 여는 중" : "학생 모드 여는 중";
    runScreenTransition(nextLabel, () => {
      setOverlay({ kind: "none" });
      setHighlightOpen(false);
      setCreateHubOpen(false);
      setQuickCreateSetOpen(false);
      setFolderCreateOpen(false);
      setSetWordFilter(null);
      setSearchQuery("");
      setSettings((prev) => ({
        ...prev,
        role: nextRole,
        connectedClassId: nextRole === "student" ? prev.connectedClassId || "class_a" : null,
      }));
      if (nextRole === "teacher") {
        setTeacherTab("home");
      } else {
        setStudentTab("home");
      }
    }, { showLoading: true });
  }

  useEffect(() => {
    return () => {
      if (transitionActionTimerRef.current) clearTimeout(transitionActionTimerRef.current);
      if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLocalStateReady(false);

    loadLocalAppState(ownerId)
      .then((snapshot) => {
        if (!mounted || !snapshot) return;
        if (snapshot.settings) {
          setSettings((prev) => {
            const next = { ...prev, ...snapshot.settings, learningCourse: snapshot.settings?.learningCourse || prev.learningCourse };
            return {
              ...next,
              ejuExamPlans: snapshot.settings?.ejuExamPlans?.length ? snapshot.settings.ejuExamPlans : prev.ejuExamPlans,
            };
          });
        }
        if (snapshot.vocab?.length) {
          setVocab(
            mergeSavedVocab(snapshot.vocab, { resetFavorites: !snapshot.favoriteDefaultsReset }) || snapshot.vocab
          );
        }
        if (snapshot.studySets?.length) setStudySets(mergeSavedStudySets(snapshot.studySets) || snapshot.studySets);
        if (snapshot.assignments?.length) setAssignments(snapshot.assignments);
        if (snapshot.reviewQueueIds) setReviewQueueIds(snapshot.reviewQueueIds);
        if (snapshot.studiedLog) setStudiedLog(snapshot.studiedLog);
        if (snapshot.learningRecords) setLearningRecords(snapshot.learningRecords);
        if (snapshot.studySessions) setStudySessions(snapshot.studySessions);
        if (snapshot.learningCardBuckets) setLearningCardBuckets(snapshot.learningCardBuckets);
        if (typeof snapshot.totalXP === "number") setTotalXP(snapshot.totalXP);
        if (typeof snapshot.storeXP === "number") setStoreXP(snapshot.storeXP);
        if (snapshot.redeemedRewardIds) setRedeemedRewardIds(snapshot.redeemedRewardIds);
        if (typeof snapshot.streakDays === "number") setStreakDays(snapshot.streakDays);
        if (snapshot.attendance) {
          setAttendance({
            checkedDates: snapshot.attendance.checkedDates || [],
            currentStreak: snapshot.attendance.currentStreak || 0,
            longestStreak: snapshot.attendance.longestStreak || 0,
            lastStudyDate: snapshot.attendance.lastStudyDate || null,
          });
        }
        if (snapshot.generatedSets) setGeneratedSets(snapshot.generatedSets);
        if (snapshot.userFolders) setUserFolders(snapshot.userFolders);
        if (snapshot.latestDiagnostic) setLatestDiagnostic(snapshot.latestDiagnostic);
        if (snapshot.learnProgressBySession) setLearnProgressBySession(snapshot.learnProgressBySession);
        if (snapshot.navigation) {
          if (snapshot.navigation.studentTab && STUDENT_TABS.includes(snapshot.navigation.studentTab)) {
            setStudentTab(snapshot.navigation.studentTab);
          }
          if (snapshot.navigation.teacherTab && TEACHER_TABS.includes(snapshot.navigation.teacherTab)) {
            setTeacherTab(snapshot.navigation.teacherTab);
          }
          if (typeof snapshot.navigation.searchQuery === "string") {
            setSearchQuery(snapshot.navigation.searchQuery);
          }
          if (snapshot.navigation.setWordFilter) {
            setSetWordFilter(snapshot.navigation.setWordFilter);
          }
          if (snapshot.navigation.overlay) {
            setOverlay(snapshot.navigation.overlay);
          }
        }
      })
      .catch((error) => logInternalError(error, "AppContent.loadLocalState"))
      .finally(() => {
        if (mounted) setLocalStateReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [ownerId, setSettings]);

  useEffect(() => {
    if (!localStateReady) return;
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      saveLocalAppState(ownerId, {
      settings,
      vocab: compactVocabForStorage(vocab),
      studySets: compactStudySetsForStorage(studySets),
      assignments,
      reviewQueueIds,
      studiedLog: studiedLog.slice(-500),
      learningRecords,
      studySessions: studySessions.slice(0, 300),
      learningCardBuckets,
      totalXP,
      storeXP,
      redeemedRewardIds,
      streakDays,
      attendance,
      generatedSets,
      userFolders,
      latestDiagnostic,
      learnProgressBySession,
      favoriteDefaultsReset: true,
      navigation: {
        studentTab,
        teacherTab,
        overlay,
        searchQuery,
        setWordFilter,
      },
      });
      localSaveTimerRef.current = null;
    }, 650);

    return () => {
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    };
  }, [
    localStateReady,
    ownerId,
    settings,
    vocab,
    studySets,
    assignments,
    reviewQueueIds,
    studiedLog,
    learningRecords,
    studySessions,
    learningCardBuckets,
    totalXP,
    storeXP,
    redeemedRewardIds,
    streakDays,
    attendance,
    generatedSets,
    userFolders,
    latestDiagnostic,
    learnProgressBySession,
    studentTab,
    teacherTab,
    overlay,
    searchQuery,
    setWordFilter,
  ]);

  useEffect(() => {
    setStreakDays(attendance.currentStreak);
  }, [attendance.currentStreak]);

  const todayKey = dayKeyLocal(new Date());
  const studiedTodayIds = useMemo(() => {
    const ids = studiedLog.filter((x) => x.dayKey === todayKey).map((x) => x.id);
    return uniq(ids);
  }, [studiedLog, todayKey]);

  const studiedTodayCount = studiedTodayIds.length;
  const studiedWordIdSet = useMemo(() => new Set(studiedLog.map((item) => item.id)), [studiedLog]);
  const trustedLearningRecords = useMemo(
    () =>
      learningRecords.filter((record) => {
        if (!vocabById.has(record.question_id)) return false;
        if (record.id?.startsWith(LOCAL_LEARNING_RECORD_PREFIX)) return true;
        if (record.error_type === "진단") return true;
        if (studiedWordIdSet.has(record.question_id)) return true;
        return Boolean(record.id && record.user_id && record.user_id !== "guest");
      }),
    [learningRecords, studiedWordIdSet, vocabById]
  );
  const todayLearningRecords = useMemo(
    () => trustedLearningRecords.filter((record) => dayKeyLocal(new Date(record.created_at)) === todayKey),
    [trustedLearningRecords, todayKey]
  );
  const learningMetricBase = todayLearningRecords.length ? todayLearningRecords : trustedLearningRecords;
  const learningTodayQuestionCount = todayLearningRecords.length;
  const learningAccuracy = useMemo(() => {
    if (!learningMetricBase.length) return 0;
    const correct = learningMetricBase.filter((record) => record.is_correct).length;
    return Math.round((correct / learningMetricBase.length) * 100);
  }, [learningMetricBase]);
  const todayStudySessions = useMemo(
    () => studySessions.filter((session) => session.dayKey === todayKey),
    [studySessions, todayKey]
  );
  const todayStudySeconds = useMemo(
    () => todayStudySessions.reduce((sum, session) => sum + Math.max(0, session.seconds), 0),
    [todayStudySessions]
  );
  const todayStudyBonusXP = useMemo(
    () => todayStudySessions.reduce((sum, session) => sum + Math.max(0, session.bonusXP), 0),
    [todayStudySessions]
  );
  const todayStudyCourseSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        courseTitle: string;
        seconds: number;
        activityCount: number;
        questionCount: number;
        correctCount: number;
        wrongCount: number;
        knownCount: number;
        learningCount: number;
        bonusXP: number;
      }
    >();

    for (const session of todayStudySessions) {
      const key = session.course;
      const current =
        grouped.get(key) ||
        {
          courseTitle: session.courseTitle,
          seconds: 0,
          activityCount: 0,
          questionCount: 0,
          correctCount: 0,
          wrongCount: 0,
          knownCount: 0,
          learningCount: 0,
          bonusXP: 0,
        };
      current.seconds += Math.max(0, session.seconds);
      current.activityCount += 1;
      current.questionCount += Math.max(0, session.questionCount);
      current.correctCount += Math.max(0, session.correctCount);
      current.wrongCount += Math.max(0, session.wrongCount);
      current.knownCount += Math.max(0, session.knownCount);
      current.learningCount += Math.max(0, session.learningCount);
      current.bonusXP += Math.max(0, session.bonusXP);
      grouped.set(key, current);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.seconds - a.seconds || b.questionCount - a.questionCount || b.bonusXP - a.bonusXP
    );
  }, [todayStudySessions]);
  const wrongLearningRecords = useMemo(
    () =>
      trustedLearningRecords.filter(
        (record) => !record.is_correct && !SELF_ASSESSMENT_ERROR_TYPES.has(record.error_type)
      ),
    [trustedLearningRecords]
  );
  const selfAssessmentLearningRecords = useMemo(
    () =>
      trustedLearningRecords.filter(
        (record) => !record.is_correct && SELF_ASSESSMENT_ERROR_TYPES.has(record.error_type)
      ),
    [trustedLearningRecords]
  );
  const wrongWordStats = useMemo(() => {
    const stats: Record<string, { wrong: number; recent: number }> = {};
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const record of wrongLearningRecords) {
      if (!vocabById.has(record.question_id)) continue;
      const current = stats[record.question_id] || { wrong: 0, recent: 0 };
      current.wrong += 1;
      if (new Date(record.created_at).getTime() >= since) current.recent += 1;
      stats[record.question_id] = current;
    }
    return stats;
  }, [vocabById, wrongLearningRecords]);

  useEffect(() => {
    if (!localStateReady) return;
    setVocab((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const stats = wrongWordStats[item.id];
        const wrongCount = stats?.wrong ?? 0;
        const recentWrongAttempts7d = stats?.recent ?? 0;
        if (
          item.wrongCount === wrongCount &&
          item.cumulativeWrongAttempts === wrongCount &&
          item.recentWrongAttempts7d === recentWrongAttempts7d
        ) {
          return item;
        }
        changed = true;
        return {
          ...item,
          wrongCount,
          cumulativeWrongAttempts: wrongCount,
          recentWrongAttempts7d,
        };
      });
      return changed ? next : prev;
    });
  }, [localStateReady, wrongWordStats]);

  const recentWrongLearningRecords = useMemo(
    () => wrongLearningRecords.slice(0, 5),
    [wrongLearningRecords]
  );
  const learningRecordWordLabels = useMemo(
    () =>
      Object.fromEntries(
        vocab.map((item) => [item.id, `${item.word} · ${item.reading}`])
      ) as Record<string, string>,
    [vocab]
  );
  const learningWeakTop3 = useMemo(() => {
    const stats = new Map<string, { topic: string; errorType: string; subject: string; wrong: number; attempts: number }>();
    for (const record of trustedLearningRecords) {
      const key = `${record.topic}__${record.error_type}`;
      const prev = stats.get(key) || {
        topic: record.topic,
        errorType: record.error_type,
        subject: record.subject,
        wrong: 0,
        attempts: 0,
      };
      prev.attempts += 1;
      if (!record.is_correct) prev.wrong += 1;
      stats.set(key, prev);
    }
    return Array.from(stats.values())
      .filter((item) => item.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.attempts - a.attempts)
      .slice(0, 3);
  }, [trustedLearningRecords]);

  useEffect(() => {
    let mounted = true;
    if (isGuest || !user?.id) return;

    fetchLearningRecords(user.id)
      .then((records) => {
        if (!mounted) return;
        setLearningRecords(records);
        setLearningSaveError(null);
      })
      .catch((error) => {
        if (!mounted) return;
        setLearningSaveError(learningRecordErrorMessage(error));
      });

    return () => {
      mounted = false;
    };
  }, [isGuest, user?.id]);

  const actualWrongReviewIds = useMemo(
    () =>
      uniq(
        wrongLearningRecords
          .map((record) => record.question_id)
          .filter((id) => vocabById.has(id))
      ),
    [wrongLearningRecords, vocabById]
  );
  const recentWrongReviewIds = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentIds = wrongLearningRecords
      .filter((record) => new Date(record.created_at).getTime() >= since)
      .map((record) => record.question_id)
      .filter((id) => vocabById.has(id));
    const priorityIds = uniq(recentIds);
    const fallbackIds = actualWrongReviewIds.filter((id) => vocabById.has(id));
    return (priorityIds.length ? priorityIds : fallbackIds).slice(0, 30);
  }, [actualWrongReviewIds, vocabById, wrongLearningRecords]);
  const wrongReviewWordCount = recentWrongReviewIds.length;
  const wrongReviewTotalWordCount = actualWrongReviewIds.length;
  const wrongReviewAttemptCount = wrongLearningRecords.length;
  const recentWrongAttemptCount7d = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return wrongLearningRecords.filter((record) => new Date(record.created_at).getTime() >= since).length;
  }, [wrongLearningRecords]);
  const highlightWordIds = useMemo(() => vocab.filter((v) => v.sourceType === "형광펜").map((v) => v.id), [vocab]);
  const highlightWordCount = highlightWordIds.length;
  const reviewTodayCount = useMemo(() => reviewQueueIds.length, [reviewQueueIds]);
  const favoriteWordIds = useMemo(() => vocab.filter((v) => v.isFavorite).map((v) => v.id), [vocab]);
  const curiosityWordIds = useMemo(
    () =>
      vocab
        .filter((v) => v.part === "궁금한 일본어" || v.part === "궁금한 표현" || v.part === "궁금한 전문 영어" || v.questionTypes.includes("개인 검색"))
        .map((v) => v.id),
    [vocab]
  );
  const favoriteSet = useMemo<StudySet>(
    () => ({
      id: "set_favorites",
      userId: ownerId,
      ownerId,
      title: "즐겨찾기한 단어",
      description: "별표한 단어만 모아 복습하는 개인 세트",
      createdFrom: "custom",
      weakTypes: ["별표"],
      wordIds: favoriteWordIds,
      wordCount: favoriteWordIds.length,
      createdAt: 1,
      progress: favoriteWordIds.length
        ? Math.round(
            vocab
              .filter((v) => v.isFavorite)
              .reduce((sum, item) => sum + item.masteryLevel, 0) / favoriteWordIds.length
          )
        : 0,
    }),
    [favoriteWordIds, ownerId, vocab]
  );
  const curiositySet = useMemo<StudySet>(
    () => ({
      id: "set_curiosity",
      userId: ownerId,
      ownerId,
      title: "궁금한 표현",
      description: curiosityWordIds.length
        ? "검색해서 저장한 일본어·영어 표현을 모아두는 개인 세트"
        : "검색한 일본어·영어 표현이 자동으로 저장되는 개인 세트",
      createdFrom: "custom",
      weakTypes: ["개인 검색"],
      wordIds: curiosityWordIds,
      wordCount: curiosityWordIds.length,
      createdAt: 2,
      progress: curiosityWordIds.length
        ? Math.round(
            curiosityWordIds.reduce((sum, id) => sum + (vocabById.get(id)?.masteryLevel ?? 0), 0) /
              curiosityWordIds.length
          )
        : 0,
    }),
    [curiosityWordIds, ownerId, vocabById]
  );
  const highlightSet = useMemo<StudySet>(
    () => ({
      id: "set_highlight",
      userId: ownerId,
      ownerId,
      title: "형광펜 단어장",
      description: highlightWordIds.length
        ? "형광펜으로 추가한 단어만 모아 복습하는 개인 세트"
        : "형광펜으로 추가한 단어가 여기에 모입니다",
      createdFrom: "highlight",
      weakTypes: ["형광펜"],
      wordIds: highlightWordIds,
      wordCount: highlightWordIds.length,
      createdAt: 3,
      progress: highlightWordIds.length
        ? Math.round(
            highlightWordIds.reduce((sum, id) => sum + (vocabById.get(id)?.masteryLevel ?? 0), 0) /
              highlightWordIds.length
          )
        : 0,
    }),
    [highlightWordIds, ownerId, vocabById]
  );
  const sourceSetTitleById = useMemo(() => {
    const entries = [favoriteSet, curiositySet, highlightSet, ...studySets, ...generatedSets].map(
      (set) => [set.id, set.title] as const
    );
    return new Map(entries);
  }, [curiositySet, favoriteSet, generatedSets, highlightSet, studySets]);
  const wrongSet = useMemo<StudySet>(
    () => ({
      id: "set_wrong",
      userId: ownerId,
      ownerId,
      title: "전체 오답 단어장",
      description: actualWrongReviewIds.length
        ? "퀴즈·테스트에서 실제로 틀린 단어만 모아 다시 보는 전체 오답 세트"
        : "퀴즈·테스트에서 틀린 단어가 생기면 여기에 자동으로 모입니다",
      createdFrom: "wrong",
      weakTypes: ["오답"],
      wordIds: actualWrongReviewIds,
      wordCount: actualWrongReviewIds.length,
      createdAt: 4,
      progress: actualWrongReviewIds.length
        ? Math.round(
            actualWrongReviewIds.reduce((sum, id) => sum + (vocabById.get(id)?.masteryLevel ?? 0), 0) /
              actualWrongReviewIds.length
          )
        : 0,
    }),
    [actualWrongReviewIds, ownerId, vocabById]
  );
  const sourceWrongSets = useMemo<StudySet[]>(() => {
    const groups = new Map<string, { title: string; ids: string[]; updatedAt: number }>();
    wrongLearningRecords.forEach((record) => {
      const sourceKey = record.source_set_id && !reviewDerivedSetId(record.source_set_id)
        ? record.source_set_id
        : record.source_set_title
        ? `session:${record.source_set_title}`
        : "";
      if (!sourceKey || !vocabById.has(record.question_id)) return;
      const sourceTitle =
        record.source_set_title ||
        sourceSetTitleById.get(record.source_set_id || "") ||
        "세트 미지정";
      const current = groups.get(sourceKey) || { title: sourceTitle, ids: [], updatedAt: 0 };
      if (!current.ids.includes(record.question_id)) current.ids.push(record.question_id);
      current.updatedAt = Math.max(current.updatedAt, new Date(record.created_at).getTime() || 0);
      groups.set(sourceKey, current);
    });

    return Array.from(groups.entries())
      .map(([key, group]) => ({
        id: dynamicSetId("set_wrong", key),
        userId: ownerId,
        ownerId,
        title: `${group.title} · 오답 단어장`,
        description: "이 세트에서 퀴즈·테스트로 실제 틀린 단어만 모았습니다.",
        createdFrom: "wrong" as const,
        weakTypes: ["오답", group.title],
        wordIds: group.ids,
        wordCount: group.ids.length,
        createdAt: group.updatedAt || 5,
        progress: group.ids.length
          ? Math.round(group.ids.reduce((sum, id) => sum + (vocabById.get(id)?.masteryLevel ?? 0), 0) / group.ids.length)
          : 0,
      }))
      .filter((set) => set.wordCount > 0)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [ownerId, sourceSetTitleById, vocabById, wrongLearningRecords]);
  const learningCardSets = useMemo<StudySet[]>(() => {
    const groups = new Map<string, { title: string; ids: string[]; updatedAt: number }>();
    Object.entries(learningCardBuckets).forEach(([key, bucket]) => {
      const ids = uniq(bucket.wordIds).filter((id) => vocabById.has(id));
      if (!ids.length) return;
      groups.set(key, {
        title: bucket.title || sourceSetTitleById.get(key) || "학습 중 낱말카드",
        ids,
        updatedAt: bucket.updatedAt || 0,
      });
    });
    selfAssessmentLearningRecords.forEach((record) => {
      if (!vocabById.has(record.question_id)) return;
      const sourceKey = learningCardBucketKey(record.source_set_id, record.source_set_title || "기존 낱말카드");
      const sourceTitle =
        record.source_set_title ||
        sourceSetTitleById.get(record.source_set_id || "") ||
        "기존 낱말카드";
      const current = groups.get(sourceKey) || { title: sourceTitle, ids: [], updatedAt: 0 };
      if (!current.ids.includes(record.question_id)) current.ids.push(record.question_id);
      current.updatedAt = Math.max(current.updatedAt, new Date(record.created_at).getTime() || 0);
      groups.set(sourceKey, current);
    });

    return Array.from(groups.entries())
      .map(([key, group]) => ({
        id: dynamicSetId("set_learning", key),
        userId: ownerId,
        ownerId,
        title: `${group.title} · 학습 중 낱말카드`,
        description: "낱말카드에서 아직 학습 중으로 표시한 단어만 모았습니다.",
        createdFrom: "learning" as const,
        weakTypes: ["학습 중", group.title],
        wordIds: group.ids,
        wordCount: group.ids.length,
        createdAt: group.updatedAt || 6,
        progress: group.ids.length
          ? Math.round(group.ids.reduce((sum, id) => sum + (vocabById.get(id)?.masteryLevel ?? 0), 0) / group.ids.length)
          : 0,
      }))
      .filter((set) => set.wordCount > 0)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [learningCardBuckets, ownerId, selfAssessmentLearningRecords, sourceSetTitleById, vocabById]);
  const visibleStudySets = useMemo(
    () => [
      ...[...learningCardSets, ...sourceWrongSets, wrongSet, highlightSet, favoriteSet, curiositySet].filter(
        (set) => set.wordCount > 0
      ),
      ...studySets.filter((set) => !["set_favorites", "set_curiosity", "set_highlight", "set_wrong"].includes(set.id)),
    ],
    [curiositySet, favoriteSet, highlightSet, learningCardSets, sourceWrongSets, studySets, wrongSet]
  );
  const personalHomeSets = useMemo(
    () =>
      [
        ...learningCardSets,
        ...sourceWrongSets,
        highlightSet,
        wrongSet,
        favoriteSet,
        curiositySet,
        ...studySets.filter((set) => set.createdFrom !== "builtin"),
      ]
        .filter((set) => set.wordCount > 0)
        .filter((set, index, arr) => arr.findIndex((item) => item.id === set.id) === index)
        .slice(0, 4),
    [curiositySet, favoriteSet, highlightSet, learningCardSets, sourceWrongSets, studySets, wrongSet]
  );
  const courseVocab = useMemo(
    () => vocab.filter((item) => wordMatchesLearningCourse(item, settings.learningCourse)),
    [settings.learningCourse, vocab]
  );

  const recentlyStudied = useMemo(() => {
    const ids = studiedLog
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .map((x) => x.id);
    const seen = new Set<string>();
    const out: VocabItem[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const w = vocabById.get(id);
      if (!w) continue;
      seen.add(id);
      out.push(w);
      if (out.length >= 12) break;
    }
    return out;
  }, [studiedLog, vocabById]);

  function gainXP(xp: number) {
    setTotalXP((p) => p + xp);
    setStoreXP((p) => p + xp);
  }

  function recordCompletedStudySession(summary: Omit<StudySessionLog, "id" | "dayKey" | "course" | "courseTitle" | "completedAt">) {
    const courseMeta = getLearningCourseMeta(settings.learningCourse);
    const completedAt = Date.now();
    const id = `study_${completedAt}_${Math.random().toString(36).slice(2, 8)}`;
    const log: StudySessionLog = {
      id,
      dayKey: dayKeyLocal(new Date(completedAt)),
      course: settings.learningCourse,
      courseTitle: courseMeta.title,
      completedAt,
      ...summary,
    };
    setStudySessions((prev) => [log, ...prev].slice(0, 300));
  }

  function exchangeReward(item: RewardItem) {
    if (redeemedRewardIds.includes(item.id)) {
      Alert.alert(t("스토어"), t("이미 교환한 리워드입니다."));
      return;
    }
    if (storeXP < item.requiredXP) {
      Alert.alert(
        t("XP 부족"),
        `${t("교환 가능 XP가 부족합니다.")}\n${t("필요")} ${item.requiredXP} XP · ${t("보유")} ${storeXP} XP`
      );
      return;
    }

    Alert.alert(t("리워드 교환"), `${t(item.title)}\n${item.requiredXP} XP${t("를 사용합니다.")}`, [
      { text: t("취소"), style: "cancel" },
      {
        text: t("교환"),
        onPress: () => {
          setStoreXP((p) => p - item.requiredXP);
          setRedeemedRewardIds((prev) => prev.concat(item.id));
          Alert.alert(t("교환 완료"), t("리워드 교환 데모입니다. 실제 쿠폰 발급은 제휴/백엔드 연결 후 지원됩니다."));
        },
      },
    ]);
  }

  function markStudied(wordId: string) {
    setStudiedLog((prev) => prev.concat({ id: wordId, dayKey: todayKey, ts: Date.now() }));
    setAttendance((prev) => markAttendanceDay(prev, todayKey));
  }

  function queueWrongReview(wordId: string) {
    if (!vocabById.has(wordId)) return;
    setReviewQueueIds((prev) => (prev.includes(wordId) ? prev : [wordId, ...prev]));
  }

  function markLearningCard(wordId: string, source?: { sourceSetId?: string; sourceTitle?: string }) {
    if (!vocabById.has(wordId)) return;
    const key = learningCardBucketKey(source?.sourceSetId, source?.sourceTitle);
    const title = source?.sourceTitle || sourceSetTitleById.get(source?.sourceSetId || "") || "학습 중 낱말카드";
    setLearningCardBuckets((prev) => {
      const current = prev[key] || { title, wordIds: [], updatedAt: 0 };
      return {
        ...prev,
        [key]: {
          title: current.title || title,
          wordIds: current.wordIds.includes(wordId) ? current.wordIds : [wordId, ...current.wordIds],
          updatedAt: Date.now(),
        },
      };
    });
  }

  function resolveLearningCard(wordId: string) {
    setLearningCardBuckets((prev) => {
      let changed = false;
      const next: typeof prev = {};
      Object.entries(prev).forEach(([key, bucket]) => {
        const wordIds = bucket.wordIds.filter((id) => id !== wordId);
        if (wordIds.length !== bucket.wordIds.length) changed = true;
        if (wordIds.length) next[key] = { ...bucket, wordIds, updatedAt: Date.now() };
      });
      return changed ? next : prev;
    });
  }

  function recordLearningResult(record: Omit<LearningRecord, "id" | "user_id" | "created_at">) {
    const created_at = new Date().toISOString();
    const user_id = isGuest ? "guest" : user?.id;
    if (!user_id) return;

    const localRecord: LearningRecord = {
      ...record,
      id: `${LOCAL_LEARNING_RECORD_PREFIX}${created_at}_${record.question_id}`,
      user_id,
      created_at,
    };
    setLearningRecords((prev) => [localRecord, ...prev].slice(0, 100));
    if (!record.is_correct && !SELF_ASSESSMENT_ERROR_TYPES.has(record.error_type)) {
      queueWrongReview(record.question_id);
    }

    if (isGuest) return;
    if (!canModifyRecord(localRecord, user)) {
      logInternalError("Blocked learning record write for non-owner", "recordLearningResult");
      setLearningSaveError(t("학습 기록 저장 권한을 확인하지 못했습니다. 다시 로그인해 주세요."));
      return;
    }

    const {
      id: _localId,
      source_set_id: _sourceSetId,
      source_set_title: _sourceSetTitle,
      ...recordToInsert
    } = localRecord;
    insertLearningRecord(recordToInsert)
      .then((saved) => {
        setLearningSaveError(null);
        setLearningRecords((prev) => {
          const next = prev.slice();
          const idx = next.findIndex(
            (item) =>
              (item.id === localRecord.id || !item.id) &&
              item.created_at === localRecord.created_at &&
              item.question_id === localRecord.question_id
          );
          if (idx >= 0) next[idx] = saved;
          return next;
        });
      })
      .catch((error) => {
        setLearningSaveError(learningRecordErrorMessage(error));
      });
  }

  function toggleFavorite(wordId: string) {
    setVocab((prev) =>
      prev.map((v) => (v.id === wordId ? { ...v, isFavorite: !v.isFavorite } : v))
    );
  }

  function addToReview(wordId: string) {
    setReviewQueueIds((prev) => (prev.includes(wordId) ? prev : prev.concat(wordId)));
    Alert.alert(t("복습"), t("복습 큐에 추가했습니다."));
  }

  function saveCuriosityWord(rawQuery: string) {
    const dictionaryWord = lookupDictionaryWord(rawQuery);
    if (!dictionaryWord) return null;
    const term = dictionaryWord.word;

    const existing = vocab.find((item) => item.word === term || item.reading === term || item.meaningKo === term);
    if (existing) {
      Alert.alert(t("사전 검색"), t("이미 단어장에 있는 단어입니다."));
      return existing.id;
    }

    const nextWord = { ...dictionaryWord, ownerId, userId: ownerId };
    setVocab((prev) => (prev.some((item) => item.id === nextWord.id) ? prev : [nextWord, ...prev]));
    setReviewQueueIds((prev) => (prev.includes(nextWord.id) ? prev : [nextWord.id, ...prev]));
    Alert.alert(
      t("궁금한 표현 저장"),
      `${term}${t("를 개인 세트에 저장했습니다.")}\n${t("뜻과 독음은 단어 상세에서 다시 확인할 수 있습니다.")}`
    );
    return nextWord.id;
  }

  function goVocabWithSearch(q?: string) {
    const term = q?.trim() || "";
    runScreenTransition("단어장 여는 중", () => {
      setStudentTab("vocab");
      setSetWordFilter(null);
      if (term) setSearchQuery(term);
    }, { showLoading: true });
  }

  function updateWordStats(wordId: string, delta: { wrongDelta: number; masteryDelta: number }) {
    setVocab((prev) =>
      prev.map((v) => {
        if (v.id !== wordId) return v;
        const wrongCount = Math.max(0, v.wrongCount + delta.wrongDelta);
        const masteryLevel = clamp(v.masteryLevel + delta.masteryDelta, 0, 100);
        const reviewStatus: VocabItem["reviewStatus"] =
          masteryLevel >= 88 ? "Mastered" : masteryLevel >= 62 ? "Review" : masteryLevel >= 35 ? "Learning" : "New";

        return {
          ...v,
          wrongCount,
          cumulativeWrongAttempts: Math.max(0, v.cumulativeWrongAttempts + (delta.wrongDelta > 0 ? 1 : 0)),
          recentWrongAttempts7d: Math.max(0, v.recentWrongAttempts7d + (delta.wrongDelta > 0 ? 1 : 0)),
          masteryLevel,
          reviewStatus,
        };
      })
    );
  }

  const weakTop3 = useMemo<WeakTypeStat[]>(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const typeStats = new Map<string, { attempts: number; wrong: number; recentAttempts: number; recentWrong: number; subject: string }>();
    for (const record of learningRecords) {
      const typeName = record.topic || record.error_type || "문맥 이해";
      const prev = typeStats.get(typeName) || {
        attempts: 0,
        wrong: 0,
        recentAttempts: 0,
        recentWrong: 0,
        subject: record.subject,
      };
      const isRecent = new Date(record.created_at).getTime() >= since;
      prev.attempts += 1;
      if (!record.is_correct) prev.wrong += 1;
      if (isRecent) {
        prev.recentAttempts += 1;
        if (!record.is_correct) prev.recentWrong += 1;
      }
      typeStats.set(typeName, prev);
    }
    return Array.from(typeStats.entries())
      .map(([typeName, v]) => {
      const accuracy = v.attempts ? Math.round(((v.attempts - v.wrong) / v.attempts) * 100) : 100;
      const recentAccuracy7d = v.recentAttempts
        ? Math.round(((v.recentAttempts - v.recentWrong) / v.recentAttempts) * 100)
        : accuracy;
      const trend: WeakTypeStat["trend"] =
        recentAccuracy7d > accuracy + 2 ? "up" : recentAccuracy7d < accuracy - 2 ? "down" : "same";
      return {
        typeName,
        subject: v.subject,
        accuracy,
        attempts: v.attempts,
        wrongAttempts: v.wrong,
        recentAccuracy7d,
        trend,
        recommendation: `${typeName} 유형 단어를 먼저 복습하세요.`,
      };
    })
      .filter((s) => s.wrongAttempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy || b.wrongAttempts - a.wrongAttempts || b.attempts - a.attempts)
      .slice(0, 3);
  }, [learningRecords]);

  const recommendedSets = useMemo(() => {
    // Study style affects which sets to show first.
    const base = studySets.filter((s) => s.createdFrom === "builtin");
    const find = (id: string) => base.find((s) => s.id === id);
    const pick = (...ids: string[]) => {
      const picked = ids.map(find).filter(Boolean) as StudySet[];
      return picked.slice(0, 4);
    };
    const courseMeta = getLearningCourseMeta(settings.learningCourse);
    const coursePick = pick(...courseMeta.primarySetIds);

    if (settings.studyStyle === "오답집중형") {
      return [wrongSet.wordCount ? wrongSet : null, ...pick("set_recent_eju_2016_2025", "set_reason", "set_table")]
        .filter(Boolean)
        .slice(0, 4) as StudySet[];
    }
    if (coursePick.length > 0) return coursePick;
    if (profile?.goal === "TOEIC" || profile?.goal === "TOEFL" || profile?.goal === "IELTS") {
      return pick("set_english_admission", "set_business_english_sentences", "set_startup_business_english", "set_academic_abstract");
    }
    if (profile?.goal === "BusinessEnglish") {
      return pick("set_startup_business_english", "set_business_english_sentences", "set_english_admission", "set_academic_abstract");
    }
    if (profile?.goal === "BusinessJapanese") {
      return pick("set_business_japanese", "set_campus_japanese", "set_writing", "set_reading_context");
    }
    if (profile?.goal === "CampusJapanese") {
      return pick("set_campus_japanese", "set_business_japanese", "set_reading_context", "set_academic_abstract");
    }
    if (settings.studyStyle === "기출빈도형") return pick("set_recent_eju_2016_2025", "set_top100", "set_350", "set_reason");
    if (settings.studyStyle === "예문중심형") return pick("set_writing", "set_reading_relation", "set_claim", "set_table");
    if (settings.studyStyle === "문제풀이형") return pick("set_reason", "set_claim", "set_listening_notice", "set_economy");
    if (settings.studyStyle === "빠른 암기형") return pick("set_200", "set_reading_context", "set_table", "set_market_price");
    return pick("set_recent_eju_2016_2025", "set_top100", "set_table", "set_writing");
  }, [profile?.goal, studySets, settings.learningCourse, settings.studyStyle, wrongSet]);

  const defaultVocabSort = useMemo(() => {
    if (settings.learningCourse === "EJU_SCIENCE") return "중요도순" as const;
    if (settings.studyStyle === "기출빈도형") return "기출 빈도순" as const;
    if (settings.studyStyle === "오답집중형") return "오답 많은 순" as const;
    return "기출 빈도순" as const;
  }, [settings.learningCourse, settings.studyStyle]);

  function changeLearningCourse(course: LearningCourse) {
    setSettings((prev) => (prev.learningCourse === course ? prev : { ...prev, learningCourse: course }));
  }

  const classHomeworkSummary = useMemo(() => {
    if (!settings.connectedClassId) return null;
    const cls = EJUEDU_CLASSES.find((c) => c.id === settings.connectedClassId);
    if (!cls) return null;
    const list = assignments.filter((a) => a.classId === cls.id);
    if (!list.length) return null;
    const a = list[0];
    const total = Math.max(1, a.wordIds.length);
    const progress = Object.values(a.progressByStudent)[0] ?? 0;
    const pct = Math.round((progress / total) * 100);
    const availability = getAssignmentAvailability(a);
    return {
      className: cls.name,
      title: a.title,
      dueDateLabel: a.dueDate,
      progressLabel: `${progress}/${total}`,
      progressPct: pct,
      assignmentKind: a.assignmentKind || "단어 과제",
      availabilityStatusLabel: availability.statusLabel,
      availabilityLabel: availability.availableLabel,
      isOpen: availability.isOpen,
    };
  }, [assignments, settings.connectedClassId]);

  const teacherAccountSummary = useMemo(() => {
    const activeAssignments = assignments.filter((assignment) =>
      Object.values(assignment.statusByStudent).some((status) => status !== "완료")
    );
    const completionRates = assignments.map((assignment) => {
      const statuses = Object.values(assignment.statusByStudent);
      if (!statuses.length) return 0;
      return (statuses.filter((status) => status === "완료").length / statuses.length) * 100;
    });
    const avgCompletion = completionRates.length
      ? Math.round(completionRates.reduce((sum, value) => sum + value, 0) / completionRates.length)
      : 0;
    return {
      academyName: "EJUEDU",
      classCount: EJUEDU_CLASSES.length,
      studentCount: EJUEDU_STUDENTS.length,
      activeAssignmentCount: activeAssignments.length,
      pendingAssignmentCount: activeAssignments.length,
      avgCompletion,
      classNames: EJUEDU_CLASSES.map((cls) => cls.name),
    };
  }, [assignments]);

  function openWord(wordId: string) {
    setOverlay({ kind: "word", wordId });
  }
  function openSet(setId: string) {
    const set = visibleStudySets.find((item) => item.id === setId);
    const isLargeSet = (set?.wordCount || set?.wordIds.length || 0) > 160;
    runScreenTransition("세트 여는 중", () => setOverlay({ kind: "set", setId }), { showLoading: isLargeSet });
  }

  function isEditableStudySet(set: StudySet) {
    return (
      studySets.some((item) => item.id === set.id) &&
      set.createdFrom !== "builtin" &&
      set.createdFrom !== "wrong" &&
      set.createdFrom !== "learning" &&
      (canModifyRecord(set, { id: ownerId }) ||
        (set.createdFrom === "custom" && !set.userId && !set.ownerId))
    );
  }

  function openLearn(wordIds: string[], title: string, mode: LearnMode, sourceSetId?: string) {
    if (!wordIds.length) {
      Alert.alert(t("학습"), t("학습할 단어가 아직 없습니다."));
      return;
    }
    runScreenTransition("학습 준비 중", () => setOverlay({ kind: "learn", title, mode, wordIds, sourceSetId }), {
      showLoading: wordIds.length > 80,
    });
  }

  function updateLearnProgress(sessionKey: string, progress: LearnSessionProgress) {
    const storageKey = learnProgressKey(sessionKey, progress.activeMode);
    setLearnProgressBySession((prev) => {
      const current = prev[storageKey];
      if (
        current &&
        current.activeMode === progress.activeMode &&
        current.index === progress.index &&
        current.totalCount === progress.totalCount &&
        current.showMeaning === progress.showMeaning
      ) {
        return prev;
      }
      return { ...prev, [storageKey]: progress };
    });
  }

  function updateStudySetProgressFromLearn(sourceSetId: string | undefined, progress: LearnSessionProgress) {
    if (progress.activeMode === "오답 복습") return;
    if (!sourceSetId || !progress.totalCount) return;
    const nextProgress = Math.max(0, Math.min(100, Math.round((progress.index / progress.totalCount) * 100)));
    setStudySets((prev) =>
      prev.map((set) =>
        set.id === sourceSetId && nextProgress > set.progress
          ? { ...set, progress: nextProgress }
          : set
      )
    );
  }

  function startTodayLearn() {
    runScreenTransition("오늘 학습 준비 중", () => {
      const actualWrongWords = actualWrongReviewIds
        .map((id) => vocabById.get(id))
        .filter((item): item is VocabItem => Boolean(item && wordMatchesLearningCourse(item, settings.learningCourse)));
      const baseCourseVocab = courseVocab.length ? courseVocab : vocab;
      const pool =
        settings.studyStyle === "오답집중형" && actualWrongWords.length
          ? actualWrongWords
              .slice()
              .sort((a, b) => b.recentWrongAttempts7d - a.recentWrongAttempts7d || b.wrongCount - a.wrongCount)
          : settings.studyStyle === "기출빈도형"
          ? baseCourseVocab.slice().sort((a, b) => b.occurrenceCount - a.occurrenceCount)
          : baseCourseVocab.slice().sort((a, b) => b.frequencyScore - a.frequencyScore);
      const ids = pool.slice(0, Math.max(20, settings.dailyWordGoal)).map((v) => v.id);
      if (!ids.length) {
        Alert.alert(t("학습"), t("학습할 단어가 아직 없습니다."));
        return;
      }
      setOverlay({ kind: "learn", title: "오늘 학습", mode: "낱말카드", wordIds: ids });
    }, { showLoading: settings.dailyWordGoal > 80 || courseVocab.length > 400 });
  }

  function startWrongReview() {
    runScreenTransition("오답 복습 준비 중", () => {
      const ids = recentWrongReviewIds
        .map((id) => vocabById.get(id))
        .filter(Boolean)
        .sort((a, b) => (b?.recentWrongAttempts7d || 0) - (a?.recentWrongAttempts7d || 0) || (b?.wrongCount || 0) - (a?.wrongCount || 0))
        .map((v) => v!.id);
      if (!ids.length) {
        Alert.alert(t("오답 복습"), t("아직 실제 오답 기록이 없습니다. 퀴즈나 진단에서 틀린 단어가 생기면 여기에 모입니다."));
        return;
      }
      setOverlay({ kind: "learn", title: "이번 주 오답 복습", mode: "오답 복습", wordIds: ids });
    }, { showLoading: recentWrongReviewIds.length > 80 });
  }

  function openDiagnostic() {
    runScreenTransition("진단 테스트 여는 중", () => setOverlay({ kind: "diagnostic" }), { showLoading: true });
  }

  function openReport() {
    setOverlay({ kind: "report" });
  }

  const recentLearningResume = useMemo(() => {
    const candidates = Object.entries(learnProgressBySession)
      .map(([key, progress]) => {
        const total = progress.totalCount || 0;
        const index = Math.max(0, Math.min(progress.index, total));
        if (!total || index <= 0 || index >= total) return null;
        const suffix = `::${progress.activeMode}`;
        const sessionKey = key.endsWith(suffix) ? key.slice(0, -suffix.length) : key;
        const splitAt = sessionKey.indexOf("::");
        if (splitAt < 0) return null;
        const title = sessionKey.slice(0, splitAt).trim() || "최근 학습";
        const wordIds = sessionKey
          .slice(splitAt + 2)
          .split("|")
          .filter((id) => vocabById.has(id));
        if (!wordIds.length) return null;
        return {
          title,
          mode: progress.activeMode,
          wordIds,
          progressLabel: `${index}/${total}`,
          progressPct: Math.max(0, Math.min(100, Math.round((index / total) * 100))),
          updatedAt: progress.updatedAt || 0,
        };
      })
      .filter(Boolean) as Array<{
        title: string;
        mode: LearnMode;
        wordIds: string[];
        progressLabel: string;
        progressPct: number;
        updatedAt: number;
      }>;

    return candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  }, [learnProgressBySession, vocabById]);

  function openClass() {
    setOverlay({ kind: "class" });
  }

  function openHomework(assignmentId: string) {
    setOverlay({ kind: "homework", assignmentId });
  }

  function openUserFolder(folderId: string) {
    const folder = userFolders.find((f) => f.id === folderId);
    if (!folder) return;
    setOverlay({ kind: "folder", folderId });
  }

  function openTeacherClass(classId: string) {
    setOverlay({ kind: "t_class", classId });
  }
  function openTeacherStudent(studentId: string) {
    setOverlay({ kind: "t_student", studentId });
  }
  function openTeacherDistribute(classId: string | null) {
    runScreenTransition("단어 배포 여는 중", () => setOverlay({ kind: "t_distribute", classId }), { showLoading: studySets.length > 40 });
  }
  function openTeacherAssignment(assignmentId: string) {
    setOverlay({ kind: "t_assignment", assignmentId });
  }

  function createWeakSet(typeName: string) {
    const ids = vocab
      .filter((v) => v.questionTypes.includes(typeName))
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, 60)
      .map((v) => v.id);
    const set: StudySet = {
      id: `set_weak_${Date.now()}`,
      userId: ownerId,
      ownerId,
      title: `약점 기반 세트 - ${typeName}`,
      description: `${typeName} 유형 약점을 줄이기 위한 자동 생성 세트`,
      createdFrom: "diagnostic",
      weakTypes: [typeName],
      wordIds: ids,
      wordCount: ids.length,
      createdAt: Date.now(),
      progress: 0,
    };
    setGeneratedSets((p) => [set, ...p]);
    setStudySets((p) => [set, ...p]);
    Alert.alert(t("세트 생성"), `“${t(set.title)}”${t("를 만들었습니다.")}`);
    openSet(set.id);
  }

  function onDiagnosticComplete(res: DiagnosticResult, wrongWordIds: string[]) {
    setLatestDiagnostic(res);
    gainXP(Math.max(10, Math.round(res.questionCount * 1.2)));
    setAttendance((prev) => markAttendanceDay(prev, todayKey));
    uniq(wrongWordIds).forEach((wordId) => {
      const item = vocabById.get(wordId);
      if (!item) return;
      recordLearningResult({
        question_id: wordId,
        selected_answer: "진단 오답",
        correct_answer: item.meaningKo,
        is_correct: false,
        subject: item.subject,
        topic: item.part || item.questionTypes[0] || item.subject,
        error_type: "진단",
      });
    });
    setVocab((prev) =>
      prev.map((v) => (wrongWordIds.includes(v.id) ? { ...v, wrongCount: v.wrongCount + 1, cumulativeWrongAttempts: v.cumulativeWrongAttempts + 1, recentWrongAttempts7d: v.recentWrongAttempts7d + 1 } : v))
    );
  }

  function createWeakSetFromDiagnostic(weakTypes: string[], wordIds: string[]) {
    const name = weakTypes[0] || "약점";
    const ids = uniq(wordIds).slice(0, 80);
    const set: StudySet = {
      id: `set_diag_${Date.now()}`,
      userId: ownerId,
      ownerId,
      title: `진단 기반 약점 세트 - ${name}`,
      description: `진단 결과 약한 유형(${weakTypes.join(", ")}) 기반 자동 생성`,
      createdFrom: "diagnostic",
      weakTypes,
      wordIds: ids,
      wordCount: ids.length,
      createdAt: Date.now(),
      progress: 0,
    };
    setGeneratedSets((p) => [set, ...p]);
    setStudySets((p) => [set, ...p]);
    Alert.alert(t("세트 생성"), `“${t(set.title)}”${t("를 만들었습니다.")}`);
    openSet(set.id);
  }

  function normalizeStudySetRows(rows: StudySetRowInput[]) {
    return rows
      .map((row) => ({
        id: row.id,
        word: sanitizeText(row.word, 80),
        reading: sanitizeText(row.reading || row.word, 80),
        meaningKo: sanitizeText(row.meaningKo, 160),
      }))
      .filter((row) => row.word && row.meaningKo)
      .filter((row, index, arr) => {
        const key = row.id || row.word;
        return arr.findIndex((item) => (item.id || item.word) === key) === index;
      });
  }

  function buildCustomVocabItem(row: StudySetRowInput, id: string, index = 0): VocabItem | null {
    const base = vocab[0];
    if (!base) return null;
    const customSubject: VocabItem["subject"] = /[A-Za-z]/.test(row.word) ? "영어" : "일본어";
    const customPart = customSubject === "영어" ? "전문 용어" : "직접추가";
    const customTypes = customSubject === "영어" ? ["직접추가", "전문 용어", "비즈니스 영어"] : ["직접추가"];
    return {
      ...base,
      id,
      userId: ownerId,
      ownerId,
      word: row.word,
      reading: row.reading || row.word,
      meaningKo: row.meaningKo,
      level: settings.targetScore === "350+" ? "350+ 목표" : settings.targetScore === "300점" ? "300점 목표" : "200점 목표",
      subject: customSubject,
      part: customPart,
      questionTypes: customTypes,
      occurrenceCount: 0,
      frequencyScore: Math.max(0, 20 - index),
      difficulty: 2,
      importance: "중요",
      targetScore: settings.targetScore,
      appearedIn: [],
      synonyms: [],
      antonyms: [],
      relatedWords: [],
      exampleJa: customSubject === "영어" ? `${row.word}: ${row.meaningKo}` : `${row.word}を使った例文をあとで追加できます。`,
      exampleKo: `${row.meaningKo} 표현의 예문은 나중에 추가할 수 있습니다.`,
      explanationKo: customSubject === "영어" ? "학생이 직접 추가한 영어 전문 용어입니다. 실제 업무 문장과 함께 복습하면 더 오래 남습니다." : "학생이 직접 추가한 단어입니다. 뜻과 독음을 먼저 암기한 뒤 예문을 보강해보세요.",
      commonMistake: "직접 추가 표현은 교재, 업무, 수업 맥락을 함께 적어두면 복습할 때 더 정확합니다.",
      sourceType: "직접추가",
      reviewStatus: "Learning",
      wrongCount: 0,
      cumulativeWrongAttempts: 0,
      recentWrongAttempts7d: 0,
      masteryLevel: 0,
      isFavorite: false,
    };
  }

  function createCustomStudySet(input: {
    title: string;
    rows: StudySetRowInput[];
  }) {
    const createdAt = Date.now();
    const titleValidation = validateRequiredText(input.title || "직접 만든 단어장", 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("세트 만들기"), titleValidation.message);
      return;
    }
    if (input.rows.length > 200) {
      Alert.alert(t("세트 만들기"), t("입력한 문장이 너무 깁니다."));
      return;
    }

    const normalizedTitle = titleValidation.value || "직접 만든 단어장";
    const uniqueRows = normalizeStudySetRows(input.rows);

    if (!uniqueRows.length) {
      Alert.alert(t("세트 만들기"), t("추가할 단어를 한 개 이상 입력해주세요."));
      return;
    }

    const existingByWord = new Map(vocab.map((v) => [v.word, v] as const));
    const newItems: VocabItem[] = [];
    const wordIds: string[] = [];

    uniqueRows.forEach((row, index) => {
      const existing = existingByWord.get(row.word);
      if (existing) {
        wordIds.push(existing.id);
        return;
      }
      const id = `vocab_custom_${createdAt}_${index}`;
      const nextItem = buildCustomVocabItem(row, id, index);
      if (!nextItem) return;
      wordIds.push(id);
      newItems.push(nextItem);
    });

    const set: StudySet = {
      id: `set_custom_${createdAt}`,
      userId: ownerId,
      ownerId,
      title: normalizedTitle,
      description: "학생이 직접 만든 단어장",
      createdFrom: "custom",
      weakTypes: ["직접추가"],
      wordIds: uniq(wordIds),
      wordCount: uniq(wordIds).length,
      createdAt,
      progress: 0,
    };

    setVocab((prev) => newItems.concat(prev));
    setStudySets((prev) => [set, ...prev]);
    Alert.alert(t("세트 생성"), `“${set.title}”${t("를 만들었습니다.")}`);
    openSet(set.id);
  }

  function saveStudySetEdits(setId: string, input: { title: string; description: string; rows: StudySetRowInput[] }) {
    const target = studySets.find((set) => set.id === setId);
    if (!target) return;
    if (!isEditableStudySet(target)) {
      Alert.alert(t("세트 수정하기"), t("수정 권한이 없습니다."));
      return;
    }

    const titleValidation = validateRequiredText(input.title || target.title, 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("세트 수정하기"), titleValidation.message);
      return;
    }
    const uniqueRows = normalizeStudySetRows(input.rows);
    if (!uniqueRows.length) {
      Alert.alert(t("세트 수정하기"), t("추가할 단어를 한 개 이상 입력해주세요."));
      return;
    }

    const createdAt = Date.now();
    const existingById = new Map(vocab.map((item) => [item.id, item] as const));
    const existingByWord = new Map(vocab.map((item) => [item.word, item] as const));
    const resolvedRows = uniqueRows.map((row, index) => {
      if (row.id) {
        const existing = existingById.get(row.id);
        if (existing) {
          const ownEditableItem =
            canModifyRecord(existing, { id: ownerId }) ||
            (!existing.userId && !existing.ownerId && existing.sourceType === "직접추가");
          const unchanged =
            existing.word === row.word &&
            existing.reading === (row.reading || row.word) &&
            existing.meaningKo === row.meaningKo;
          if (ownEditableItem) return { ...row, resolvedId: row.id, isNew: false, shouldUpdate: true };
          if (unchanged) return { ...row, resolvedId: row.id, isNew: false, shouldUpdate: false };
          return { ...row, resolvedId: `vocab_custom_${createdAt}_${index}`, isNew: true, shouldUpdate: false };
        }
      }
      const existing = existingByWord.get(row.word);
      if (existing) return { ...row, resolvedId: existing.id, isNew: false, shouldUpdate: false };
      return { ...row, resolvedId: `vocab_custom_${createdAt}_${index}`, isNew: true, shouldUpdate: false };
    });
    const rowByExistingId = new Map(resolvedRows.filter((row) => !row.isNew && row.shouldUpdate).map((row) => [row.resolvedId, row] as const));
    const newItems = resolvedRows
      .filter((row) => row.isNew)
      .map((row, index) => buildCustomVocabItem(row, row.resolvedId, index))
      .filter((item): item is VocabItem => Boolean(item));
    const nextWordIds = uniq(resolvedRows.map((row) => row.resolvedId));

    setVocab((prev) =>
      newItems.concat(
        prev.map((item) => {
          const row = rowByExistingId.get(item.id);
          if (!row) return item;
          return {
            ...item,
            userId: item.userId || ownerId,
            ownerId: item.ownerId || ownerId,
            word: row.word,
            reading: row.reading || row.word,
            meaningKo: row.meaningKo,
            exampleJa: item.sourceType === "직접추가" ? (/[A-Za-z]/.test(row.word) ? `${row.word}: ${row.meaningKo}` : `${row.word}を使った例文をあとで追加できます。`) : item.exampleJa,
            exampleKo: item.sourceType === "직접추가" ? `${row.meaningKo} 표현의 예문은 나중에 추가할 수 있습니다.` : item.exampleKo,
          };
        })
      )
    );
    const editedSet: StudySet = {
      ...target,
      title: titleValidation.value,
      description: sanitizeText(input.description, 180) || target.description,
      wordIds: nextWordIds,
      wordCount: nextWordIds.length,
      weakTypes: target.weakTypes.length ? target.weakTypes : ["직접추가"],
    };
    setStudySets((prev) => prev.map((set) => (set.id === setId ? editedSet : set)));
    setGeneratedSets((prev) => prev.map((set) => (set.id === setId ? editedSet : set)));
    Alert.alert(t("세트 수정하기"), t("저장했습니다."));
  }

  function duplicateStudySet(setId: string) {
    const target = visibleStudySets.find((set) => set.id === setId);
    if (!target) return;
    const rows = target.wordIds
      .map((id) => vocabById.get(id))
      .filter((item): item is VocabItem => Boolean(item))
      .map((item) => ({ word: item.word, reading: item.reading, meaningKo: item.meaningKo }));
    createCustomStudySet({ title: `${target.title} 사본`, rows });
  }

  function deleteStudySet(setId: string) {
    const target = studySets.find((set) => set.id === setId);
    if (!target) return;
    if (!isEditableStudySet(target)) {
      Alert.alert(t("세트 지우기"), t("삭제 권한이 없습니다."));
      return;
    }
    const otherSetWordIds = new Set(
      studySets
        .filter((set) => set.id !== setId)
        .flatMap((set) => set.wordIds)
    );
    const removableWordIds = new Set(
      target.wordIds.filter((id) => {
        const item = vocabById.get(id);
        return Boolean(
          item &&
            item.sourceType === "직접추가" &&
            canModifyRecord(item, { id: ownerId }) &&
            !otherSetWordIds.has(id)
        );
      })
    );
    setStudySets((prev) => prev.filter((set) => set.id !== setId));
    setGeneratedSets((prev) => prev.filter((set) => set.id !== setId));
    setUserFolders((prev) => prev.map((folder) => ({ ...folder, setIds: folder.setIds.filter((id) => id !== setId) })));
    if (removableWordIds.size) {
      setVocab((prev) => prev.filter((item) => !removableWordIds.has(item.id)));
      setReviewQueueIds((prev) => prev.filter((id) => !removableWordIds.has(id)));
    }
    setSetWordFilter((prev) => (prev?.title === target.title ? null : prev));
    setOverlay({ kind: "none" });
    Alert.alert(t("세트 지우기"), t("삭제되었습니다."));
  }

  function createUserFolder(input: { title: string; description: string; setIds?: string[] }) {
    const titleValidation = validateRequiredText(input.title || "새 폴더", 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("폴더 만들기"), titleValidation.message);
      return;
    }
    const title = titleValidation.value;
    const folder: UserStudyFolder = {
      id: `folder_${Date.now()}`,
      userId: ownerId,
      ownerId,
      title,
      description: sanitizeText(input.description, 180) || "학생이 직접 만든 폴더",
      setIds: input.setIds ?? [],
      createdAt: Date.now(),
    };
    setUserFolders((prev) => [folder, ...prev]);
    switchStudentTab("library");
    Alert.alert(t("폴더 생성"), `“${folder.title}”${t("를 만들었습니다.")}`);
  }

  function addExtractedWords(items: Array<{ word: string; reading: string; meaningKo: string }>) {
    // If exists, mark as highlight; else create minimal item and append.
    const createdAt = Date.now();
    const preparedItems = items.map((item, index) => ({
      ...item,
      id: `vocab_highlight_${createdAt}_${index}_${item.word}`,
    }));
    const queuedIds = preparedItems.map((item) => {
      const hit = vocab.find((v) => v.word === item.word || (v.reading === item.reading && v.meaningKo === item.meaningKo));
      return hit?.id || item.id;
    });

    setVocab((prev) => {
      const next = prev.slice();
      for (const x of preparedItems) {
        const hitIdx = next.findIndex((v) => v.word === x.word || (v.reading === x.reading && v.meaningKo === x.meaningKo));
        if (hitIdx >= 0) {
          next[hitIdx] = { ...next[hitIdx], sourceType: "형광펜", reviewStatus: "Review" };
          continue;
        }
        const base = prev[0];
        if (!base) continue;
        next.unshift({
          ...base,
          id: x.id,
          userId: ownerId,
          ownerId,
          word: x.word,
          reading: x.reading,
          meaningKo: x.meaningKo,
          sourceType: "형광펜",
          reviewStatus: "Review",
          wrongCount: 0,
          cumulativeWrongAttempts: 0,
          recentWrongAttempts7d: 0,
          masteryLevel: 0,
          isFavorite: false,
        });
      }
      return next;
    });
    setReviewQueueIds((prev) => uniq(prev.concat(queuedIds)));
  }

  const isTeacher = settings.role === "teacher";

  const overlayView = useMemo(() => {
    if (overlay.kind === "none") return null;

    if (overlay.kind === "word") {
      const word = vocabById.get(overlay.wordId);
      if (!word) return null;
      return (
        <WordDetailScreen
          word={word}
          allVocab={vocab}
          onBack={() => setOverlay({ kind: "none" })}
          onToggleFavorite={() => toggleFavorite(word.id)}
          onAddToReview={() => addToReview(word.id)}
          onStartFlashcard={(wordIds, title) => openLearn(wordIds, title, "낱말카드")}
          onShowRelated={(wordIds, title) => openLearn(wordIds, title, "낱말카드")}
          onShowSameType={(typeName) => {
            runScreenTransition("같은 유형 여는 중", () => {
              setStudentTab("vocab");
              setSearchQuery(typeName);
              setOverlay({ kind: "none" });
            }, { showLoading: true });
          }}
        />
      );
    }

    if (overlay.kind === "set") {
      const set = visibleStudySets.find((s) => s.id === overlay.setId);
      if (!set) return null;
      return (
        <SetDetailScreen
          set={set}
          vocabById={vocabById}
          onBack={() => setOverlay({ kind: "none" })}
          onOpenHighlight={() => setHighlightOpen(true)}
          onOpenWord={(id) => openWord(id)}
          canEdit={isEditableStudySet(set)}
          onSaveSetEdits={saveStudySetEdits}
          onDuplicateSet={duplicateStudySet}
          onDeleteSet={deleteStudySet}
          onExtractImportFile={async (file) => {
            if (isGuest) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              return [
                { word: "残る", reading: "のこる", meaningKo: "남다" },
                { word: "増える", reading: "ふえる", meaningKo: "늘다" },
                { word: "割れる", reading: "われる", meaningKo: "깨지다" },
              ];
            }
            return (await extractHighlightWordsFromFile(file)).map((item) => ({
              word: item.word,
              reading: item.reading,
              meaningKo: item.meaningKo,
            }));
          }}
          onOpenWordListForSet={(setId) => {
            const set2 = visibleStudySets.find((s) => s.id === setId);
            if (!set2) return;
            runScreenTransition("세트 단어 여는 중", () => {
              setStudentTab("vocab");
              setSearchQuery("");
              setSetWordFilter({ title: set2.title, wordIds: set2.wordIds });
              setOverlay({ kind: "none" });
            }, { showLoading: set2.wordIds.length > 80 });
          }}
          onStartFlashcard={(ids, title) => openLearn(ids, title, "낱말카드", set.id)}
          onStartLearn={(ids, title) => {
            const mode: LearnMode =
              settings.studyStyle === "예문중심형"
                ? "예문 빈칸"
                : settings.studyStyle === "문제풀이형"
                ? "뜻 맞히기"
                : settings.studyStyle === "기출빈도형"
                ? "뜻 맞히기"
                : "낱말카드";
            openLearn(ids, title, mode, set.id);
          }}
          onStartTest={(ids, title) => openLearn(ids, `${title} (테스트 데모)`, "뜻 맞히기", set.id)}
          onStartReview={(ids, title) => {
            const actualIds = ids.filter((id) => actualWrongReviewIds.includes(id));
            if (!actualIds.length) {
              Alert.alert(t("오답 복습"), t("이 세트에서 실제로 틀린 단어가 아직 없습니다."));
              return;
            }
            openLearn(actualIds.slice(0, 30), title, "오답 복습");
          }}
        />
      );
    }

    if (overlay.kind === "folder") {
      const folder = userFolders.find((item) => item.id === overlay.folderId);
      if (!folder) return null;
      return (
        <UserFolderDetailScreen
          folder={folder}
          studySets={visibleStudySets}
          onBack={() => setOverlay({ kind: "none" })}
          onOpenSet={(id) => openSet(id)}
        />
      );
    }

    if (overlay.kind === "learn") {
      const words = overlay.wordIds.map((id) => vocabById.get(id)).filter(Boolean) as VocabItem[];
      const sessionKey = learnSessionKey(overlay.title, overlay.wordIds);
      const sourceSetTitle = overlay.sourceSetId
        ? sourceSetTitleById.get(overlay.sourceSetId) || overlay.title
        : overlay.title;
      const progressByMode = LEARN_MODES.reduce<Partial<Record<LearnMode, LearnSessionProgress>>>((acc, learnMode) => {
        const saved = learnProgressBySession[learnProgressKey(sessionKey, learnMode)];
        const legacy = learnProgressBySession[sessionKey];
        const progress = saved || (legacy?.activeMode === learnMode ? legacy : undefined);
        if (progress) acc[learnMode] = progress;
        return acc;
      }, {});
      return (
        <LearnScreen
          sessionKey={sessionKey}
          title={overlay.title}
          mode={overlay.mode}
          studyStyle={settings.studyStyle}
          words={words}
          sourceSetId={overlay.sourceSetId}
          sourceSetTitle={sourceSetTitle}
          totalWordCount={overlay.wordIds.length}
          initialProgress={
            learnProgressBySession[learnProgressKey(sessionKey, overlay.mode)] ||
            (learnProgressBySession[sessionKey]?.activeMode === overlay.mode ? learnProgressBySession[sessionKey] : undefined)
          }
          initialProgressByMode={progressByMode}
          wrongReviewWordIds={actualWrongReviewIds}
          onProgressChange={(progress) => {
            updateLearnProgress(sessionKey, progress);
            updateStudySetProgressFromLearn(overlay.sourceSetId, progress);
          }}
          onBack={() => setOverlay({ kind: "none" })}
          onGainXP={(xp) => gainXP(xp)}
          onUpdateWordStats={(wordId, delta) => updateWordStats(wordId, delta)}
          onMarkStudied={(wordId) => markStudied(wordId)}
          onMarkLearningCard={(wordId, source) => markLearningCard(wordId, source)}
          onResolveLearningCard={(wordId) => resolveLearningCard(wordId)}
          onToggleFavorite={(wordId) => toggleFavorite(wordId)}
          onRecordResult={recordLearningResult}
          onCompleteSession={recordCompletedStudySession}
        />
      );
    }

    if (overlay.kind === "diagnostic") {
      return (
        <DiagnosticScreen
          vocab={vocab}
          learningCourse={settings.learningCourse}
          onBack={() => setOverlay({ kind: "none" })}
          onComplete={(res, wrongIds) => {
            onDiagnosticComplete(res, wrongIds);
          }}
          onCreateWeakSet={(weakTypes, wordIds) => createWeakSetFromDiagnostic(weakTypes, wordIds)}
          latestResult={latestDiagnostic}
        />
      );
    }

    if (overlay.kind === "report") {
      return (
        <ReportScreen
          vocab={vocab}
          studiedTodayIds={studiedTodayIds}
          reviewQueueIds={reviewQueueIds}
          generatedSets={generatedSets}
          weakTop3={weakTop3}
          latestDiagnostic={latestDiagnostic}
          onBack={() => setOverlay({ kind: "none" })}
        />
      );
    }

    if (overlay.kind === "class") {
      return (
        <StudentClassScreen
          settings={settings}
          classes={EJUEDU_CLASSES}
          assignments={assignments}
          onBack={() => setOverlay({ kind: "none" })}
          onOpenHomework={(assignmentId) => openHomework(assignmentId)}
        />
      );
    }

    if (overlay.kind === "homework") {
      const a = assignments.find((x) => x.id === overlay.assignmentId);
      if (!a) return null;
      return (
        <HomeworkDetailScreen
          assignment={a}
          vocabById={vocabById}
          studyStyle={settings.studyStyle}
          onBack={() => setOverlay({ kind: "none" })}
          onStartHomeworkLearn={(ids, title, mode) => openLearn(ids, title, mode)}
          onMarkHomeworkDone={(assignmentId) => {
            setAssignments((prev) =>
              prev.map((x) => {
                if (x.id !== assignmentId) return x;
                const cls = EJUEDU_CLASSES.find((c) => c.id === x.classId);
                const next = { ...x, statusByStudent: { ...x.statusByStudent }, progressByStudent: { ...x.progressByStudent }, accuracyByStudent: { ...x.accuracyByStudent } };
                for (const sid of cls?.studentIds || []) {
                  next.statusByStudent[sid] = "완료";
                  next.progressByStudent[sid] = x.wordIds.length;
                  next.accuracyByStudent[sid] = Math.max(x.requiredAccuracy, next.accuracyByStudent[sid] || x.requiredAccuracy);
                }
                return next;
              })
            );
            gainXP(40);
            Alert.alert(t("과제 완료"), `${t("프로토타입 완료 처리")}: XP +40`);
          }}
        />
      );
    }

    if (overlay.kind === "t_class") {
      const cls = EJUEDU_CLASSES.find((c) => c.id === overlay.classId);
      if (!cls) return null;
      return (
        <TeacherClassDetailScreen
          cls={cls}
          students={EJUEDU_STUDENTS}
          assignments={assignments}
          onBack={() => setOverlay({ kind: "none" })}
          onOpenStudent={(studentId) => openTeacherStudent(studentId)}
          onOpenAssignment={(assignmentId) => openTeacherAssignment(assignmentId)}
          onGoDistributePrefill={(classId) => openTeacherDistribute(classId)}
        />
      );
    }

    if (overlay.kind === "t_student") {
      const s = EJUEDU_STUDENTS.find((x) => x.id === overlay.studentId);
      if (!s) return null;
      return (
        <TeacherStudentDetailScreen
          student={s}
          assignments={assignments}
          onBack={() => setOverlay({ kind: "none" })}
        />
      );
    }

    if (overlay.kind === "t_distribute") {
      return (
        <TeacherDistributeScreen
          classes={EJUEDU_CLASSES}
          studySets={studySets}
          vocab={vocab}
          prefillClassId={overlay.classId}
          onBack={() => setOverlay({ kind: "none" })}
          onAssign={(a) => {
            setAssignments((prev) => [{ ...a, userId: ownerId, ownerId }, ...prev]);
            setOverlay({ kind: "none" });
          }}
        />
      );
    }

    if (overlay.kind === "t_assignment") {
      const a = assignments.find((x) => x.id === overlay.assignmentId);
      if (!a) return null;
      const cls = EJUEDU_CLASSES.find((c) => c.id === a.classId);
      if (!cls) return null;
      return (
        <TeacherAssignmentDetailScreen
          assignment={a}
          cls={cls}
          students={EJUEDU_STUDENTS}
          onBack={() => setOverlay({ kind: "none" })}
          onOpenStudent={(studentId) => openTeacherStudent(studentId)}
          onExtendDueDate={(assignmentId) => {
            setAssignments((prev) =>
              prev.map((x) => (x.id === assignmentId ? { ...x, dueDate: `${x.dueDate} (연장)` } : x))
            );
            Alert.alert(t("마감 연장"), t("마감 연장 데모: 날짜 표시에만 반영했습니다."));
          }}
          onUpdateMemo={(assignmentId) => {
            setAssignments((prev) =>
              prev.map((x) => (x.id === assignmentId ? { ...x, teacherMemo: `${x.teacherMemo} (수정됨)` } : x))
            );
            Alert.alert(t("메모 수정"), t("메모 수정 데모: 문구에 '(수정됨)'을 추가했습니다."));
          }}
        />
      );
    }

    return null;
  }, [
    overlay,
    vocabById,
    vocab,
    studySets,
    visibleStudySets,
    sourceSetTitleById,
    settings.studyStyle,
    settings,
    studiedTodayIds,
    actualWrongReviewIds,
    reviewQueueIds,
    generatedSets,
    weakTop3,
    latestDiagnostic,
    assignments,
    t,
  ]);

  const studentMain = (
    <>
      {studentTab === "home" ? (
        <StudentHomeScreen
          studentName={displayName}
          profileGoal={profileGoalLabel(profile)}
          profileLevel={profile?.current_level}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          dailyWordGoal={settings.dailyWordGoal}
          studiedTodayCount={studiedTodayCount}
          streakDays={streakDays}
          longestStreak={attendance.longestStreak}
          attendanceDates={attendance.checkedDates}
          totalXP={totalXP}
          storeXP={storeXP}
          rewardItems={rewardStoreItems}
          redeemedRewardIds={redeemedRewardIds}
          learningTodayQuestionCount={learningTodayQuestionCount}
          learningAccuracy={learningAccuracy}
          todayStudySeconds={todayStudySeconds}
          todayStudyBonusXP={todayStudyBonusXP}
          todayStudyCourseSummaries={todayStudyCourseSummaries}
          recentLearningResume={
            recentLearningResume
              ? {
                  title: recentLearningResume.title,
                  mode: recentLearningResume.mode,
                  progressLabel: recentLearningResume.progressLabel,
                  progressPct: recentLearningResume.progressPct,
                }
              : null
          }
          recentWrongLearningRecords={recentWrongLearningRecords}
          learningRecordWordLabels={learningRecordWordLabels}
          learningWeakTop3={learningWeakTop3}
          learningSaveError={learningSaveError}
          reviewTodayCount={reviewTodayCount}
          wrongReviewWordCount={wrongReviewWordCount}
          wrongReviewTotalWordCount={wrongReviewTotalWordCount}
          wrongReviewAttemptCount={wrongReviewAttemptCount}
          recentWrongAttemptCount7d={recentWrongAttemptCount7d}
          highlightWordCount={highlightWordCount}
          personalSets={personalHomeSets}
          userFolders={userFolders}
          recommendedSets={recommendedSets}
          recentlyStudied={recentlyStudied}
          classHomeworkSummary={classHomeworkSummary}
          onGoVocab={goVocabWithSearch}
          onStartTodayLearn={startTodayLearn}
          onResumeRecentLearning={() => {
            if (!recentLearningResume) {
              startTodayLearn();
              return;
            }
            openLearn(
              recentLearningResume.wordIds,
              recentLearningResume.title,
              recentLearningResume.mode
            );
          }}
          onStartWrongReview={startWrongReview}
          onStartDiagnostic={openDiagnostic}
          onOpenHighlight={() => setHighlightOpen(true)}
          onOpenWord={(id) => openWord(id)}
          onOpenSet={(id) => openSet(id)}
          onOpenUserFolder={(id) => openUserFolder(id)}
          onOpenClass={openClass}
          onOpenReport={openReport}
          onOpenLibrary={() => switchStudentTab("library")}
          onOpenMy={() => switchStudentTab("my")}
          onExchangeReward={exchangeReward}
          onWeakTypeCreateSet={(typeName) => createWeakSet(typeName)}
        />
      ) : null}

      {studentTab === "vocab" ? (
        <VocabularyScreen
          vocab={vocab}
          studySets={visibleStudySets}
          userFolders={userFolders}
          initialQuery={searchQuery}
          defaultSort={defaultVocabSort}
          learningCourse={settings.learningCourse}
          wrongWordStats={wrongWordStats}
          onOpenWord={(id) => openWord(id)}
          onOpenSet={(id) => openSet(id)}
          onOpenUserFolder={(id) => openUserFolder(id)}
          setWordFilter={setWordFilter}
          onClearSetWordFilter={() => setSetWordFilter(null)}
          onToggleFavorite={(id) => toggleFavorite(id)}
          onLookupDictionary={lookupDictionaryWord}
          onSaveCuriosityWord={saveCuriosityWord}
          onChangeLearningCourse={changeLearningCourse}
        />
      ) : null}

      {studentTab === "library" ? (
        <VocabularyScreen
          vocab={vocab}
          studySets={visibleStudySets}
          userFolders={userFolders}
          initialQuery={searchQuery}
          defaultSort={defaultVocabSort}
          learningCourse={settings.learningCourse}
          wrongWordStats={wrongWordStats}
          title="라이브러리"
          subtitle="공식 학습 세트에서 바로 학습을 시작하세요."
          initialMode="세트"
          lockMode
          onOpenWord={(id) => openWord(id)}
          onOpenSet={(id) => openSet(id)}
          onOpenUserFolder={(id) => openUserFolder(id)}
          onToggleFavorite={(id) => toggleFavorite(id)}
          onLookupDictionary={lookupDictionaryWord}
          onSaveCuriosityWord={saveCuriosityWord}
          onChangeLearningCourse={changeLearningCourse}
        />
      ) : null}

      {studentTab === "my" ? (
        <MyScreen
          studentName={displayName}
          settings={settings}
          setSettings={setSettings}
          onRoleChange={switchUserRole}
          teacherSummary={teacherAccountSummary}
          onSignOut={signOut}
        />
      ) : null}

      <StudentBottomNav tab={studentTab} setTab={switchStudentTab} onCreatePress={() => setCreateHubOpen(true)} />
    </>
  );

  const teacherMain = (
    <>
      {teacherTab === "home" ? (
        <TeacherHomeScreen
          classes={EJUEDU_CLASSES}
          students={EJUEDU_STUDENTS}
          assignments={assignments}
          onGoCreateAssignment={() => switchTeacherTab("distribute")}
          onGoClasses={() => switchTeacherTab("classes")}
          onGoStatus={() => switchTeacherTab("status")}
        />
      ) : null}
      {teacherTab === "classes" ? (
        <TeacherClassesScreen
          classes={EJUEDU_CLASSES}
          students={EJUEDU_STUDENTS}
          assignments={assignments}
          onOpenClass={(classId) => openTeacherClass(classId)}
        />
      ) : null}

      {teacherTab === "distribute" ? (
        <TeacherDistributeScreen
          classes={EJUEDU_CLASSES}
          studySets={studySets}
          vocab={vocab}
          prefillClassId={null}
          onBack={() => switchTeacherTab("home")}
          onAssign={(a) => setAssignments((prev) => [{ ...a, userId: ownerId, ownerId }, ...prev])}
        />
      ) : null}

      {teacherTab === "status" ? (
        <TeacherStatusScreen
          classes={EJUEDU_CLASSES}
          students={EJUEDU_STUDENTS}
          assignments={assignments}
          onOpenAssignment={(assignmentId) => openTeacherAssignment(assignmentId)}
        />
      ) : null}

      {teacherTab === "my" ? (
        <MyScreen
          studentName={displayName}
          settings={settings}
          setSettings={setSettings}
          onRoleChange={switchUserRole}
          teacherSummary={teacherAccountSummary}
          onTeacherOpenClasses={() => switchTeacherTab("classes")}
          onTeacherOpenDistribute={() => switchTeacherTab("distribute")}
          onTeacherOpenStatus={() => switchTeacherTab("status")}
          onSignOut={signOut}
        />
      ) : null}
      <TeacherBottomNav tab={teacherTab} setTab={switchTeacherTab} />
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.app}>
        <View style={styles.shell}>{isTeacher ? teacherMain : studentMain}</View>

        {overlayView ? <View style={styles.overlay}>{overlayView}</View> : null}

        <HighlightModal
          visible={highlightOpen}
          close={() => setHighlightOpen(false)}
          vocab={vocab}
          onAddExtractedWords={(items) => addExtractedWords(items)}
          onExtractFile={isGuest ? undefined : (file) => extractHighlightWordsFromFile(file)}
        />

        <CreateHubSheet
          visible={createHubOpen}
          close={() => setCreateHubOpen(false)}
          onCreateSet={() => {
            setCreateHubOpen(false);
            setQuickCreateSetOpen(true);
          }}
          onCreateFolder={() => {
            setCreateHubOpen(false);
            setFolderCreateOpen(true);
          }}
          onOpenClass={() => {
            setCreateHubOpen(false);
            openClass();
          }}
        />

        <QuickCreateSetModal
          visible={quickCreateSetOpen}
          close={() => setQuickCreateSetOpen(false)}
          onCreate={(input) => {
            createCustomStudySet(input);
            setQuickCreateSetOpen(false);
            switchStudentTab("library");
          }}
        />

        <CreateFolderModal
          visible={folderCreateOpen}
          close={() => setFolderCreateOpen(false)}
          studySets={studySets}
          onCreate={(input) => {
            createUserFolder(input);
            setFolderCreateOpen(false);
          }}
        />

        {transitionBlocking ? <ScreenTransitionOverlay label={transitionLabel} /> : null}
      </View>
    </SafeAreaView>
  );
}

function ScreenTransitionOverlay({ label }: { label: string | null }) {
  const { t } = useI18n();
  if (!label) {
    return <View style={styles.transitionTapShield} pointerEvents="auto" />;
  }
  return (
    <View style={styles.transitionOverlay} pointerEvents="auto">
      <View style={styles.transitionCard}>
        <ActivityIndicator color={COLORS.text} />
        <View>
          <Text style={styles.transitionTitle}>{t("로딩 중...")}</Text>
          <Text style={styles.transitionText}>{t(label)}</Text>
        </View>
      </View>
    </View>
  );
}

function StudentBottomNav({
  tab,
  setTab,
  onCreatePress,
}: {
  tab: StudentTab;
  setTab: (t: StudentTab) => void;
  onCreatePress: () => void;
}) {
  const tabs: Array<{ id: StudentTab | "create"; label: string; icon: NavIconName }> = [
    { id: "home", label: "홈", icon: "home" },
    { id: "vocab", label: "단어장", icon: "cards" },
    { id: "create", label: "만들기", icon: "plus" },
    { id: "library", label: "라이브러리", icon: "library" },
    { id: "my", label: "마이", icon: "user" },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((t) => (
        t.id === "create" ? (
          <CreateNavItem key={t.id} icon={t.icon} label={t.label} onPress={onCreatePress} />
        ) : (
          <NavItem key={t.id} active={tab === t.id} icon={t.icon} label={t.label} onPress={() => setTab(t.id as StudentTab)} />
        )
      ))}
    </View>
  );
}

function TeacherBottomNav({ tab, setTab }: { tab: TeacherTab; setTab: (t: TeacherTab) => void }) {
  const tabs: Array<{ id: TeacherTab; label: string; icon: NavIconName }> = [
    { id: "home", label: "홈", icon: "home" },
    { id: "classes", label: "클래스", icon: "class" },
    { id: "distribute", label: "단어 배포", icon: "send" },
    { id: "status", label: "과제 현황", icon: "list" },
    { id: "my", label: "마이", icon: "user" },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((t) => (
        <NavItem key={t.id} active={tab === t.id} icon={t.icon} label={t.label} onPress={() => setTab(t.id)} />
      ))}
    </View>
  );
}

type NavIconName = "home" | "cards" | "plus" | "library" | "user" | "class" | "send" | "list";

function NavItem({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: NavIconName;
  label: string;
  onPress: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.navPressable,
        active && styles.navActive,
        pressed && PRESS_FEEDBACK.nav,
      ]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityLabel={t(label)}
      accessibilityState={{ selected: active }}
    >
      <View style={{ alignItems: "center" }}>
        <View style={[styles.navIconCircle, active && styles.navIconCircleActive]}>
          <NavGlyph name={icon} active={active} />
        </View>
        <Text style={[styles.navLabel, active && { color: COLORS.text }]}>{t(label)}</Text>
      </View>
    </Pressable>
  );
}

function NavGlyph({ name, active }: { name: NavIconName; active: boolean }) {
  const color = active ? COLORS.text : COLORS.muted;
  const icons: Record<NavIconName, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; size: number }> = {
    home: { active: "home", inactive: "home-outline", size: 24 },
    cards: { active: "book", inactive: "book-outline", size: 24 },
    plus: { active: "add", inactive: "add", size: 30 },
    library: { active: "library", inactive: "library-outline", size: 24 },
    user: { active: "person-circle", inactive: "person-circle-outline", size: 27 },
    class: { active: "people", inactive: "people-outline", size: 24 },
    send: { active: "paper-plane", inactive: "paper-plane-outline", size: 23 },
    list: { active: "clipboard", inactive: "clipboard-outline", size: 24 },
  };
  const selectedIcon = icons[name];

  return (
    <Ionicons
      name={active ? selectedIcon.active : selectedIcon.inactive}
      size={selectedIcon.size}
      color={color}
    />
  );
}

function CreateNavItem({ label, onPress }: { icon: NavIconName; label: string; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.navPressable,
        styles.createNavPressable,
        pressed && PRESS_FEEDBACK.nav,
      ]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t(label)}
    >
      <View style={{ alignItems: "center" }}>
        <View style={styles.createNavCircle}>
          <Ionicons name="add" size={34} color={COLORS.text} />
        </View>
        <Text style={styles.createNavLabel}>{t(label)}</Text>
      </View>
    </Pressable>
  );
}

function CreateHubSheet({
  visible,
  close,
  onCreateSet,
  onCreateFolder,
  onOpenClass,
}: {
  visible: boolean;
  close: () => void;
  onCreateSet: () => void;
  onCreateFolder: () => void;
  onOpenClass: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.createDim} onPress={close} accessibilityRole="button" accessibilityLabel={t("닫기")}>
        <Pressable style={styles.createSheet} onPress={(event) => event.stopPropagation()} accessibilityRole="menu">
          <View style={styles.sheetHandle} />
          <CreateActionRow icon="albums-outline" activeIcon="albums" title="낱말카드 세트" subtitle="한 장씩 추가하거나 붙여넣기" onPress={onCreateSet} active />
          <CreateActionRow icon="folder-outline" activeIcon="folder" title="폴더" subtitle="내 단어장을 묶을 폴더 만들기" onPress={onCreateFolder} />
          <CreateActionRow icon="people-outline" activeIcon="people" title="클래스" subtitle="연결된 클래스와 과제 보기" onPress={onOpenClass} />
          <Pressable style={({ pressed }) => [styles.sheetCancel, pressed && PRESS_FEEDBACK.soft]} onPress={close} accessibilityRole="button" accessibilityLabel={t("취소")}>
            <Text style={styles.sheetCancelText}>{t("취소")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CreateActionRow({
  icon,
  activeIcon,
  title,
  subtitle,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Pressable style={({ pressed }) => [styles.createActionRow, pressed && PRESS_FEEDBACK.soft]} onPress={onPress} accessibilityRole="button" accessibilityLabel={t(title)}>
      <View style={[styles.createActionIcon, active && styles.createActionIconActive]}>
        <Ionicons
          name={active && activeIcon ? activeIcon : icon}
          size={27}
          color={active ? COLORS.text : "#C9D0F4"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.createActionTitle}>{t(title)}</Text>
        <Text style={styles.createActionSubtitle}>{t(subtitle)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    </Pressable>
  );
}

function QuickCreateSetModal({
  visible,
  close,
  onCreate,
}: {
  visible: boolean;
  close: () => void;
  onCreate: (input: { title: string; rows: Array<{ word: string; reading: string; meaningKo: string }> }) => void;
}) {
  const { t, tm, language } = useI18n();
  const [title, setTitle] = useState("");
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [rawText, setRawText] = useState("");
  const [manualRows, setManualRows] = useState<Array<{ word: string; reading: string; meaningKo: string }>>([]);
  const [wordInput, setWordInput] = useState("");
  const [readingInput, setReadingInput] = useState("");
  const [meaningInput, setMeaningInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const bulkRows = useMemo(() => parseCreateSetRows(rawText), [rawText]);
  const rows = useMemo(() => manualRows.concat(bulkRows), [bulkRows, manualRows]);
  const exampleText = [
    "product-market fit\tPMF\t제품-시장 적합성",
    "runway\trunway\t남은 운영 가능 기간",
    "お世話になっております\tおせわになっております\t비즈니스 메일 첫인사",
  ].join("\n");

  function submit() {
    if (rawText.trim()) {
      const bulkValidation = validateBulkScheduleImportText(rawText, language);
      if (!bulkValidation.ok) {
        Alert.alert(t("세트 만들기"), bulkValidation.message);
        return;
      }
    }
    if (!rows.length) {
      Alert.alert(t("세트 만들기"), t("단어 카드를 한 장 이상 추가해주세요."));
      return;
    }
    const titleValidation = validateRequiredText(title || "내 단어장", 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("세트 만들기"), titleValidation.message);
      return;
    }
    onCreate({ title: titleValidation.value, rows });
    setTitle("");
    setDescription("");
    setDescriptionOpen(false);
    setRawText("");
    setManualRows([]);
    setWordInput("");
    setReadingInput("");
    setMeaningInput("");
    setEditingIndex(null);
  }

  function addOrUpdateManualRow() {
    const wordValidation = validateRequiredText(wordInput, 40, language);
    if (!wordValidation.ok) {
      Alert.alert(t("단어 추가"), wordValidation.message);
      return;
    }
    const meaningValidation = validateRequiredText(meaningInput, 120, language);
    if (!meaningValidation.ok) {
      Alert.alert(t("단어 추가"), meaningValidation.message);
      return;
    }
    const nextRow = {
      word: wordValidation.value,
      reading: sanitizeText(readingInput, 60) || wordValidation.value,
      meaningKo: meaningValidation.value,
    };
    setManualRows((prev) => {
      if (editingIndex === null) return prev.concat(nextRow);
      return prev.map((row, index) => (index === editingIndex ? nextRow : row));
    });
    setWordInput("");
    setReadingInput("");
    setMeaningInput("");
    setEditingIndex(null);
  }

  function editManualRow(index: number) {
    const row = manualRows[index];
    if (!row) return;
    setWordInput(row.word);
    setReadingInput(row.reading);
    setMeaningInput(row.meaningKo);
    setEditingIndex(index);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.createModalSafe}>
        <ScrollView style={styles.createModalScreen} contentContainerStyle={styles.createModalScroll}>
          <View style={styles.createModalTop}>
            <Pressable style={({ pressed }) => [styles.roundClose, pressed && PRESS_FEEDBACK.soft]} onPress={close} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Text style={styles.roundCloseText}>×</Text>
            </Pressable>
            <Text style={styles.createModalTitle}>{t("낱말카드 세트 만들기")}</Text>
            <View style={styles.createTopActions}>
              <Pressable style={({ pressed }) => [styles.roundSmall, pressed && PRESS_FEEDBACK.soft]} onPress={() => Alert.alert(t("설정"), t("언어와 공개 범위는 만든 뒤에도 수정할 수 있습니다."))} accessibilityRole="button" accessibilityLabel={t("설정")}>
                <Text style={styles.roundSmallText}>⚙</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.roundSmall, pressed && PRESS_FEEDBACK.soft]} onPress={submit} accessibilityRole="button" accessibilityLabel={t("세트 만들기")}>
                <Text style={styles.roundSmallText}>✓</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            placeholder={t("과목, 주제, 학년, 시험 등")}
            placeholderTextColor="#9EA4C8"
            style={styles.titleLineInput}
          />
          <Text style={styles.lineLabel}>{t("제목")}</Text>

          <View style={styles.createToolbar}>
            <Pressable style={({ pressed }) => [styles.toolbarBtn, pressed && PRESS_FEEDBACK.soft]} onPress={() => setDescriptionOpen((p) => !p)} accessibilityRole="button" accessibilityLabel={t("설명")}>
              <Text style={styles.toolbarBtnText}>+ {t("설명")}</Text>
            </Pressable>
          </View>

          {descriptionOpen ? (
            <TextInput
              value={description}
              onChangeText={setDescription}
              maxLength={180}
              placeholder={t("설명을 입력하세요.")}
              placeholderTextColor="#7B82A6"
              style={styles.descriptionInput}
            />
          ) : null}

          <Card style={styles.manualCardEditor}>
            <Text style={styles.createHint}>{t("카드 한 장씩 추가")}</Text>
            <TextInput
              value={wordInput}
              onChangeText={setWordInput}
              maxLength={40}
              placeholder={t("단어/표현")}
              placeholderTextColor="#6F769B"
              style={styles.manualInput}
            />
            <TextInput
              value={readingInput}
              onChangeText={setReadingInput}
              maxLength={60}
              placeholder={t("읽는 법 또는 약어")}
              placeholderTextColor="#6F769B"
              style={styles.manualInput}
            />
            <TextInput
              value={meaningInput}
              onChangeText={setMeaningInput}
              maxLength={120}
              placeholder={t("뜻")}
              placeholderTextColor="#6F769B"
              style={styles.manualInput}
            />
            <Row style={{ marginTop: 10 }}>
              <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={addOrUpdateManualRow}>
                <Text style={styles.secondaryBtnText}>{t(editingIndex === null ? "카드 추가" : "수정 저장")}</Text>
              </Pressable>
              {editingIndex !== null ? (
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]}
                  onPress={() => {
                    setWordInput("");
                    setReadingInput("");
                    setMeaningInput("");
                    setEditingIndex(null);
                  }}
                >
                  <Text style={styles.secondaryBtnText}>{t("취소")}</Text>
                </Pressable>
              ) : null}
            </Row>
          </Card>

          <Text style={styles.createHint}>{t("형식: 단어/표현 [탭/쉼표] 읽는 법 [탭/쉼표] 뜻")}</Text>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            maxLength={12000}
            multiline
            textAlignVertical="top"
            placeholder={"product-market fit\tPMF\t제품-시장 적합성\nお世話になっております\tおせわになっております\t비즈니스 메일 첫인사"}
            placeholderTextColor="#6F769B"
            style={styles.quizletBulkInput}
          />

          <View style={styles.createBottomBar}>
            <Pressable style={({ pressed }) => [styles.bottomTool, pressed && PRESS_FEEDBACK.soft]} onPress={() => setRawText(exampleText)} accessibilityRole="button" accessibilityLabel={t("예시 넣기")}>
              <Text style={styles.bottomToolText}>＋ {t("예시 넣기")}</Text>
            </Pressable>
            <Text style={styles.previewCount}>{t("미리보기")} {rows.length}{t("개")}</Text>
          </View>

          {manualRows.map((row, idx) => (
            <View key={`${row.word}_${idx}`} style={styles.quickPreviewRow}>
              <Text style={styles.quickPreviewWord}>{row.word}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickPreviewMeta}>{row.reading} · {tm(row.meaningKo)}</Text>
              </View>
              <Pressable onPress={() => editManualRow(idx)} hitSlop={8}>
                <Text style={styles.quickRowAction}>{t("수정")}</Text>
              </Pressable>
              <Pressable onPress={() => setManualRows((prev) => prev.filter((_, rowIndex) => rowIndex !== idx))} hitSlop={8}>
                <Text style={styles.quickRowDanger}>{t("삭제")}</Text>
              </Pressable>
            </View>
          ))}

          {bulkRows.slice(0, 4).map((row, idx) => (
            <View key={`bulk_${row.word}_${idx}`} style={styles.quickPreviewRow}>
              <Text style={styles.quickPreviewWord}>{row.word}</Text>
              <Text style={styles.quickPreviewMeta}>{row.reading} · {tm(row.meaningKo)}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CreateFolderModal({
  visible,
  close,
  studySets,
  onCreate,
}: {
  visible: boolean;
  close: () => void;
  studySets: StudySet[];
  onCreate: (input: { title: string; description: string; setIds?: string[] }) => void;
}) {
  const { t, language } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const folderCandidates = studySets.slice(0, 8);

  function toggleSet(id: string) {
    setSelectedSetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id));
  }

  function submit() {
    const titleValidation = validateRequiredText(title || "새 폴더", 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("폴더 만들기"), titleValidation.message);
      return;
    }
    onCreate({ title: titleValidation.value, description: sanitizeText(description, 180), setIds: selectedSetIds });
    setTitle("");
    setDescription("");
    setSelectedSetIds([]);
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.createModalSafe}>
        <ScrollView style={styles.createModalScreen} contentContainerStyle={styles.createModalScroll}>
          <View style={styles.createModalTop}>
            <Pressable style={({ pressed }) => [styles.roundClose, pressed && { opacity: 0.9 }]} onPress={close} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Text style={styles.roundCloseText}>×</Text>
            </Pressable>
            <Text style={styles.createModalTitle}>{t("폴더 만들기")}</Text>
            <Pressable style={({ pressed }) => [styles.roundSmall, pressed && { opacity: 0.9 }]} onPress={submit} accessibilityRole="button" accessibilityLabel={t("폴더 만들기")}>
              <Text style={styles.roundSmallText}>✓</Text>
            </Pressable>
          </View>
          <TextInput value={title} onChangeText={setTitle} maxLength={60} placeholder={t("예: 종과 경제")} placeholderTextColor="#9EA4C8" style={styles.titleLineInput} />
          <Text style={styles.lineLabel}>{t("폴더 이름")}</Text>
          <TextInput value={description} onChangeText={setDescription} maxLength={180} placeholder={t("설명을 입력하세요.")} placeholderTextColor="#7B82A6" style={styles.descriptionInput} />
          <Text style={styles.createHint}>{t("처음 담을 세트")}</Text>
          {folderCandidates.map((set) => {
            const selected = selectedSetIds.includes(set.id);
            return (
              <Pressable
                key={set.id}
                style={({ pressed }) => [
                  styles.folderSelectRow,
                  selected && styles.folderSelectRowActive,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => toggleSet(set.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.folderSelectTitle}>{t(set.title)}</Text>
                  <Text style={styles.quickPreviewMeta}>{t("단어")} {set.wordCount}{t("개")} · {t("진행")} {set.progress}%</Text>
                </View>
                <Text style={styles.folderSelectMark}>{selected ? "✓" : "+"}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.createHint}>{t("만든 폴더는 홈 > 개인 학습에 표시됩니다.")}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  app: { flex: 1, backgroundColor: COLORS.bg },
  authLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 14,
  },
  authLoadingMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  authLoadingMarkText: { color: COLORS.text, fontSize: 26, fontWeight: "800" },
  authLoadingText: { color: COLORS.muted, fontSize: TYPO.body, fontWeight: "700", textAlign: "center" },
  profileErrorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  profileErrorTitle: { color: COLORS.text, fontSize: TYPO.h2, lineHeight: TYPO.h2Line, fontWeight: "900", textAlign: "center", marginTop: 18 },
  profileErrorBody: { color: COLORS.muted, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, textAlign: "center", marginTop: 10, marginBottom: 18 },
  profilePrimaryBtn: { minHeight: 52, alignSelf: "stretch", borderRadius: 16, backgroundColor: COLORS.blue, justifyContent: "center", alignItems: "center" },
  profilePrimaryText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  profileSecondaryBtn: { minHeight: 52, alignSelf: "stretch", borderRadius: 16, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft, justifyContent: "center", alignItems: "center", marginTop: 10 },
  profileSecondaryText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  shell: {
    flex: 1,
    alignSelf: "stretch",
    ...(Platform.OS === "web"
      ? {
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
        }
      : null),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
  },
  transitionTapShield: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 79,
    backgroundColor: "transparent",
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    backgroundColor: "rgba(7,8,35,0.42)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  transitionCard: {
    minWidth: 168,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: "rgba(24,28,68,0.96)",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  transitionTitle: { color: COLORS.text, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, fontWeight: "900" },
  transitionText: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "800", marginTop: 1 },
  bottomNav: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(16,19,49,0.96)",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 7,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  navPressable: { flex: 1, height: 70, borderRadius: 35, justifyContent: "center", alignItems: "center" },
  navActive: { backgroundColor: "rgba(80,98,255,0.18)" },
  navIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconCircleActive: { backgroundColor: COLORS.blue, borderColor: "rgba(255,255,255,0.14)" },
  navIcon: { color: COLORS.muted, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: "700" },
  navLabel: { color: COLORS.muted, fontSize: TYPO.nav, lineHeight: 13, fontWeight: "700", marginTop: 5 },
  glyphBox: { width: 30, height: 30, position: "relative", justifyContent: "center", alignItems: "center" },
  homeRoofGlyph: {
    position: "absolute",
    top: 6,
    width: 18,
    height: 18,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  homeBaseGlyph: {
    position: "absolute",
    bottom: 5,
    width: 22,
    height: 16,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardBackGlyph: {
    position: "absolute",
    left: 5,
    top: 4,
    width: 18,
    height: 24,
    borderWidth: 2.5,
    borderRadius: 5,
    transform: [{ rotate: "-10deg" }],
    opacity: 0.7,
  },
  cardFrontGlyph: {
    position: "absolute",
    right: 3,
    top: 2,
    width: 20,
    height: 26,
    borderWidth: 2.5,
    borderRadius: 5,
    backgroundColor: "rgba(7,8,35,0.35)",
    paddingTop: 7,
    paddingHorizontal: 4,
    gap: 4,
  },
  cardLineGlyph: { height: 2.5, borderRadius: 999, width: 10 },
  cardLineGlyphSmall: { height: 2.5, borderRadius: 999, width: 7 },
  playRingGlyph: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  playGlyphText: { fontSize: 14, fontWeight: "700", marginLeft: 2 },
  userHeadGlyph: {
    position: "absolute",
    top: 4,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2.5,
  },
  userBodyGlyph: {
    position: "absolute",
    bottom: 4,
    width: 24,
    height: 13,
    borderWidth: 2.5,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 0,
  },
  classHeadMainGlyph: {
    position: "absolute",
    top: 3,
    left: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.3,
  },
  classBodyMainGlyph: {
    position: "absolute",
    bottom: 5,
    left: 6,
    width: 19,
    height: 12,
    borderWidth: 2.3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 0,
  },
  classHeadSideGlyph: {
    position: "absolute",
    top: 7,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  classBodySideGlyph: {
    position: "absolute",
    bottom: 6,
    right: 0,
    width: 14,
    height: 9,
    borderWidth: 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 0,
  },
  sendTrayGlyph: {
    position: "absolute",
    bottom: 5,
    width: 23,
    height: 11,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  sendArrowGlyph: { position: "absolute", top: 0, fontSize: 23, fontWeight: "700", lineHeight: 25 },
  listGlyphRow: { flexDirection: "row", alignItems: "center", gap: 5, marginVertical: 2.5 },
  listGlyphDot: { width: 4, height: 4, borderRadius: 2 },
  listGlyphLine: { width: 17, height: 3, borderRadius: 999 },
  createNavPressable: { flex: 1.08 },
  createNavCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.blue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  createNavIcon: { color: COLORS.text, fontSize: 32, lineHeight: 34, fontWeight: "700" },
  createNavLabel: { color: COLORS.text, fontSize: TYPO.nav, lineHeight: 13, fontWeight: "700", marginTop: 5 },
  createDim: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  createSheet: {
    backgroundColor: COLORS.panel,
    borderRadius: RADII.sheet,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
  },
  sheetHandle: {
    alignSelf: "center",
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.muted,
    opacity: 0.7,
    marginBottom: 14,
  },
  createActionRow: {
    minHeight: 86,
    borderRadius: RADII.cardLg,
    backgroundColor: COLORS.elevated,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  createActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  createActionIconActive: { backgroundColor: COLORS.blue, borderColor: "rgba(255,255,255,0.14)" },
  createActionIconText: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  createActionTitle: { color: COLORS.text, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: "800" },
  createActionSubtitle: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3, fontWeight: "500" },
  sheetCancel: {
    minHeight: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    marginTop: 2,
  },
  sheetCancelText: { color: COLORS.text, fontWeight: "700", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  createModalSafe: { flex: 1, backgroundColor: COLORS.bg },
  createModalScreen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.pageX },
  createModalScroll: { paddingTop: 20, paddingBottom: 120 },
  createModalTop: {
    paddingTop: 10,
    marginBottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  roundClose: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  roundCloseText: { color: COLORS.text, fontSize: 32, lineHeight: 34, fontWeight: "300" },
  createModalTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2, lineHeight: TYPO.h2Line, flex: 1 },
  createTopActions: { flexDirection: "row", gap: 10 },
  roundSmall: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  roundSmallText: { color: COLORS.text, fontSize: 23, fontWeight: "700" },
  titleLineInput: {
    color: COLORS.text,
    fontSize: TYPO.h1,
    lineHeight: TYPO.h1Line,
    fontWeight: "700",
    borderBottomWidth: 3,
    borderBottomColor: COLORS.text,
    minHeight: 62,
    paddingVertical: 6,
  },
  lineLabel: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 8, marginBottom: 18 },
  createToolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  toolbarBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  toolbarBtnText: { color: "#BFC4FF", fontWeight: "700", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  descriptionInput: {
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: "#1D2046",
    borderWidth: 1,
    borderColor: "#30346F",
    color: COLORS.text,
    padding: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  createHint: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginBottom: 8, fontWeight: "500" },
  manualCardEditor: { marginBottom: 14, backgroundColor: "#171B3E" },
  manualInput: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.line,
    color: COLORS.text,
    paddingHorizontal: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  quizletBulkInput: {
    minHeight: 260,
    borderRadius: 0,
    backgroundColor: "#202342",
    color: COLORS.text,
    padding: 16,
    fontWeight: "600",
    lineHeight: TYPO.bodyLine,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: COLORS.text,
  },
  createBottomBar: {
    minHeight: 62,
    backgroundColor: "#202342",
    borderTopWidth: 1,
    borderTopColor: "#3A3F72",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  bottomTool: { paddingHorizontal: 10, paddingVertical: 10 },
  bottomToolText: { color: "#BFC4FF", fontWeight: "700", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  previewCount: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine },
  quickPreviewRow: {
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickPreviewWord: { color: COLORS.text, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: "800" },
  quickPreviewMeta: { color: COLORS.muted, fontWeight: "600", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3 },
  quickRowAction: { color: "#BFC4FF", fontWeight: "900", fontSize: TYPO.small },
  quickRowDanger: { color: COLORS.red, fontWeight: "900", fontSize: TYPO.small },
  secondaryBtn: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, justifyContent: "center", alignItems: "center" },
  secondaryBtnText: { color: COLORS.text, fontWeight: "900" },
  folderSelectRow: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    padding: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  folderSelectRowActive: { borderColor: COLORS.cyan, backgroundColor: "#20285A" },
  folderSelectTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  folderSelectMark: { color: COLORS.text, fontWeight: "700", fontSize: 23, width: 32, textAlign: "center" },
});

