import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Card, ProgressBar, Row } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, PRESS_FEEDBACK, RADII, TYPO } from "../theme";
import { LearningRecord, LearnMode, LearnSessionProgress, StudyStyle, VocabItem } from "../types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TopBack({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <Row style={[styles.stickyHeader, { justifyContent: "space-between", alignItems: "center" }]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && PRESS_FEEDBACK.soft]}
      >
        <Text style={styles.backText}>‹ {t("뒤로")}</Text>
      </Pressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        {t(title)}
      </Text>
      <View style={{ width: 82 }} />
    </Row>
  );
}

function styleHint(style: StudyStyle) {
  if (style === "오답집중형") return "오답 단어부터 먼저 복습합니다.";
  if (style === "기출빈도형") return "기출 출현이 많은 단어부터 학습합니다.";
  if (style === "예문중심형") return "예문 빈칸을 우선으로 학습합니다.";
  if (style === "문제풀이형") return "퀴즈/유형 기반 문제풀이를 우선합니다.";
  if (style === "빠른 암기형") return "짧고 빠르게 반복하며 암기합니다.";
  return "낱말카드/퀴즈/예문을 균형 있게 섞습니다.";
}

type QuizState =
  | null
  | {
      kind: "single";
      prompt: string;
      subPrompt?: string;
      choices: string[];
      answer: string;
      answered?: string;
      isCorrect?: boolean;
    }
  | {
      kind: "multi";
      prompt: string;
      subPrompt?: string;
      choices: string[];
      answers: string[];
      pickCount: number;
      picked: string[];
      done?: boolean;
      isCorrect?: boolean;
    }
  | {
      kind: "write";
      prompt: string;
      subPrompt?: string;
      answer: string;
      answered?: string;
      done?: boolean;
      isCorrect?: boolean;
    }
  | {
      kind: "sort";
      prompt: string;
      subPrompt?: string;
    };

const MORE_MODE_GROUPS: Array<{ title: string; modes: LearnMode[] }> = [
  {
    title: "퀴즈 종류",
    modes: ["한자→한국어", "뜻→한자", "뜻→독음", "예문 빈칸", "빠른 OX", "유형별 퀴즈"],
  },
  {
    title: "연결 학습",
    modes: ["동의어 연결", "관련어 묶음 퀴즈"],
  },
  {
    title: "선택 학습",
    modes: ["쓰기 연습", "카드 분류"],
  },
];

const FALLBACK_MEANINGS = ["원인", "결과", "변화", "조건", "근거", "자료", "제안", "확인"];
const FALLBACK_TERMS = ["確認", "資料", "準備", "変更", "条件", "結果", "原因", "提案"];
const FALLBACK_READINGS = ["かくにん", "しりょう", "じゅんび", "へんこう", "じょうけん", "けっか", "げんいん", "ていあん"];
const FALLBACK_ENGLISH_TERMS = ["request", "schedule", "invoice", "shipment", "proposal", "customer", "budget", "approval"];
const FALLBACK_TYPES = ["문맥 이해", "어휘 추론", "근거 찾기", "주장 파악", "정보 선택", "자료형", "그래프 해석", "비교·대조"];

function recommendedModeForStyle(style: StudyStyle): LearnMode {
  if (style === "오답집중형") return "오답 복습";
  if (style === "예문중심형") return "예문 빈칸";
  if (style === "문제풀이형") return "유형별 퀴즈";
  if (style === "빠른 암기형") return "낱말카드";
  if (style === "기출빈도형") return "한자→한국어";
  return "뜻 맞히기";
}

function quizShortcutMode(style: StudyStyle): LearnMode {
  if (style === "예문중심형") return "예문 빈칸";
  if (style === "문제풀이형") return "유형별 퀴즈";
  if (style === "기출빈도형") return "한자→한국어";
  return "뜻 맞히기";
}

