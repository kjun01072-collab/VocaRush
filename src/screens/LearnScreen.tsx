import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Card, ProgressBar, Row } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { LearningRecord, LearnMode, StudyStyle, VocabItem } from "../types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TopBack({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]}
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

function choiceSet(correct: string, wrongs: string[], seed: number) {
  const cleanCorrect = correct.trim();
  const cleanWrongs = uniq(
    wrongs
      .map((item) => item.trim())
      .filter((item) => item && item !== cleanCorrect)
  ).slice(0, 3);
  const choices = cleanWrongs.slice();
  const slot = choices.length ? Math.abs(seed + cleanCorrect.length * 13) % (choices.length + 1) : 0;
  choices.splice(slot, 0, cleanCorrect);
  return choices;
}

export function LearnScreen({
  title,
  mode,
  studyStyle,
  words,
  onBack,
  onGainXP,
  onUpdateWordStats,
  onMarkStudied,
  onToggleFavorite,
  onRecordResult,
}: {
  title: string;
  mode: LearnMode;
  studyStyle: StudyStyle;
  words: VocabItem[];
  onBack: () => void;
  onGainXP: (xp: number) => void;
  onUpdateWordStats: (wordId: string, delta: { wrongDelta: number; masteryDelta: number }) => void;
  onMarkStudied: (wordId: string) => void;
  onToggleFavorite: (wordId: string) => void;
  onRecordResult: (record: Omit<LearningRecord, "id" | "user_id" | "created_at">) => void;
}) {
  const { language, t, tm, td } = useI18n();
  const [activeMode, setActiveMode] = useState<LearnMode>(mode);
  const [index, setIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [quiz, setQuiz] = useState<QuizState>(null);
  const [writeAnswer, setWriteAnswer] = useState("");
  const [showMoreModes, setShowMoreModes] = useState(false);

  const word = words[index % Math.max(1, words.length)];
  const progressPct = words.length ? Math.round(((index % words.length) / words.length) * 100) : 0;
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
    { label: "오답 복습", subtitle: "틀린 단어 우선", icon: "refresh-circle-outline", mode: "오답 복습" },
    { label: "더 많은 학습 방식", subtitle: "세부 모드 보기", icon: "grid-outline", action: "more" },
  ];

  const pool = useMemo(
    () => (words.length >= 24 ? words : words.concat(words).concat(words)),
    [words]
  );

  function next() {
    setShowMeaning(false);
    setQuiz(null);
    setWriteAnswer("");
    setIndex((i) => i + 1);
  }

  function changeMode(nextMode: LearnMode) {
    setActiveMode(nextMode);
    setShowMeaning(false);
    setQuiz(null);
    setWriteAnswer("");
    setIndex(0);
    setShowMoreModes(false);
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
    const item = words.find((w) => w.id === wordId) || word;
    if (item && result) {
      onRecordResult({
        question_id: wordId,
        selected_answer: result.selectedAnswer,
        correct_answer: result.correctAnswer,
        is_correct: correct,
        subject: item.subject,
        topic: item.part || item.questionTypes[0] || item.subject,
        error_type: correct ? "정답" : result.errorType,
      });
    }
  }

  function displayOption(value: string) {
    const meaning = tm(value);
    return meaning === value ? t(value) : meaning;
  }

  function exampleTranslationText(item: VocabItem) {
    if (language === "日本語") return "";
    return td(item.exampleKo, item, "example");
  }

  function answerExplanationText(item: VocabItem) {
    const meaning = tm(item.meaningKo);
    const type = item.questionTypes[0] || item.part || item.subject;
    return `${item.word}는 ${meaning}로, ${type} 유형에서 자주 확인하는 단어입니다. 예문과 함께 기억하면 같은 유형 문제에서 더 빨리 떠올릴 수 있습니다.`;
  }

  function ensureQuiz() {
    if (!word) return;
    if (quiz) return;

    const seed = 12000 + index * 97 + word.word.length * 31;
    const kind: LearnMode = activeMode;

    if (kind === "뜻 맞히기" || kind === "한자→한국어") {
      const others = pool.filter((w) => w.id !== word.id);
      const wrongs = pickN(
        others.map((w) => w.meaningKo),
        3,
        seed + 1
      );
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
      const others = pool.filter((w) => w.id !== word.id);
      const wrongs = pickN(
        others.map((w) => w.word),
        3,
        seed + 15
      );
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
      const others = pool.filter((w) => w.id !== word.id);
      const wrongs = pickN(
        others.map((w) => w.reading),
        3,
        seed + 3
      );
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
      const others = pool.filter((w) => w.id !== word.id);
      const wrongs = pickN(
        others.map((w) => w.word),
        3,
        seed + 5
      );
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
      const others = pool.filter((w) => w.id !== word.id);
      const wrongs = pickN(
        others.map((w) =>
          syn ? w.synonyms[0] || w.relatedWords[0] || w.meaningKo : w.word
        ),
        3,
        seed + 7
      );
      const choices = choiceSet(correct, wrongs, seed + 8);
      setQuiz({
        kind: "single",
        prompt: word.word,
        subPrompt: syn ? "동의어/유사 표현을 고르세요" : "관련 표현을 고르세요",
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
        uniq<string>(pool.flatMap((w) => w.questionTypes)).filter(
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
      const isRightPair = seeded01(seed + 17) > 0.45;
      const wrongMeaning = pickN(pool.filter((w) => w.id !== word.id).map((w) => w.meaningKo), 1, seed + 18)[0] || word.meaningKo;
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
    const others = pool.filter((w) => w.id !== word.id);
    const wrongs = pickN(
      others.map((w) => w.meaningKo),
      3,
      seed + 13
    );
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
    changeMode(mode);
  }, [mode, title]);

  React.useEffect(() => {
    if (activeMode !== "낱말카드" && !quiz) {
      ensureQuiz();
    }
  }, [activeMode, index, quiz, word?.id]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack title={title} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.modeTitle}>{t(activeMode)}</Text>
        <Text style={styles.mutedSmall}>
          {t("현재 공부방법")}: {t(studyStyle)} — {t(styleHint(studyStyle))}
        </Text>
        <View style={styles.progressBlock}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.progressLabel}>{t("진행")}</Text>
            <Text style={styles.progressLabel}>{Math.min(index + 1, words.length)}/{words.length}</Text>
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
      </Card>

      {activeMode === "낱말카드" ? (
        <Card style={styles.card}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Row style={{ alignItems: "center" }}>
              <Badge label={`${index + 1}/${words.length}`} tone="default" />
              <Badge label={`${t("기출")} ${word.occurrenceCount}${t("회")}`} tone="blue" />
            </Row>
            <Pressable
              onPress={() => onToggleFavorite(word.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={word.isFavorite ? t("별표 해제") : t("별표 추가")}
              style={({ pressed }) => [
                styles.favoriteBtn,
                word.isFavorite && styles.favoriteBtnActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.favoriteText, word.isFavorite && styles.favoriteTextActive]}>
                {word.isFavorite ? "★" : "☆"}
              </Text>
            </Pressable>
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
              style={({ pressed }) => [styles.revealBox, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.revealText}>{t("탭해서 뜻 보기")}</Text>
            </Pressable>
          )}

          <View style={{ marginTop: 14, gap: 10 }}>
            <Row>
              <Pressable
                style={[styles.gradeBtn, styles.badBtn]}
                onPress={() => {
                  applyGrade(word.id, false, 1, {
                    selectedAnswer: "모름",
                    correctAnswer: word.meaningKo,
                    errorType: "낱말카드",
                  });
                  next();
                }}
              >
                <Text style={styles.gradeText}>{t("모름")}</Text>
              </Pressable>
              <Pressable
                style={[styles.gradeBtn, styles.okBtn]}
                onPress={() => {
                  applyGrade(word.id, false, 3, {
                    selectedAnswer: "헷갈림",
                    correctAnswer: word.meaningKo,
                    errorType: "낱말카드",
                  });
                  next();
                }}
              >
                <Text style={styles.gradeText}>{t("헷갈림")}</Text>
              </Pressable>
            </Row>
            <Row>
              <Pressable
                style={[styles.gradeBtn, styles.goodBtn]}
                onPress={() => {
                  applyGrade(word.id, true, 5, {
                    selectedAnswer: "알고 있음",
                    correctAnswer: word.meaningKo,
                    errorType: "낱말카드",
                  });
                  next();
                }}
              >
                <Text style={styles.gradeText}>{t("알고 있음")}</Text>
              </Pressable>
              <Pressable
                style={[styles.gradeBtn, styles.perfectBtn]}
                onPress={() => {
                  applyGrade(word.id, true, 8, {
                    selectedAnswer: "설명 가능",
                    correctAnswer: word.meaningKo,
                    errorType: "낱말카드",
                  });
                  next();
                }}
              >
                <Text style={styles.gradeText}>{t("설명 가능")}</Text>
              </Pressable>
            </Row>
          </View>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Badge label={`${index + 1}/${words.length}`} tone="default" />
            <Badge label={`${t("주요 유형")} ${t(word.questionTypes[0] || "문맥 이해")}`} tone="violet" />
          </Row>

          {quiz?.kind === "single" ? (
            <>
              <Text style={styles.quizPrompt}>{t(quiz.prompt)}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{t(quiz.subPrompt)}</Text> : null}
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
                      onPress={() => {
                        const isCorrect = c === quiz.answer;
                        setQuiz({ ...quiz, answered: c, isCorrect });
                        applyGrade(word.id, isCorrect, isCorrect ? 6 : 2, {
                          selectedAnswer: c,
                          correctAnswer: quiz.answer,
                          errorType: activeMode,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.choice,
                        tone,
                        pressed && !quiz.answered && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={styles.choiceText}>{displayOption(c)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {quiz.answered ? (
                <>
                  <Card style={styles.feedback}>
                    <Text style={styles.feedbackTitle}>{t(quiz.isCorrect ? "정답" : "오답")}</Text>
                    <Text style={styles.mutedSmall}>{t("정답")}: {displayOption(quiz.answer)}</Text>
                    <Text style={styles.feedbackExplain}>{answerExplanationText(word)}</Text>
                    {activeMode === "예문 빈칸" && exampleTranslationText(word) ? (
                      <Text style={styles.mutedSmall}>{t("해석")}: {exampleTranslationText(word)}</Text>
                    ) : null}
                    <View style={styles.actionMap}>
                      <Text style={styles.actionMapText}>
                        {t(quiz.isCorrect ? "다음에는 같은 유형 단어로 이어집니다." : "오답 단어는 복습 우선순위에 자동 반영됩니다.")}
                      </Text>
                    </View>
                  </Card>
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                    onPress={next}
                  >
                    <Text style={styles.primaryBtnText}>{t("다음 문제")}</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          ) : quiz?.kind === "multi" ? (
            <>
              <Text style={styles.quizPrompt}>{t(quiz.prompt)}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{t(quiz.subPrompt)}</Text> : null}

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
                    <Text style={styles.feedbackExplain}>{answerExplanationText(word)}</Text>
                    <View style={styles.actionMap}>
                      <Text style={styles.actionMapText}>
                        {t(quiz.isCorrect ? "관련어 묶음 기억이 강화됐습니다." : "관련어 묶음은 다시 복습 큐에서 확인합니다.")}
                      </Text>
                    </View>
                  </Card>
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                    onPress={next}
                  >
                    <Text style={styles.primaryBtnText}>{t("다음 문제")}</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          ) : quiz?.kind === "write" ? (
            <>
              <Text style={styles.quizPrompt}>{tm(quiz.prompt)}</Text>
              {quiz.subPrompt ? <Text style={styles.quizSub}>{t(quiz.subPrompt)}</Text> : null}
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
                }}
              >
                <Text style={styles.primaryBtnText}>{t("확인")}</Text>
              </Pressable>
              {quiz.done ? (
                <>
                  <Card style={styles.feedback}>
                    <Text style={styles.feedbackTitle}>{t(quiz.isCorrect ? "정답" : "오답")}</Text>
                    <Text style={styles.mutedSmall}>{t("정답")}: {quiz.answer}</Text>
                    <Text style={styles.mutedSmall}>{tm(word.meaningKo)} · {word.reading}</Text>
                    <Text style={styles.feedbackExplain}>{answerExplanationText(word)}</Text>
                  </Card>
                  <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={next}>
                    <Text style={styles.primaryBtnText}>{t("다음 문제")}</Text>
                  </Pressable>
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
              <View style={{ marginTop: 14, gap: 10 }}>
                <Row>
                  <Pressable
                    style={[styles.gradeBtn, styles.badBtn]}
                    onPress={() => {
                      applyGrade(word.id, false, 1, {
                        selectedAnswer: "모름",
                        correctAnswer: word.meaningKo,
                        errorType: "카드 분류",
                      });
                      next();
                    }}
                  >
                    <Text style={styles.gradeText}>{t("모름")}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.gradeBtn, styles.okBtn]}
                    onPress={() => {
                      applyGrade(word.id, false, 3, {
                        selectedAnswer: "다시 보기",
                        correctAnswer: word.meaningKo,
                        errorType: "카드 분류",
                      });
                      next();
                    }}
                  >
                    <Text style={styles.gradeText}>{t("다시 보기")}</Text>
                  </Pressable>
                </Row>
                <Row>
                  <Pressable
                    style={[styles.gradeBtn, styles.goodBtn]}
                    onPress={() => {
                      applyGrade(word.id, true, 5, {
                        selectedAnswer: "알고 있음",
                        correctAnswer: word.meaningKo,
                        errorType: "카드 분류",
                      });
                      next();
                    }}
                  >
                    <Text style={styles.gradeText}>{t("알고 있음")}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.gradeBtn, styles.perfectBtn]}
                    onPress={() => {
                      applyGrade(word.id, true, 8, {
                        selectedAnswer: "완전 암기",
                        correctAnswer: word.meaningKo,
                        errorType: "카드 분류",
                      });
                      next();
                    }}
                  >
                    <Text style={styles.gradeText}>{t("완전 암기")}</Text>
                  </Pressable>
                </Row>
              </View>
            </>
          ) : (
            <Text style={styles.mutedSmall}>{t("문제를 생성하는 중…")}</Text>
          )}
        </Card>
      )}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
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
  feedbackExplain: { color: COLORS.text, fontWeight: "700", lineHeight: TYPO.smallLine, marginTop: 10, fontSize: TYPO.small },
  actionMap: { marginTop: 10, borderRadius: 12, backgroundColor: "rgba(76,91,255,0.14)", borderWidth: 1, borderColor: "rgba(76,91,255,0.34)", padding: 10 },
  actionMapText: { color: "#C7D2FE", fontWeight: "800", lineHeight: TYPO.smallLine, fontSize: TYPO.small },
  writeInput: { backgroundColor: COLORS.field, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, minHeight: 56, paddingHorizontal: 14, marginTop: 14 },
  writeInputCorrect: { borderColor: COLORS.green },
  writeInputWrong: { borderColor: COLORS.red },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", marginTop: 12 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  disabledBtn: { opacity: 0.45 },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