function seeded01(seed: number) {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function pickN<T>(arr: T[], n: number, seed: number) {
  return shuffle(arr, seed).slice(0, n);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizedIndex(index: number | undefined, length: number) {
  if (!length || typeof index !== "number" || !Number.isFinite(index)) return 0;
  const rounded = Math.max(0, Math.floor(index));
  return rounded % length;
}

function progressCursor(index: number | undefined, total: number) {
  if (!total || typeof index !== "number" || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.floor(index)), total);
}

function currentIndexFromCursor(cursor: number | undefined, total: number) {
  if (!total) return 0;
  return Math.min(progressCursor(cursor, total), Math.max(0, total - 1));
}

function optionFamily(value: string) {
  if (/^[A-Za-z0-9][A-Za-z0-9 .,'/#&()%-]*$/.test(value.trim())) return "en";
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(value)) return "ja";
  if (/[가-힣]/.test(value)) return "ko";
  return "other";
}

function fallbackChoices(correct: string) {
  const family = optionFamily(correct);
  if (family === "en") return FALLBACK_ENGLISH_TERMS;
  if (family === "ja") return FALLBACK_TERMS.concat(FALLBACK_READINGS);
  if (family === "ko") return FALLBACK_MEANINGS.concat(["청구", "배송", "예약", "환불", "승인", "지원자", "회의", "재고"]);
  return FALLBACK_TYPES;
}

function choiceSet(correct: string, wrongs: string[], seed: number, targetCount = 4) {
  const cleanCorrect = correct.trim();
  const correctFamily = optionFamily(cleanCorrect);
  const cleanWrongs = uniq(
    wrongs
      .concat(fallbackChoices(cleanCorrect))
      .map((item) => item.trim())
      .filter((item) => item && item !== cleanCorrect)
      .filter((item) => correctFamily === "ko" || optionFamily(item) === correctFamily || optionFamily(item) === "other")
  ).slice(0, targetCount - 1);
  const choices = cleanWrongs.slice();
  const slot = choices.length ? Math.abs(seed + cleanCorrect.length * 13) % (choices.length + 1) : 0;
  choices.splice(slot, 0, cleanCorrect);
  return choices.slice(0, targetCount);
}

function similarWords(word: VocabItem, pool: VocabItem[], seed: number) {
  const samePart = pool.filter((w) => w.id !== word.id && w.subject === word.subject && w.part === word.part);
  const sameSubject = pool.filter((w) => w.id !== word.id && w.subject === word.subject);
  const sameType = pool.filter(
    (w) => w.id !== word.id && w.questionTypes.some((type) => word.questionTypes.includes(type))
  );
  const fallback = pool.filter((w) => w.id !== word.id);
  return shuffle(uniq([...samePart, ...sameType, ...sameSubject, ...fallback]), seed);
}

function distractors(word: VocabItem, pool: VocabItem[], seed: number, selector: (item: VocabItem) => string) {
  const correct = selector(word);
  const correctFamily = optionFamily(correct);
  return similarWords(word, pool, seed)
    .map(selector)
    .filter(Boolean)
    .filter((item) => correctFamily === "ko" || optionFamily(item) === correctFamily || optionFamily(item) === "other");
}

function firstWrongChoice(correct: string, candidates: string[]) {
  const cleanCorrect = correct.trim();
  return uniq(candidates.map((item) => item.trim())).find((item) => item && item !== cleanCorrect);
}

type QuickOxResult = {
  word: string;
  shownMeaning: string;
  selected: "O" | "X";
  answer: "O" | "X";
  correctMeaning: string;
  isCorrect: boolean;
};

type SessionResult = {
  wordId: string;
  word: string;
  reading: string;
  meaning: string;
  mode: LearnMode;
  status: "known" | "learning" | "correct" | "wrong";
  selectedAnswer?: string;
  correctAnswer?: string;
};

type CompletedStudySessionSummary = {
  mode: LearnMode;
  title: string;
  seconds: number;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  knownCount: number;
  learningCount: number;
  bonusXP: number;
};

function completionBonusForMode(mode: LearnMode, count: number) {
  const safeCount = Math.max(1, Math.min(120, count));
  if (mode === "낱말카드" || mode === "카드 분류") {
    return Math.min(60, Math.max(8, Math.round(6 + safeCount * 0.8)));
  }
  if (mode === "오답 복습") {
    return Math.min(80, Math.max(10, Math.round(8 + safeCount * 1.2)));
  }
  return Math.min(100, Math.max(12, Math.round(10 + safeCount * 1.4)));
}

export function LearnScreen({
  sessionKey,
  title,
  mode,
  studyStyle,
  words,
  sourceSetId,
  sourceSetTitle,
  totalWordCount,
  initialProgress,
  initialProgressByMode,
  wrongReviewWordIds = [],
  onProgressChange,
  onBack,
  onGainXP,
  onUpdateWordStats,
  onMarkStudied,
  onMarkLearningCard,
  onResolveLearningCard,
  onToggleFavorite,
  onRecordResult,
  onCompleteSession,
}: {
  sessionKey: string;
  title: string;
  mode: LearnMode;
  studyStyle: StudyStyle;
  words: VocabItem[];
  sourceSetId?: string;
  sourceSetTitle?: string;
  totalWordCount?: number;
  initialProgress?: LearnSessionProgress;
  initialProgressByMode?: Partial<Record<LearnMode, LearnSessionProgress>>;
  wrongReviewWordIds?: string[];
  onProgressChange?: (progress: LearnSessionProgress) => void;
  onBack: () => void;
  onGainXP: (xp: number) => void;
  onUpdateWordStats: (wordId: string, delta: { wrongDelta: number; masteryDelta: number }) => void;
  onMarkStudied: (wordId: string) => void;
  onMarkLearningCard: (wordId: string, source?: { sourceSetId?: string; sourceTitle?: string }) => void;
  onResolveLearningCard: (wordId: string) => void;
  onToggleFavorite: (wordId: string) => void;
  onRecordResult: (record: Omit<LearningRecord, "id" | "user_id" | "created_at">) => void;
  onCompleteSession?: (summary: CompletedStudySessionSummary) => void;
}) {
  const { language, t, tm, td } = useI18n();
  const baseTotalCount = Math.max(totalWordCount || words.length, words.length);
  const [localWrongReviewIds, setLocalWrongReviewIds] = useState<string[]>([]);
  const mergedWrongReviewIds = useMemo(
    () => uniq(wrongReviewWordIds.concat(localWrongReviewIds)),
    [wrongReviewWordIds, localWrongReviewIds]
  );
  const wrongReviewIdSet = useMemo(() => new Set(mergedWrongReviewIds), [mergedWrongReviewIds]);
  const wrongReviewRawWords = useMemo(
    () => words.filter((item) => wrongReviewIdSet.has(item.id)),
    [words, wrongReviewIdSet]
  );
  const [wrongReviewShuffleSeed, setWrongReviewShuffleSeed] = useState(() => Date.now() % 1000000);
  const wrongReviewWords = useMemo(
    () => shuffle(wrongReviewRawWords, wrongReviewShuffleSeed),
    [wrongReviewRawWords, wrongReviewShuffleSeed]
  );
  const [focusedFlashcardIds, setFocusedFlashcardIds] = useState<string[] | null>(null);
  const progressByModeRef = React.useRef(initialProgressByMode);

  function savedProgressForMode(nextMode: LearnMode) {
    if (nextMode === "오답 복습") return undefined;
    return (
      progressByModeRef.current?.[nextMode] ||
      (initialProgress?.activeMode === nextMode ? initialProgress : undefined)
    );
  }

  function totalCountForMode(nextMode: LearnMode, focusIds = focusedFlashcardIds) {
    if (nextMode === "오답 복습") return wrongReviewWords.length;
    if (nextMode === "낱말카드" && focusIds?.length) {
      const idSet = new Set(focusIds);
      return words.filter((item) => idSet.has(item.id)).length || baseTotalCount;
    }
    return baseTotalCount;
  }

  const initialMode = mode;
  const initialProgressForMode = savedProgressForMode(initialMode);
  const initialTotalCount = totalCountForMode(initialMode);
  const restoredCursor = progressCursor(initialProgressForMode?.index, initialTotalCount);
  const [activeMode, setActiveMode] = useState<LearnMode>(initialMode);
  const [index, setIndex] = useState(() => currentIndexFromCursor(restoredCursor, initialTotalCount));
  const [attemptedCount, setAttemptedCount] = useState(() => restoredCursor);
  const [showMeaning, setShowMeaning] = useState(Boolean(initialProgressForMode?.showMeaning));
  const [quiz, setQuiz] = useState<QuizState>(null);
  const [writeAnswer, setWriteAnswer] = useState("");
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [quickOxResults, setQuickOxResults] = useState<QuickOxResult[]>([]);
  const [quickOxDone, setQuickOxDone] = useState(false);
  const [flashcardShuffleSeed, setFlashcardShuffleSeed] = useState<number | null>(null);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completionBonusXP, setCompletionBonusXP] = useState(0);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const questionYRef = React.useRef(0);
  const onProgressChangeRef = React.useRef(onProgressChange);
  const skipAutoSaveRef = React.useRef(true);
  const sessionResultsRef = React.useRef<SessionResult[]>([]);
  const sessionStartedAtRef = React.useRef(Date.now());
  const sessionStartCursorRef = React.useRef(restoredCursor);
  const completionAwardedRef = React.useRef(false);

  const activeWords = useMemo(
    () => {
      if (activeMode === "오답 복습") return wrongReviewWords;
      if (activeMode === "낱말카드" && focusedFlashcardIds?.length) {
        const idSet = new Set(focusedFlashcardIds);
        const focused = words.filter((item) => idSet.has(item.id));
        return flashcardShuffleSeed !== null ? shuffle(focused, flashcardShuffleSeed) : focused;
      }
      if (activeMode === "낱말카드" && flashcardShuffleSeed !== null) return shuffle(words, flashcardShuffleSeed);
      return words;
    },
    [activeMode, flashcardShuffleSeed, focusedFlashcardIds, wrongReviewWords, words]
  );
  const totalCount = totalCountForMode(activeMode);
  const word = activeWords[normalizedIndex(index, activeWords.length)] || words[0];
  const displayIndex = totalCount ? Math.min(index + 1, totalCount) : 0;
  const questionLabelText = `${displayIndex}/${totalCount}`;
  const progressLabelText = `${progressCursor(attemptedCount, totalCount)}/${totalCount}`;
  const progressPct = totalCount ? Math.round((progressCursor(attemptedCount, totalCount) / totalCount) * 100) : 0;
  const recommendedMode = recommendedModeForStyle(studyStyle);
  const quizMode = quizShortcutMode(studyStyle);
  const coreShortcuts: Array<{
    label: string;
    subtitle: string;
    icon: IconName;
    mode?: LearnMode;
    action?: "more";
  }> = [
    { label: "낱말카드", subtitle: "단어·독음·뜻 확인", icon: "albums-outline", mode: "낱말카드" },
    { label: "퀴즈", subtitle: "4지선다 문제", icon: "help-circle-outline", mode: quizMode },
    {
      label: "오답 복습",
      subtitle: wrongReviewWords.length ? `실제 오답 ${wrongReviewWords.length}개` : "아직 오답 없음",
      icon: "refresh-circle-outline",
      mode: "오답 복습",
    },
    { label: "더 많은 학습 방식", subtitle: "세부 모드 보기", icon: "grid-outline", action: "more" },
  ];

  const pool = useMemo(
    () => (activeWords.length >= 24 ? activeWords : activeWords.concat(activeWords).concat(activeWords)),
    [activeWords]
  );

  function keepQuestionCardInView() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, questionYRef.current - 8), animated: false });
    }, 30);
  }

  function saveProgress(nextCursor = attemptedCount, nextMode = activeMode, nextShowMeaning = showMeaning) {
    const nextTotalCount = totalCountForMode(nextMode);
    if (!nextTotalCount) return;
    onProgressChangeRef.current?.({
      activeMode: nextMode,
      index: progressCursor(nextCursor, nextTotalCount),
      totalCount: nextTotalCount,
      showMeaning: nextShowMeaning,
      updatedAt: Date.now(),
    });
  }

  function resetSessionReport(startCursor = 0) {
    setSessionComplete(false);
    setSessionResults([]);
    sessionResultsRef.current = [];
    setCompletionBonusXP(0);
    sessionStartedAtRef.current = Date.now();
    sessionStartCursorRef.current = startCursor;
    completionAwardedRef.current = false;
  }

  function completeSession() {
    const results = sessionResultsRef.current;
    const knownCount = results.filter((item) => item.status === "known").length;
    const learningCount = results.filter((item) => item.status === "learning").length;
    const correctCount = results.filter((item) => item.status === "correct").length;
    const wrongCount = results.filter((item) => item.status === "wrong").length;
    const startCursor = progressCursor(sessionStartCursorRef.current, totalCount);
    const remainingAtStart = Math.max(0, totalCount - startCursor);
    const questionCount = Math.min(totalCount, Math.max(results.length, remainingAtStart));
    const seconds = Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 1000));

    if (!completionAwardedRef.current && questionCount > 0 && startCursor < totalCount) {
      const bonusXP = completionBonusForMode(activeMode, questionCount);
      completionAwardedRef.current = true;
      setCompletionBonusXP(bonusXP);
      onGainXP(bonusXP);
      onCompleteSession?.({
        mode: activeMode,
        title,
        seconds,
        questionCount,
        correctCount,
        wrongCount,
        knownCount,
        learningCount,
        bonusXP,
      });
    }
    setShowMeaning(false);
    setQuiz(null);
    setWriteAnswer("");
    setAttemptedCount(totalCount);
    saveProgress(totalCount, activeMode, false);
    setSessionComplete(true);
    keepQuestionCardInView();
  }

  function next() {
    const nextCursor = progressCursor(index + 1, totalCount);
    if (nextCursor >= totalCount) {
      completeSession();
      return;
    }
    const nextIndex = currentIndexFromCursor(nextCursor, totalCount);
    setShowMeaning(false);
    setQuiz(null);
    setWriteAnswer("");
    setAttemptedCount(nextCursor);
    saveProgress(nextCursor, activeMode, false);
    setIndex(nextIndex);
    if (activeMode !== "낱말카드") keepQuestionCardInView();
  }

  function changeMode(nextMode: LearnMode, options?: { reset?: boolean; focusWordIds?: string[] | null }) {
    if (nextMode === activeMode && !options?.reset) return;
    const nextFocusIds = nextMode === "낱말카드" ? options?.focusWordIds || null : null;
    const saved = options?.reset ? undefined : savedProgressForMode(nextMode);
    const nextTotalCount = totalCountForMode(nextMode, nextFocusIds);
    const nextCursor = options?.reset ? 0 : progressCursor(saved?.index, nextTotalCount);
    const nextShowMeaning = Boolean(saved?.showMeaning);
    const nextIndex = currentIndexFromCursor(nextCursor, nextTotalCount);
    setActiveMode(nextMode);
    setShowMeaning(nextShowMeaning);
    setQuiz(null);
    setWriteAnswer("");
    setFocusedFlashcardIds(nextFocusIds);
    setIndex(nextIndex);
    setAttemptedCount(nextCursor);
    if (nextMode === "오답 복습") setWrongReviewShuffleSeed(Date.now() % 1000000);
    saveProgress(nextCursor, nextMode, nextShowMeaning);
    setQuickOxResults([]);
    setQuickOxDone(false);
    resetSessionReport(nextCursor);
    setShowMoreModes(false);
    keepQuestionCardInView();
  }

  function reshuffleWrongReview() {
    setWrongReviewShuffleSeed((prev) => prev + 9973 + (Date.now() % 997));
    setShowMeaning(false);
    setQuiz(null);
    setWriteAnswer("");
    setIndex(0);
    setAttemptedCount(0);
    saveProgress(0, "오답 복습", false);
    resetSessionReport(0);
    keepQuestionCardInView();
  }

  function shuffleFlashcards() {
    const nextSeed = Date.now() % 1000000;
    setFlashcardShuffleSeed(nextSeed);
    setShowMeaning(false);
    setQuiz(null);
    setWriteAnswer("");
    setIndex(0);
    setAttemptedCount(0);
    saveProgress(0, "낱말카드", false);
    resetSessionReport(0);
  }

  function addSessionResult(result: SessionResult) {
    const next = sessionResultsRef.current.concat(result);
    sessionResultsRef.current = next;
    setSessionResults(next);
  }

  function startFocusedFlashcards(wordIds: string[]) {
    const cleanIds = uniq(wordIds).filter((id) => words.some((item) => item.id === id));
    if (!cleanIds.length) return;
    changeMode("낱말카드", { reset: true, focusWordIds: cleanIds });
  }

  function applyGrade(
    wordId: string,
    correct: boolean,
    xp: number,
    result?: { selectedAnswer: string; correctAnswer: string; errorType: string }
  ) {
    onGainXP(xp);
    onMarkStudied(wordId);
    onUpdateWordStats(wordId, {
      wrongDelta: correct ? 0 : 1,
      masteryDelta: correct ? 6 : -4,
    });
    if (!correct) {
      setLocalWrongReviewIds((prev) => (prev.includes(wordId) ? prev : [wordId, ...prev]));
    }
    const item = words.find((w) => w.id === wordId) || word;
    if (item && result) {
      addSessionResult({
        wordId,
        word: item.word,
        reading: item.reading,
        meaning: item.meaningKo,
        mode: activeMode,
        status: correct ? "correct" : "wrong",
        selectedAnswer: result.selectedAnswer,
        correctAnswer: result.correctAnswer,
      });
    }
    if (item && result) {
      onRecordResult({
        question_id: wordId,
        selected_answer: result.selectedAnswer,
        correct_answer: result.correctAnswer,
        is_correct: correct,
        subject: item.subject,
        topic: item.part || item.questionTypes[0] || item.subject,
        error_type: correct ? "정답" : result.errorType,
        source_set_id: sourceSetId,
        source_set_title: sourceSetTitle || title,
      });
    }
  }

  function markCardLearning() {
    onGainXP(2);
    onMarkStudied(word.id);
    onUpdateWordStats(word.id, { wrongDelta: 0, masteryDelta: -4 });
    onMarkLearningCard(word.id, { sourceSetId, sourceTitle: sourceSetTitle || title });
    addSessionResult({
      wordId: word.id,
      word: word.word,
      reading: word.reading,
      meaning: word.meaningKo,
      mode: activeMode,
      status: "learning",
    });
    next();
  }

  function markCardKnown() {
    onGainXP(6);
    onMarkStudied(word.id);
    onUpdateWordStats(word.id, { wrongDelta: 0, masteryDelta: 8 });
    onResolveLearningCard(word.id);
    addSessionResult({
      wordId: word.id,
      word: word.word,
      reading: word.reading,
      meaning: word.meaningKo,
      mode: activeMode,
      status: "known",
    });
    next();
  }

  function displayOption(value: string) {
    const meaning = tm(value);
    return meaning === value ? t(value) : meaning;
  }

  function exampleTranslationText(item: VocabItem) {
    if (language === "日本語") return "";
    return td(item.exampleKo, item, "example");
  }

  function FeedbackExample({ item }: { item: VocabItem }) {
    const translated = exampleTranslationText(item);
    const related = item.relatedWords.slice(0, 3).join(" · ");
    return (
      <View style={styles.feedbackExampleBox}>
        <Text style={styles.feedbackMeaning}>{tm(item.meaningKo)}</Text>
        <Text style={styles.feedbackWhy}>{td(item.explanationKo, item, "explanation")}</Text>
        <Text style={styles.feedbackExampleJa}>{td(item.exampleJa, item, "example")}</Text>
        {translated ? <Text style={styles.feedbackExampleKo}>{translated}</Text> : null}
        {related ? <Text style={styles.feedbackRelated}>{t("같이 보기")}: {related}</Text> : null}
      </View>
    );
  }

  function NextQuestionButton() {
    return (
      <Pressable
        style={({ pressed }) => [styles.nextQuestionBtn, pressed && PRESS_FEEDBACK.strong]}
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel={t("다음 문제")}
      >
        <Text style={styles.nextQuestionText}>{t("다음 문제")}</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
      </Pressable>
    );
  }

  function SessionReportCard() {
    const knownCount = sessionResults.filter((item) => item.status === "known").length;
    const learningCount = sessionResults.filter((item) => item.status === "learning").length;
    const correctCount = sessionResults.filter((item) => item.status === "correct").length;
    const wrongResults = sessionResults.filter((item) => item.status === "wrong");
    const wrongCount = wrongResults.length;
    const solvedCount = correctCount + wrongCount;
    const isCardReport = activeMode === "낱말카드" || activeMode === "카드 분류";
    const learningIds = uniq(sessionResults.filter((item) => item.status === "learning").map((item) => item.wordId));
    const wrongIds = uniq(wrongResults.map((item) => item.wordId));
    const accuracy = solvedCount ? Math.round((correctCount / solvedCount) * 100) : 0;
    const reportTitle = isCardReport ? "낱말카드 완료" : "테스트 완료";
    const reportBody = isCardReport
      ? learningCount
        ? "학습 중으로 표시한 단어부터 한 번 더 보면 좋아요."
        : "이번 세트는 잘 넘어갔어요. 퀴즈로 확인해보면 더 정확합니다."
      : wrongCount
      ? "틀린 단어를 오답 복습으로 바로 이어갈 수 있습니다."
      : "이번 테스트는 안정적이에요. 다음 학습 방식으로 넘어가도 좋습니다.";

    return (
      <Card style={styles.card}>
        <Text style={styles.modeTitle}>{t(reportTitle)}</Text>
        <Text style={styles.mutedSmall}>{t(reportBody)}</Text>

        <View style={styles.reportGrid}>
          {isCardReport ? (
            <>
              <View style={styles.reportMetric}>
                <Text style={styles.reportMetricValue}>{knownCount}</Text>
                <Text style={styles.reportMetricLabel}>{t("알고 있음")}</Text>
              </View>
              <View style={styles.reportMetric}>
                <Text style={styles.reportMetricValue}>{learningCount}</Text>
                <Text style={styles.reportMetricLabel}>{t("학습 중")}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.reportMetric}>
                <Text style={styles.reportMetricValue}>{accuracy}%</Text>
                <Text style={styles.reportMetricLabel}>{t("정답률")}</Text>
              </View>
              <View style={styles.reportMetric}>
                <Text style={styles.reportMetricValue}>{wrongCount}</Text>
                <Text style={styles.reportMetricLabel}>{t("오답")}</Text>
              </View>
            </>
          )}
          {completionBonusXP > 0 ? (
            <View style={[styles.reportMetric, styles.reportBonusMetric]}>
              <Text style={styles.reportMetricValue}>+{completionBonusXP}</Text>
              <Text style={styles.reportMetricLabel}>{t("완료 XP")}</Text>
            </View>
          ) : null}
        </View>

        {(isCardReport ? learningIds.length : wrongIds.length) ? (
          <View style={styles.reportList}>
            {(isCardReport
              ? sessionResults.filter((item) => item.status === "learning")
              : wrongResults
            )
              .slice(0, 6)
              .map((item, itemIndex) => (
                <View key={`${item.wordId}_${itemIndex}`} style={styles.reportRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportWord}>{item.word}</Text>
                    <Text style={styles.reportMeta}>
                      {item.reading} · {tm(item.meaning)}
                    </Text>
                    {!isCardReport && item.correctAnswer ? (
                      <Text style={styles.reportMeta}>{t("정답")}: {displayOption(item.correctAnswer)}</Text>
                    ) : null}
                  </View>
                  <Badge label={isCardReport ? "LEARN" : "MISS"} tone={isCardReport ? "violet" : "danger"} />
                </View>
              ))}
          </View>
        ) : null}

        <View style={{ marginTop: 14, gap: 10 }}>
          {isCardReport ? (
            <>
              {learningIds.length ? (
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && PRESS_FEEDBACK.strong]} onPress={() => startFocusedFlashcards(learningIds)}>
                  <Text style={styles.primaryBtnText}>{t("학습 중 다시보기")}</Text>
                </Pressable>
              ) : (
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && PRESS_FEEDBACK.strong]} onPress={() => changeMode(quizMode, { reset: true })}>
                  <Text style={styles.primaryBtnText}>{t("퀴즈로 확인")}</Text>
                </Pressable>
              )}
              <Row>
                <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => changeMode("낱말카드", { reset: true })}>
                  <Text style={styles.secondaryBtnText}>{t("다시 학습")}</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => changeMode(quizMode, { reset: true })}>
                  <Text style={styles.secondaryBtnText}>{t("테스트")}</Text>
                </Pressable>
              </Row>
            </>
          ) : (
            <>
              {wrongIds.length ? (
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && PRESS_FEEDBACK.strong]} onPress={() => changeMode("오답 복습", { reset: true })}>
                  <Text style={styles.primaryBtnText}>{t("오답 복습")}</Text>
                </Pressable>
              ) : (
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && PRESS_FEEDBACK.strong]} onPress={() => changeMode("낱말카드", { reset: true })}>
                  <Text style={styles.primaryBtnText}>{t("낱말카드로 복습")}</Text>
                </Pressable>
              )}
              <Row>
                <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => changeMode(activeMode, { reset: true })}>
                  <Text style={styles.secondaryBtnText}>{t("다시 풀기")}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]}
                  onPress={() => startFocusedFlashcards(wrongIds.length ? wrongIds : activeWords.map((item) => item.id))}
                >
                  <Text style={styles.secondaryBtnText}>{t("다시 학습")}</Text>
                </Pressable>
              </Row>
            </>
          )}
        </View>
      </Card>
    );
  }

  function ensureQuiz() {
    if (!word) return;
    if (quiz) return;

    const seed = 12000 + index * 97 + word.word.length * 31;
    const kind: LearnMode = activeMode;

    if (kind === "뜻 맞히기" || kind === "한자→한국어") {
      const wrongs = distractors(word, pool, seed + 1, (w) => w.meaningKo).concat(FALLBACK_MEANINGS);
      const choices = choiceSet(word.meaningKo, wrongs, seed + 2);
      setQuiz({
        kind: "single",
        prompt: word.word,
        subPrompt: kind === "한자→한국어" ? "한자를 보고 한국어 뜻을 고르세요" : "뜻을 고르세요",
        choices,
        answer: word.meaningKo,
      });
      return;
    }

    if (kind === "뜻→한자") {
      const wrongs = distractors(word, pool, seed + 15, (w) => w.word).concat(FALLBACK_TERMS);
      const choices = choiceSet(word.word, wrongs, seed + 16);
      setQuiz({
        kind: "single",
        prompt: word.meaningKo,
        subPrompt: "뜻에 맞는 일본어 단어를 고르세요",
        choices,
        answer: word.word,
      });
      return;
    }

    if (kind === "독음 맞히기" || kind === "뜻→독음") {
      const wrongs = distractors(word, pool, seed + 3, (w) => w.reading).concat(FALLBACK_READINGS);
      const choices = choiceSet(word.reading, wrongs, seed + 4);
      setQuiz({
        kind: "single",
        prompt: kind === "뜻→독음" ? word.meaningKo : word.word,
        subPrompt: kind === "뜻→독음" ? "뜻에 맞는 독음을 고르세요" : "독음을 고르세요",
        choices,
        answer: word.reading,
      });
      return;
    }

    if (kind === "예문 빈칸") {
      const sentence = word.exampleJa.replace(word.word, "____");
      const wrongs = distractors(word, pool, seed + 5, (w) => w.word).concat(FALLBACK_TERMS);
      const choices = choiceSet(word.word, wrongs, seed + 6);
      setQuiz({
        kind: "single",
        prompt: sentence,
        subPrompt: "빈칸에 들어갈 단어를 고르세요",
        choices,
        answer: word.word,
      });
      return;
    }

    if (kind === "동의어 연결") {
      const syn = (word.synonyms || []).filter(Boolean)[0];
      const correct = syn || (word.relatedWords[0] || word.meaningKo);
      const wrongs = distractors(
        word,
        pool,
        seed + 7,
        (w) => (syn ? w.synonyms[0] || w.relatedWords[0] || w.meaningKo : w.word)
      ).concat(syn ? FALLBACK_MEANINGS : FALLBACK_TERMS);
      const choices = choiceSet(correct, wrongs, seed + 8);
      setQuiz({
        kind: "single",
        prompt: word.word,
        subPrompt: syn ? "동의어/유사 표현을 고르세요" : "같은 주제의 관련어를 고르세요",
        choices,
        answer: correct,
      });
      return;
    }

    if (kind === "관련어 묶음 퀴즈") {
      const answers = word.relatedWords.slice(0, 4);
      const candidates = uniq<string>(
        answers.concat(pickN(pool.map((w) => w.word), 6, seed + 9))
      ).slice(0, 10);
      const choices = shuffle(candidates, seed + 10);
      const pickCount = Math.min(4, answers.length || 3);
      setQuiz({
        kind: "multi",
        prompt: `${word.word} 관련어를 ${pickCount}개 고르세요`,
        subPrompt: word.meaningKo,
        choices,
        answers: answers.slice(0, pickCount),
        pickCount,
        picked: [],
      });
      return;
    }

    if (kind === "유형별 퀴즈") {
      const type = word.questionTypes[0] || "문맥 이해";
      const correct = type;
      const wrongs = pickN(
        uniq<string>(pool.flatMap((w) => w.questionTypes).concat(FALLBACK_TYPES)).filter(
          (t: string) => t !== correct
        ),
        3,
        seed + 11
      );
      const choices = choiceSet(correct, wrongs, seed + 12);
      setQuiz({
        kind: "single",
        prompt: word.word,
        subPrompt: "이 단어의 주요 출현 유형을 고르세요",
        choices,
        answer: correct,
      });
      return;
    }

    if (kind === "빠른 OX") {
      const oxSeed = stableHash(`${sessionKey}:${word.id}:${index}:${word.word}:${word.meaningKo}`);
      const isRightPair = oxSeed % 2 === 0;
      const wrongMeaning =
        firstWrongChoice(
          word.meaningKo,
          distractors(word, pool, seed + 18, (w) => w.meaningKo).concat(FALLBACK_MEANINGS)
        ) || "해당 없음";
      const shownMeaning = isRightPair ? word.meaningKo : wrongMeaning;
      setQuiz({
        kind: "single",
        prompt: `${word.word} = ${shownMeaning}`,
        subPrompt: "뜻이 맞으면 O, 아니면 X를 고르세요",
        choices: ["O", "X"],
        answer: isRightPair ? "O" : "X",
      });
      return;
    }

    if (kind === "쓰기 연습") {
      setQuiz({
        kind: "write",
        prompt: word.meaningKo,
        subPrompt: `${word.reading} · 일본어 단어를 직접 입력하세요`,
        answer: word.word,
      });
      return;
    }

    if (kind === "카드 분류") {
      setQuiz({
        kind: "sort",
        prompt: word.word,
        subPrompt: `${word.reading} · ${word.meaningKo}`,
      });
      return;
    }

    // 오답 복습: 기본은 뜻 맞히기
    const wrongs = distractors(word, pool, seed + 13, (w) => w.meaningKo).concat(FALLBACK_MEANINGS);
    const choices = choiceSet(word.meaningKo, wrongs, seed + 14);
    setQuiz({
      kind: "single",
      prompt: word.word,
      subPrompt: "오답 복습: 뜻을 고르세요",
      choices,
      answer: word.meaningKo,
    });
  }

  React.useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  React.useEffect(() => {
    progressByModeRef.current = initialProgressByMode;
  }, [initialProgressByMode]);

  React.useEffect(() => {
    const nextMode = mode;
    const saved = savedProgressForMode(nextMode);
    const nextTotalCount = totalCountForMode(nextMode);
    const nextCursor = progressCursor(saved?.index, nextTotalCount);
    skipAutoSaveRef.current = true;
    setActiveMode(nextMode);
    setIndex(currentIndexFromCursor(nextCursor, nextTotalCount));
    setAttemptedCount(nextCursor);
    setShowMeaning(Boolean(saved?.showMeaning));
    setQuiz(null);
    setWriteAnswer("");
    setQuickOxResults([]);
    setQuickOxDone(false);
    setFocusedFlashcardIds(null);
    setSessionResults([]);
    sessionResultsRef.current = [];
    setSessionComplete(false);
    setCompletionBonusXP(0);
    sessionStartedAtRef.current = Date.now();
    sessionStartCursorRef.current = nextCursor;
    completionAwardedRef.current = false;
    setShowMoreModes(false);
    // Do not depend on total count here: quiz answers update parent vocab/records,
    // and that must not reset an in-session quiz back to the launch mode.
  }, [sessionKey, mode]);

  React.useEffect(() => {
    if (activeMode !== "오답 복습") return;
    const nextTotalCount = totalCountForMode("오답 복습");
    setIndex((prev) => currentIndexFromCursor(prev, nextTotalCount));
    setAttemptedCount((prev) => progressCursor(prev, nextTotalCount));
  }, [activeMode, wrongReviewWords.length]);

  React.useEffect(() => {
    if (!totalCount) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    onProgressChangeRef.current?.({
      activeMode,
      index: progressCursor(attemptedCount, totalCount),
      totalCount,
      showMeaning,
      updatedAt: Date.now(),
    });
  }, [sessionKey, activeMode, attemptedCount, showMeaning, totalCount]);

  React.useEffect(() => {
    if (activeWords.length && activeMode !== "낱말카드" && !quiz) {
      ensureQuiz();
    }
  }, [activeMode, activeWords.length, index, quiz, word?.id]);

  function answerSingleChoice(choice: string) {
    if (!quiz || quiz.kind !== "single") return;
    const isCorrect = choice === quiz.answer;
    setQuiz({ ...quiz, answered: choice, isCorrect });
    applyGrade(word.id, isCorrect, isCorrect ? 6 : 2, {
      selectedAnswer: choice,
      correctAnswer: quiz.answer,
      errorType: activeMode,
    });
    const nextCursor = progressCursor(index + 1, totalCount);
    setAttemptedCount(nextCursor);
    saveProgress(nextCursor, activeMode, false);

    if (activeMode === "빠른 OX") {
      const shownMeaning = quiz.prompt.includes(" = ") ? quiz.prompt.split(" = ").slice(1).join(" = ") : "";
      const nextResult: QuickOxResult = {
        word: word.word,
        shownMeaning,
        selected: choice === "O" ? "O" : "X",
        answer: quiz.answer === "O" ? "O" : "X",
        correctMeaning: word.meaningKo,
        isCorrect,
      };
      setQuickOxResults((prev) => prev.concat(nextResult));
      setTimeout(() => {
        if (index + 1 >= totalCount) {
          completeSession();
          return;
        }
        next();
      }, 280);
    } else {
      keepQuestionCardInView();
    }
  }

  if (!words.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
        <TopBack title={title} onBack={onBack} />
        <Card style={styles.card}>
          <Text style={styles.modeTitle}>{t("학습할 단어를 불러오지 못했습니다.")}</Text>
          <Text style={styles.mutedSmall}>{t("단어장으로 돌아가 다시 시작해 주세요.")}</Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack title={title} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.modeTitle}>{t(activeMode)}</Text>
        <Text style={styles.mutedSmall}>
          {t("현재 공부방법")}: {t(studyStyle)} — {t(styleHint(studyStyle))}
        </Text>
        <View style={styles.progressBlock}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.progressLabel}>{t("진행")}</Text>
            <Text style={styles.progressLabel}>{progressLabelText}</Text>
          </Row>
          <ProgressBar value={progressPct} />
        </View>
        <Pressable
          onPress={() => changeMode(recommendedMode)}
          style={({ pressed }) => [
            styles.recommendModeBtn,
            activeMode === recommendedMode && styles.recommendModeBtnActive,
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.recommendIcon}>
            <Ionicons name="sparkles-outline" size={22} color={COLORS.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recommendLabel}>{t("오늘 추천 학습")}</Text>
            <Text style={styles.recommendSub}>
              {t(recommendedMode)} · {t(styleHint(studyStyle))}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </Pressable>

        <Text style={styles.modeSectionLabel}>{t("학습 방식 선택")}</Text>
        <View style={styles.modeGrid}>
          {coreShortcuts.map((item) => {
            const selected = item.mode ? activeMode === item.mode : showMoreModes;
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  if (item.action === "more") {
                    setShowMoreModes((prev) => !prev);
                    return;
                  }
                  if (item.mode) changeMode(item.mode);
                }}
                style={({ pressed }) => [
                  styles.modeTile,
                  selected && styles.modeTileActive,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Row style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Ionicons name={item.icon} size={22} color={selected ? COLORS.text : COLORS.muted} />
                  {item.action === "more" ? (
                    <Ionicons name={showMoreModes ? "chevron-up" : "chevron-down"} size={18} color={COLORS.muted} />
                  ) : null}
                </Row>
                <Text style={[styles.modeTileTitle, selected && styles.modeTileTitleActive]}>{t(item.label)}</Text>
                <Text style={styles.modeTileSub}>{t(item.subtitle)}</Text>
              </Pressable>
            );
          })}
        </View>

        {showMoreModes ? (
          <View style={styles.morePanel}>
            {MORE_MODE_GROUPS.map((group) => (
              <View key={group.title} style={styles.moreGroup}>
                <Text style={styles.moreGroupTitle}>{t(group.title)}</Text>
                <View style={styles.moreChipWrap}>
                  {group.modes.map((m) => (
                    <Pressable
                      key={`${group.title}-${m}`}
                      onPress={() => changeMode(m)}
                      style={({ pressed }) => [
                        styles.modeChip,
                        activeMode === m && styles.modeChipActive,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={[styles.modeChipText, activeMode === m && styles.modeChipTextActive]}>{t(m)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {activeMode === "오답 복습" && wrongReviewWords.length ? (
          <Pressable
            onPress={reshuffleWrongReview}
            style={({ pressed }) => [styles.shuffleReviewBtn, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={t("오답 다시 섞기")}
          >
            <Ionicons name="shuffle-outline" size={18} color={COLORS.text} />
            <Text style={styles.shuffleReviewText}>{t("오답 다시 섞기")}</Text>
          </Pressable>
        ) : null}
      </Card>

      <View onLayout={(event) => { questionYRef.current = event.nativeEvent.layout.y; }}>
      {!activeWords.length ? (
        <Card style={styles.card}>
          <Text style={styles.modeTitle}>
            {activeMode === "오답 복습" ? t("아직 실제 오답이 없습니다.") : t("학습할 단어를 불러오지 못했습니다.")}
          </Text>
          <Text style={styles.mutedSmall}>
            {activeMode === "오답 복습"
              ? t("낱말카드나 퀴즈에서 틀린 단어가 생기면 오답 복습에 자동으로 모입니다.")
              : t("단어장으로 돌아가 다시 시작해 주세요.")}
          </Text>
        </Card>
      ) : sessionComplete ? (
        <SessionReportCard />
      ) : quickOxDone ? (
        <Card style={styles.card}>
          <Text style={styles.modeTitle}>{t("빠른 OX 결과")}</Text>
          <Text style={styles.mutedSmall}>
            {t("정답")} {quickOxResults.filter((item) => item.isCorrect).length}/{quickOxResults.length}
          </Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {quickOxResults.map((item, resultIndex) => (
              <View key={`${item.word}_${resultIndex}`} style={styles.oxSummaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.oxSummaryWord}>{item.word}</Text>
                  <Text style={styles.mutedSmall}>
                    {t(item.isCorrect ? "정답" : "오답")} · {t("정답")}: {item.answer} · {t("실제 뜻")}: {displayOption(item.correctMeaning)}
                  </Text>
                </View>
                <Badge label={item.isCorrect ? "OK" : "MISS"} tone={item.isCorrect ? "success" : "danger"} />
              </View>
            ))}
          </View>
          <Row style={{ marginTop: 12 }}>
            <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => changeMode("빠른 OX", { reset: true })}>
              <Text style={styles.secondaryBtnText}>{t("다시 풀기")}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.strong]} onPress={() => changeMode("낱말카드")}>
              <Text style={styles.primaryBtnText}>{t("낱말카드")}</Text>
            </Pressable>
          </Row>
        </Card>
      ) : activeMode === "낱말카드" ? (
        <Card style={styles.card}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Row style={{ alignItems: "center" }}>
              <Badge label={questionLabelText} tone="default" />
              <Badge
                label={
                  word.occurrenceCount > 0
                    ? `${t("기출")} ${word.occurrenceCount}${t("회")}`
                    : `${t("빈출")} ${word.frequencyScore}`
                }
                tone="blue"
              />
            </Row>
            <Row style={{ alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={shuffleFlashcards}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("낱말카드 섞기")}
                style={({ pressed }) => [
                  styles.favoriteBtn,
                  flashcardShuffleSeed !== null && styles.shuffleBtnActive,
                  pressed && PRESS_FEEDBACK.soft,
                ]}
              >
                <Ionicons name="shuffle-outline" size={22} color={flashcardShuffleSeed !== null ? COLORS.cyan : COLORS.muted} />
              </Pressable>
              <Pressable
                onPress={() => onToggleFavorite(word.id)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={word.isFavorite ? t("별표 해제") : t("별표 추가")}
                style={({ pressed }) => [
                  styles.favoriteBtn,
                  word.isFavorite && styles.favoriteBtnActive,
                  pressed && PRESS_FEEDBACK.soft,
                ]}
              >
                <Text style={[styles.favoriteText, word.isFavorite && styles.favoriteTextActive]}>
                  {word.isFavorite ? "★" : "☆"}
                </Text>
              </Pressable>
            </Row>
          </Row>
          <Text style={styles.word}>{word.word}</Text>
          <Text style={styles.reading}>[{word.reading}]</Text>

          {showMeaning ? (
            <>
              <Text style={styles.meaning}>{tm(word.meaningKo)}</Text>
              <Text style={styles.explain} numberOfLines={3}>
                {td(word.explanationKo, word, "explanation")}
              </Text>
              <Text style={styles.exampleJa}>{word.exampleJa}</Text>
              {exampleTranslationText(word) ? <Text style={styles.exampleKo}>{exampleTranslationText(word)}</Text> : null}
            </>
          ) : (
            <Pressable
              onPress={() => setShowMeaning(true)}
              style={({ pressed }) => [styles.revealBox, pressed && PRESS_FEEDBACK.soft]}
            >
              <Text style={styles.revealText}>{t("탭해서 뜻 보기")}</Text>
            </Pressable>
          )}

          <Row style={{ marginTop: 14 }}>
            <Pressable style={({ pressed }) => [styles.gradeBtn, styles.okBtn, pressed && PRESS_FEEDBACK.soft]} onPress={markCardLearning}>
              <Text style={styles.gradeText}>{t("학습 중")}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.gradeBtn, styles.perfectBtn, pressed && PRESS_FEEDBACK.strong]} onPress={markCardKnown}>
              <Text style={styles.gradeText}>{t("알고 있음")}</Text>
            </Pressable>
          </Row>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Badge label={questionLabelText} tone="default" />
            <Badge label={`${t("주요 유형")} ${t(word.questionTypes[0] || "문맥 이해")}`} tone="violet" />
          </Row>

          {quiz?.kind === "single" ? (
            <>
              <Text style={styles.quizPrompt}>{t(quiz.prompt)}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{t(quiz.subPrompt)}</Text> : null}
              {quiz.answered && activeMode !== "빠른 OX" ? <NextQuestionButton /> : null}
              <View style={{ marginTop: 12, gap: 10 }}>
                {quiz.choices.map((c) => {
                  const chosen = quiz.answered === c;
                  const correct = quiz.answer === c;
                  const show = !!quiz.answered;
                  const tone =
                    show && chosen && correct
                      ? styles.choiceCorrect
                      : show && chosen && !correct
                      ? styles.choiceWrong
                      : show && !chosen && correct
                      ? styles.choiceCorrectOutline
                      : styles.choiceDefault;
                  return (
                    <Pressable
                      key={c}
                      disabled={!!quiz.answered}
                      onPress={() => answerSingleChoice(c)}
                      style={({ pressed }) => [
                        styles.choice,
                        tone,
                        pressed && !quiz.answered && PRESS_FEEDBACK.soft,
                      ]}
                    >
                      <Text style={styles.choiceText}>{displayOption(c)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {quiz.answered ? (
                <>
                  {activeMode !== "빠른 OX" ? (
                    <>
                      <Card style={styles.feedback}>
                        <Text style={styles.feedbackTitle}>{t(quiz.isCorrect ? "정답" : "오답")}</Text>
                        <Text style={styles.mutedSmall}>{t("정답")}: {displayOption(quiz.answer)}</Text>
                        <FeedbackExample item={word} />
                      </Card>
                    </>
                  ) : (
                    <Text style={styles.mutedSmall}>{t("자동으로 다음 문제로 넘어갑니다.")}</Text>
                  )}
                </>
              ) : null}
            </>
          ) : quiz?.kind === "multi" ? (
            <>
              <Text style={styles.quizPrompt}>{t(quiz.prompt)}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{t(quiz.subPrompt)}</Text> : null}
              {quiz.done ? <NextQuestionButton /> : null}

              <View style={{ marginTop: 12, gap: 10 }}>
                {quiz.choices.map((c) => {
                  const picked = quiz.picked.includes(c);
                  const show = !!quiz.done;
                  const correct = quiz.answers.includes(c);
                  const tone =
                    show && picked && correct
                      ? styles.choiceCorrect
                      : show && picked && !correct
                      ? styles.choiceWrong
                      : picked
                      ? styles.choicePicked
                      : show && !picked && correct
                      ? styles.choiceCorrectOutline
                      : styles.choiceDefault;
                  return (
                    <Pressable
                      key={c}
                      disabled={!!quiz.done}
                      onPress={() => {
                        setQuiz((prev) => {
                          if (!prev || prev.kind !== "multi" || prev.done) return prev;
                          const nextPicked = prev.picked.includes(c)
                            ? prev.picked.filter((x) => x !== c)
                            : prev.picked.length >= prev.pickCount
                            ? prev.picked
                            : prev.picked.concat(c);
                          return { ...prev, picked: nextPicked };
                        });
                      }}
                      style={({ pressed }) => [
                        styles.choice,
                        tone,
                        pressed && !quiz.done && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={styles.choiceText}>{displayOption(c)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Row style={{ marginTop: 12 }}>
                <Pressable
                  style={[styles.secondaryBtn, { flex: 1 }]}
                  onPress={() => {
                    setQuiz((prev) => {
                      if (!prev || prev.kind !== "multi" || prev.done) return prev;
                      if (prev.picked.length < prev.pickCount) {
                        Alert.alert(t("선택"), `${prev.pickCount}${t("개")} ${t("선택해 주세요")}.`);
                        return prev;
                      }
                      const ok =
                        prev.picked.length === prev.pickCount &&
                        prev.picked.every((x) => prev.answers.includes(x)) &&
                        prev.answers.every((x) => prev.picked.includes(x));
                      applyGrade(word.id, ok, ok ? 7 : 2, {
                        selectedAnswer: prev.picked.join(", "),
                        correctAnswer: prev.answers.join(", "),
                        errorType: activeMode,
                      });
                      const nextCursor = progressCursor(index + 1, totalCount);
                      setAttemptedCount(nextCursor);
                      saveProgress(nextCursor, activeMode, false);
                      keepQuestionCardInView();
                      return { ...prev, done: true, isCorrect: ok };
                    });
                  }}
                >
                  <Text style={styles.secondaryBtnText}>{t("제출")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryBtn, { flex: 1 }]}
                  onPress={() =>
                    setQuiz((prev) =>
                      prev && prev.kind === "multi" ? { ...prev, picked: [] } : prev
                    )
                  }
                >
                  <Text style={styles.secondaryBtnText}>{t("초기화")}</Text>
                </Pressable>
              </Row>

              {quiz.done ? (
                <>
                  <Card style={styles.feedback}>
                    <Text style={styles.feedbackTitle}>{t(quiz.isCorrect ? "정답" : "오답")}</Text>
                    <Text style={styles.mutedSmall}>{t("정답")}: {quiz.answers.map((x) => displayOption(x)).join(", ") || "-"}</Text>
                    <FeedbackExample item={word} />
                  </Card>
                </>
              ) : null}
            </>
          ) : quiz?.kind === "write" ? (
            <>
              <Text style={styles.quizPrompt}>{tm(quiz.prompt)}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{t(quiz.subPrompt)}</Text> : null}
              {quiz.done ? <NextQuestionButton /> : null}
              <TextInput
                value={writeAnswer}
                onChangeText={setWriteAnswer}
                editable={!quiz.done}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t("예: 経験")}
                placeholderTextColor={COLORS.dim}
                style={[styles.writeInput, quiz.done && (quiz.isCorrect ? styles.writeInputCorrect : styles.writeInputWrong)]}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!writeAnswer.trim() || quiz.done) && styles.disabledBtn,
                  pressed && writeAnswer.trim() && !quiz.done && { opacity: 0.9 },
                ]}
                disabled={!writeAnswer.trim() || !!quiz.done}
                onPress={() => {
                  const normalized = writeAnswer.trim();
                  const isCorrect = normalized === quiz.answer;
                  setQuiz({ ...quiz, answered: normalized, done: true, isCorrect });
                  applyGrade(word.id, isCorrect, isCorrect ? 8 : 2, {
                    selectedAnswer: normalized,
                    correctAnswer: quiz.answer,
                    errorType: activeMode,
                  });
                  const nextCursor = progressCursor(index + 1, totalCount);
                  setAttemptedCount(nextCursor);
                  saveProgress(nextCursor, activeMode, false);
                  keepQuestionCardInView();
                }}
              >
                <Text style={styles.primaryBtnText}>{t("확인")}</Text>
              </Pressable>
              {quiz.done ? (
                <>
                  <Card style={styles.feedback}>
                    <Text style={styles.feedbackTitle}>{t(quiz.isCorrect ? "정답" : "오답")}</Text>
                    <Text style={styles.mutedSmall}>{t("정답")}: {quiz.answer}</Text>
                    <Text style={styles.mutedSmall}>{word.reading}</Text>
                    <FeedbackExample item={word} />
                  </Card>
                </>
              ) : null}
            </>
          ) : quiz?.kind === "sort" ? (
            <>
              <Text style={styles.word}>{quiz.prompt}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{quiz.subPrompt}</Text> : null}
              {showMeaning ? (
                <>
                  <Text style={styles.meaning}>{tm(word.meaningKo)}</Text>
                  <Text style={styles.exampleJa}>{word.exampleJa}</Text>
                  {exampleTranslationText(word) ? <Text style={styles.exampleKo}>{exampleTranslationText(word)}</Text> : null}
                </>
              ) : (
                <Pressable onPress={() => setShowMeaning(true)} style={({ pressed }) => [styles.revealBox, pressed && { opacity: 0.9 }]}>
                  <Text style={styles.revealText}>{t("정답 보기")}</Text>
                </Pressable>
              )}
              <Row style={{ marginTop: 14 }}>
                <Pressable style={[styles.gradeBtn, styles.okBtn]} onPress={markCardLearning}>
                  <Text style={styles.gradeText}>{t("학습 중")}</Text>
                </Pressable>
                <Pressable style={[styles.gradeBtn, styles.perfectBtn]} onPress={markCardKnown}>
                  <Text style={styles.gradeText}>{t("알고 있음")}</Text>
                </Pressable>
              </Row>
            </>
          ) : (
            <Text style={styles.mutedSmall}>{t("문제를 생성하는 중…")}</Text>
          )}
        </Card>
      )}
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  stickyHeader: { backgroundColor: COLORS.bg, paddingBottom: 10, zIndex: 10 },
  backBtn: {
    height: 48,
    minWidth: 82,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    justifyContent: "center",
  },
  backText: { color: COLORS.text, fontWeight: "800" },
  topTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, textAlign: "center", flex: 1 },
  modeTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2 },
  progressBlock: { marginTop: 12, gap: 8 },
  progressLabel: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  recommendModeBtn: {
    marginTop: 16,
    minHeight: 74,
    borderRadius: 20,
    backgroundColor: COLORS.blue,
    borderWidth: 1,
    borderColor: COLORS.blue,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recommendModeBtnActive: {
    shadowColor: COLORS.blue,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  recommendIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  recommendLabel: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  recommendSub: { color: "#DFE3FF", fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3 },
  modeSectionLabel: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small, marginTop: 16, marginBottom: 10 },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modeTile: {
    width: "48%",
    minHeight: 104,
    borderRadius: 18,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 13,
    justifyContent: "space-between",
  },
  modeTileActive: { backgroundColor: "#283075", borderColor: COLORS.blue },
  modeTileTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body, marginTop: 8 },
  modeTileTitleActive: { color: COLORS.text },
  modeTileSub: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3 },
  morePanel: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, backgroundColor: "rgba(32,38,80,0.54)", padding: 14 },
  moreGroup: { marginBottom: 14 },
  moreGroupTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  moreChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  modeScroll: { marginTop: 14 },
  modeScrollContent: { gap: 8, paddingRight: 8 },
  modeChip: { minHeight: 40, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, justifyContent: "center" },
  modeChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  modeChipText: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  modeChipTextActive: { color: COLORS.text },
  shuffleReviewBtn: { minHeight: 48, borderRadius: 16, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  shuffleReviewText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  mutedSmall: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 8 },
  card: { marginTop: 12, borderRadius: RADII.cardLg },
  word: { color: COLORS.text, fontSize: 40, fontWeight: "800", textAlign: "center", marginTop: 14 },
  reading: { color: COLORS.muted, fontWeight: "700", textAlign: "center", marginTop: 6 },
  meaning: { color: COLORS.text, fontWeight: "800", textAlign: "center", marginTop: 14, fontSize: TYPO.h2 },
  explain: { color: COLORS.muted, lineHeight: TYPO.bodyLine, textAlign: "center", fontSize: TYPO.small, marginTop: 10 },
  exampleJa: { color: COLORS.text, fontWeight: "700", textAlign: "center", marginTop: 10, lineHeight: TYPO.smallLine },
  exampleKo: { color: COLORS.muted, fontWeight: "700", textAlign: "center", marginTop: 6, lineHeight: TYPO.smallLine, fontSize: TYPO.small },
  revealBox: { backgroundColor: COLORS.card2, borderRadius: 18, padding: 18, marginTop: 20, alignSelf: "center" },
  revealText: { color: COLORS.muted, fontWeight: "800" },
  favoriteBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.line,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBtnActive: { backgroundColor: "#3C3321", borderColor: COLORS.gold },
  shuffleBtnActive: { backgroundColor: "rgba(103,217,255,0.14)", borderColor: "rgba(103,217,255,0.42)" },
  favoriteText: { color: COLORS.muted, fontSize: 26, lineHeight: 29, fontWeight: "800" },
  favoriteTextActive: { color: COLORS.gold },
  gradeBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  gradeText: { color: COLORS.text, fontWeight: "800" },
  badBtn: { backgroundColor: "#3B1F3E" },
  okBtn: { backgroundColor: "#473B21" },
  goodBtn: { backgroundColor: "#173D35" },
  perfectBtn: { backgroundColor: "#25327B" },
  quizPrompt: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2, marginTop: 14 },
  quizSub: { color: COLORS.muted, fontWeight: "700", marginTop: 6, lineHeight: TYPO.smallLine, fontSize: TYPO.small },
  choice: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2 },
  choiceDefault: {},
  choicePicked: { borderColor: COLORS.violet },
  choiceCorrect: { backgroundColor: "#173D35", borderColor: "#173D35" },
  choiceCorrectOutline: { borderColor: "#4ADE80" },
  choiceWrong: { backgroundColor: "#3B1F3E", borderColor: "#3B1F3E" },
  choiceText: { color: COLORS.text, fontWeight: "800" },
  feedback: { marginTop: 12, backgroundColor: "#10143C" },
  feedbackTitle: { color: COLORS.gold, fontWeight: "800", fontSize: TYPO.h3 },
  feedbackExampleBox: { marginTop: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: COLORS.line, padding: 12 },
  feedbackMeaning: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  feedbackWhy: { color: "#D7DCF7", fontWeight: "700", lineHeight: TYPO.smallLine, marginTop: 8, fontSize: TYPO.small },
  feedbackExampleJa: { color: COLORS.text, fontWeight: "800", lineHeight: TYPO.bodyLine, marginTop: 10 },
  feedbackExampleKo: { color: COLORS.muted, fontWeight: "700", lineHeight: TYPO.smallLine, marginTop: 6, fontSize: TYPO.small },
  feedbackRelated: { color: COLORS.cyan, fontWeight: "800", lineHeight: TYPO.smallLine, marginTop: 8, fontSize: TYPO.small },
  nextQuestionBtn: { minHeight: 50, borderRadius: 16, backgroundColor: COLORS.blue, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 },
  nextQuestionText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  reportGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  reportMetric: { flex: 1, minHeight: 86, borderRadius: 16, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", padding: 14 },
  reportBonusMetric: { borderColor: "rgba(246,200,95,0.35)", backgroundColor: "rgba(246,200,95,0.12)" },
  reportMetricValue: { color: COLORS.text, fontWeight: "900", fontSize: 30 },
  reportMetricLabel: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small, marginTop: 4 },
  reportList: { marginTop: 14, gap: 10 },
  reportRow: { minHeight: 72, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: COLORS.line, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  reportWord: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  reportMeta: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3 },
  oxSummaryRow: { minHeight: 68, borderRadius: 14, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  oxSummaryWord: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  writeInput: { backgroundColor: COLORS.field, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, minHeight: 56, paddingHorizontal: 14, marginTop: 14 },
  writeInputCorrect: { borderColor: COLORS.green },
  writeInputWrong: { borderColor: COLORS.red },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", marginTop: 12 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  disabledBtn: { opacity: 0.45 },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
