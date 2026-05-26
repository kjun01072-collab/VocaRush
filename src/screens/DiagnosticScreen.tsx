import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, Row, SectionHeader } from "../components/common";
import { getLearningCourseMeta, LEARNING_COURSES, wordMatchesLearningCourse } from "../data/learningCatalog";
import { useI18n } from "../i18n";
import { COLORS, TYPO } from "../theme";
import { DiagnosticResult, DiagnosticTestType, LearningCourse, QuizQuestion, VocabItem } from "../types";

function TopBack({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <Row style={[styles.stickyHeader, { justifyContent: "space-between", alignItems: "center" }]}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]}>
        <Text style={styles.backText}>‹ {t("뒤로")}</Text>
      </Pressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        {t(title)}
      </Text>
      <View style={{ width: 82 }} />
    </Row>
  );
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

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

const FALLBACK_TYPES = [
  "어휘 추론",
  "문맥 이해",
  "근거 찾기",
  "주장 파악",
  "정보 선택",
  "자료형",
  "그래프 해석",
  "비교·대조",
  "사회 문제",
  "경제",
  "정치 제도",
  "지리",
  "세계사",
  "비즈니스 영어",
  "스타트업 영어",
  "비즈니스 일본어",
  "대학생 표현",
];

function choiceSet(correct: string, wrongs: string[], seed: number, targetCount = 4) {
  const cleanCorrect = correct.trim();
  const cleanWrongs = uniq(
    wrongs
      .map((item) => item.trim())
      .filter((item) => item && item !== cleanCorrect)
  ).slice(0, targetCount - 1);
  const choices = cleanWrongs.slice();
  const slot = choices.length ? Math.abs(seed + cleanCorrect.length * 13) % (choices.length + 1) : 0;
  choices.splice(slot, 0, cleanCorrect);
  return choices;
}

function similarWords(word: VocabItem, pool: VocabItem[], seed: number) {
  const samePart = pool.filter((w) => w.id !== word.id && w.subject === word.subject && w.part === word.part);
  const sameSubject = pool.filter((w) => w.id !== word.id && w.subject === word.subject);
  const sameType = pool.filter(
    (w) => w.id !== word.id && w.questionTypes.some((type) => word.questionTypes.includes(type))
  );
  const fallback = pool.filter((w) => w.id !== word.id);
  const ranked = uniq([...samePart, ...sameType, ...sameSubject, ...fallback]);
  return shuffle(ranked, seed);
}

function distractors(
  word: VocabItem,
  pool: VocabItem[],
  seed: number,
  selector: (item: VocabItem) => string,
  extras: string[] = []
) {
  return similarWords(word, pool, seed)
    .map(selector)
    .concat(extras)
    .filter(Boolean);
}

function makeMeaningQuestion(word: VocabItem, pool: VocabItem[], seed: number): QuizQuestion {
  const wrongs = distractors(word, pool, seed, (w) => w.meaningKo);
  const choices = choiceSet(word.meaningKo, wrongs, seed + 1);
  return {
    id: `q_mean_${word.id}_${seed}`,
    kind: "meaning",
    promptWordId: word.id,
    prompt: word.word,
    subPrompt: "뜻을 고르세요",
    choices,
    answer: word.meaningKo,
  };
}

function makeReadingQuestion(word: VocabItem, pool: VocabItem[], seed: number): QuizQuestion {
  const wrongs = distractors(word, pool, seed, (w) => w.reading);
  const choices = choiceSet(word.reading, wrongs, seed + 2);
  return {
    id: `q_read_${word.id}_${seed}`,
    kind: "reading",
    promptWordId: word.id,
    prompt: word.word,
    subPrompt: "독음을 고르세요",
    choices,
    answer: word.reading,
  };
}

function makeBlankQuestion(word: VocabItem, pool: VocabItem[], seed: number): QuizQuestion {
  const sentence = word.exampleJa.replace(word.word, "____");
  const wrongs = distractors(word, pool, seed, (w) => w.word);
  const choices = choiceSet(word.word, wrongs, seed + 3);
  return {
    id: `q_blank_${word.id}_${seed}`,
    kind: "blank",
    promptWordId: word.id,
    prompt: sentence,
    subPrompt: "빈칸에 들어갈 단어를 고르세요",
    choices,
    answer: word.word,
  };
}

function makeTypeMatchQuestion(word: VocabItem, pool: VocabItem[], seed: number): QuizQuestion {
  const allTypes = uniq(pool.flatMap((w) => w.questionTypes).concat(FALLBACK_TYPES)).filter(Boolean);
  const correct = word.questionTypes[0] || "문맥 이해";
  const wrongs = shuffle(allTypes.filter((t) => t !== correct), seed).slice(0, 3);
  const choices = choiceSet(correct, wrongs, seed + 4);
  return {
    id: `q_type_${word.id}_${seed}`,
    kind: "typeMatch",
    promptWordId: word.id,
    prompt: word.word,
    subPrompt: "주요 출현 유형을 고르세요",
    choices,
    answer: correct,
  };
}

function makeSynonymQuestion(word: VocabItem, pool: VocabItem[], seed: number): QuizQuestion {
  const synonym = (word.synonyms || []).filter(Boolean)[0];
  const related = (word.relatedWords || []).filter(Boolean)[0];
  const correct = synonym || related || word.meaningKo;
  const subPrompt = synonym
    ? "동의어/유사 표현을 고르세요"
    : related
    ? "같은 주제의 관련어를 고르세요"
    : "뜻을 고르세요";
  const wrongs = synonym
    ? distractors(word, pool, seed, (w) => w.synonyms[0] || w.meaningKo)
    : related
    ? distractors(word, pool, seed, (w) => w.relatedWords[0] || w.word)
    : distractors(word, pool, seed, (w) => w.meaningKo);
  const choices = choiceSet(correct, wrongs, seed + 5);
  return {
    id: `q_syn_${word.id}_${seed}`,
    kind: "synonym",
    promptWordId: word.id,
    prompt: word.word,
    subPrompt,
    choices,
    answer: correct,
  };
}

function grade(questions: QuizQuestion[], answers: Record<string, string | string[]>) {
  let correctCount = 0;
  const wrongWordIds: string[] = [];
  const weakTypes: string[] = [];
  const weakSubjects: Record<string, number> = {};
  const weakLevels: Record<string, number> = {};
  const weakQTypes: Record<string, number> = {};

  for (const q of questions) {
    const a = answers[q.id];
    let ok = false;
    if (q.kind === "relatedPick") {
      const picked = Array.isArray(a) ? a : [];
      const correct = q.answers;
      ok =
        picked.length === q.pickCount &&
        picked.every((x) => correct.includes(x)) &&
        correct.every((x) => picked.includes(x));
    } else {
      ok = typeof a === "string" && a === q.answer;
    }
    if (ok) {
      correctCount += 1;
    } else {
      wrongWordIds.push(q.promptWordId);
    }
  }
  return { correctCount, wrongWordIds, weakTypes, weakSubjects, weakLevels, weakQTypes };
}

function diagnosticComment(accuracy: number, weakTypes: string[], courseTitle: string) {
  const weak = weakTypes.length ? ` 특히 ${weakTypes.slice(0, 2).join(", ")} 유형을 먼저 복습하면 좋아요.` : "";
  if (accuracy >= 85) return `${courseTitle} 기준이 꽤 안정적입니다. 이제 헷갈리는 보기까지 빠르게 구분하는 연습으로 올리면 됩니다.${weak}`;
  if (accuracy >= 65) return `${courseTitle} 핵심 단어는 잡혀 있어요. 비슷한 뜻의 선택지에서 흔들리는 구간을 줄이면 점수가 빨리 오릅니다.${weak}`;
  if (accuracy >= 40) return `${courseTitle} 기본 단어를 다시 정리할 타이밍입니다. 오늘은 진단 오답 세트를 만들어 짧게 반복해보세요.${weak}`;
  return `${courseTitle} 기초 단어부터 차근차근 다시 쌓는 편이 좋습니다. 단어장 20개와 빠른 OX로 감을 먼저 만들면 좋아요.${weak}`;
}

function testTypeOptions(course: LearningCourse): DiagnosticTestType[] {
  const courseType = getLearningCourseMeta(course).diagnosticType as DiagnosticTestType;
  if (course === "EJU_JAPANESE") {
    return [courseType, "독해 유형 진단", "청독해 자료형 진단", "기술문 표현 진단", "목표 점수별 진단", "오답 재진단"];
  }
  if (course === "EJU_SOGO") {
    return [courseType, "종합과목 단어 진단", "목표 점수별 진단", "오답 재진단"];
  }
  if (course === "EJU_SCIENCE") {
    return [courseType, "목표 점수별 진단", "오답 재진단"];
  }
  if (course === "TOEIC_BUSINESS") {
    return [courseType, "전체 진단", "오답 재진단"];
  }
  return [courseType, "전체 진단", "오답 재진단"];
}

export function DiagnosticScreen({
  vocab,
  learningCourse,
  onBack,
  onComplete,
  onCreateWeakSet,
  latestResult,
}: {
  vocab: VocabItem[];
  learningCourse: LearningCourse;
  onBack: () => void;
  onComplete: (result: DiagnosticResult, wrongWordIds: string[]) => void;
  onCreateWeakSet: (weakTypes: string[], wordIds: string[]) => void;
  latestResult: DiagnosticResult | null;
}) {
  const { t, tm } = useI18n();
  const [phase, setPhase] = useState<"setup" | "run" | "result">("setup");
  const [selectedCourse, setSelectedCourse] = useState<LearningCourse>(learningCourse);
  const [testType, setTestType] = useState<DiagnosticTestType>(getLearningCourseMeta(learningCourse).diagnosticType as DiagnosticTestType);
  const [count, setCount] = useState<10 | 20 | 30>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const courseMeta = getLearningCourseMeta(selectedCourse);
  const testOptions = testTypeOptions(selectedCourse);
  const courseVocab = useMemo(
    () => vocab.filter((item) => wordMatchesLearningCourse(item, selectedCourse)),
    [selectedCourse, vocab]
  );

  const filteredVocab = useMemo(() => {
    const base = courseVocab.length ? courseVocab : vocab.filter((item) => wordMatchesLearningCourse(item, "EJU_JAPANESE"));
    let next = base;
    if (testType === "독해 유형 진단") {
      next = base.filter((item) => item.subject === "일본어" || item.questionTypes.some((type) => ["문맥 이해", "어휘 추론", "근거 찾기", "주장 파악"].includes(type)));
    } else if (testType === "청독해 자료형 진단") {
      next = base.filter((item) => item.subject === "청독해" || item.questionTypes.some((type) => ["자료형", "그래프 해석", "정보 선택"].includes(type)));
    } else if (testType === "기술문 표현 진단") {
      next = base.filter((item) => item.subject === "기술문" || item.level === "기술문 표현");
    } else if (testType === "EJU 이과 진단") {
      next = base.filter((item) => wordMatchesLearningCourse(item, "EJU_SCIENCE"));
    } else if (testType === "종합과목 단어 진단" || testType === "EJU 문과 진단" || testType === "EJU 종합과목 진단") {
      next = base.filter((item) => item.subject === "종합과목");
    } else if (testType === "TOEIC 어휘 진단") {
      next = base.filter((item) => item.subject === "영어" && item.questionTypes.includes("TOEIC"));
    } else if (testType === "오답 재진단") {
      next = base.filter((item) => item.cumulativeWrongAttempts > 0 || item.recentWrongAttempts7d > 0);
    }
    if (testType === "오답 재진단") return next;
    return next.length >= 4 ? next : base;
  }, [courseVocab, testType, vocab]);

  const pool = useMemo(
    () => (filteredVocab.length >= 60 ? filteredVocab : filteredVocab.concat(filteredVocab).concat(filteredVocab)),
    [filteredVocab]
  );

  const buildQuestions = (seed: number) => {
    const uniquePool = uniq(pool);
    const pickPool = shuffle(uniquePool, seed).slice(0, Math.min(count, uniquePool.length));
    const q: QuizQuestion[] = [];
    for (let i = 0; i < pickPool.length; i++) {
      const w = pickPool[i];
      const s = seed + i * 19;
      const mix = i % 5;
      if (mix === 0) q.push(makeMeaningQuestion(w, pool, s));
      else if (mix === 1) q.push(makeReadingQuestion(w, pool, s));
      else if (mix === 2) q.push(makeBlankQuestion(w, pool, s));
      else if (mix === 3) q.push(makeSynonymQuestion(w, pool, s));
      else q.push(makeTypeMatchQuestion(w, pool, s));
    }
    return q;
  };

  const current = questions[idx];

  function displayOption(value: string) {
    const meaning = tm(value);
    return meaning === value ? t(value) : meaning;
  }

  function start() {
    if (!filteredVocab.length) {
      Alert.alert(
        t("진단"),
        t(testType === "오답 재진단" ? "아직 실제 오답 기록이 없습니다." : "이 학습 코스에는 아직 진단할 단어가 없습니다.")
      );
      return;
    }
    const seed = 20000 + Date.now() % 10000;
    const q = buildQuestions(seed);
    setQuestions(q);
    setAnswers({});
    setIdx(0);
    setResult(null);
    setPhase("run");
  }

  function submitAnswer(a: string) {
    if (!current) return;
    setAnswers((p) => ({ ...p, [current.id]: a }));
  }

  function next() {
    if (!current) return;
    const a = answers[current.id];
    if (!a) {
      Alert.alert(t("답안"), t("정답을 선택해 주세요."));
      return;
    }
    const n = idx + 1;
    if (n >= questions.length) {
      const graded = grade(questions, answers);
      const correctCount = graded.correctCount;
      const accuracy = Math.round((correctCount / Math.max(1, questions.length)) * 100);

      // derive weak types roughly from missed words metadata
      const byId = new Map(vocab.map((v) => [v.id, v] as const));
      const wrongItems = graded.wrongWordIds.map((id) => byId.get(id)).filter(Boolean) as VocabItem[];
      const typeWrong = new Map<string, number>();
      const subjWrong = new Map<string, number>();
      const lvlWrong = new Map<string, number>();
      for (const w of wrongItems) {
        const t = w.questionTypes[0] || "문맥 이해";
        typeWrong.set(t, (typeWrong.get(t) || 0) + 1);
        subjWrong.set(`${w.subject} / ${w.part}`, (subjWrong.get(`${w.subject} / ${w.part}`) || 0) + 1);
        lvlWrong.set(w.level, (lvlWrong.get(w.level) || 0) + 1);
      }
      const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
      const weakTypes = top(typeWrong).slice(0, 3);
      const weakSubjects = top(subjWrong).slice(0, 3);
      const weakLevels = top(lvlWrong).slice(0, 3);

      const res: DiagnosticResult = {
        id: `diag_${Date.now()}`,
        createdAt: Date.now(),
        testType,
        questionCount: questions.length,
        correctCount,
        accuracy,
        comment: diagnosticComment(accuracy, weakTypes, courseMeta.title),
        learningCourse: selectedCourse,
        weakSubjects: weakSubjects.map((k) => ({ key: (k.split(" / ")[0] as any) || "일본어", wrong: 1 })),
        weakQuestionTypes: weakTypes.map((k) => ({ key: k, wrong: 1 })),
        weakLevels: weakLevels.map((k) => ({ key: k as any, wrong: 1 })),
        mostMissedWordIds: uniq(graded.wrongWordIds).slice(0, 8),
        recommendedActions: ["약점 단어세트 만들기", "오답 복습 시작", "같은 유형만 다시 테스트"],
        weakTypes,
      };

      onComplete(res, graded.wrongWordIds);
      setResult(res);
      setPhase("result");
      return;
    }
    setIdx(n);
  }

  function resetToSetup() {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setIdx(0);
  }

  const answered = current ? answers[current.id] : null;
  const isCorrect = current && answered ? answered === (current as any).answer : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack title={t("단어 진단 테스트")} onBack={phase === "setup" ? onBack : resetToSetup} />

      {phase === "setup" ? (
        <>
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.hero}>{t("학습 카탈로그")}</Text>
            <Text style={styles.muted}>{t("코스를 먼저 고르면 해당 언어와 시험 범위 안에서만 진단합니다.")}</Text>
            <View style={styles.courseGrid}>
              {LEARNING_COURSES.map((course) => {
                const selected = selectedCourse === course.id;
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => {
                      setSelectedCourse(course.id);
                      setTestType(getLearningCourseMeta(course.id).diagnosticType as DiagnosticTestType);
                    }}
                    style={({ pressed }) => [styles.courseCard, selected && styles.courseCardOn, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={styles.courseTitle}>{t(course.title)}</Text>
                    <Text style={styles.courseSubtitle}>{t(course.subtitle)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text style={styles.hero}>{t("진단 유형")}</Text>
            <Text style={styles.muted}>{t(courseMeta.description)}</Text>
            <Text style={styles.muted}>{t("현재 후보 단어")} {filteredVocab.length}{t("개")} · {t("비슷한 보기끼리 섞어 난이도를 올렸습니다.")}</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {testOptions.map((typeLabel) => (
                <Pressable
                  key={typeLabel}
                  onPress={() => setTestType(typeLabel)}
                  style={({ pressed }) => [styles.choice, testType === typeLabel && styles.choiceOn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.choiceText}>{t(typeLabel)}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text style={styles.hero}>{t("문항 수")}</Text>
            <Row style={{ marginTop: 12 }}>
              {([10, 20, 30] as const).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setCount(n)}
                  style={({ pressed }) => [styles.pill, count === n && styles.pillOn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.pillText}>{n}{t("문제")}</Text>
                </Pressable>
              ))}
            </Row>
          </Card>

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={start}>
            <Text style={styles.primaryBtnText}>{t("진단 시작")}</Text>
          </Pressable>

          {latestResult ? (
            <>
              <SectionHeader title="최근 진단" />
              <Card>
                <Text style={styles.itemTitle}>{t(latestResult.testType)}</Text>
                <Text style={styles.muted}>
                  {t("정답률")} {latestResult.accuracy}% · {latestResult.correctCount}/{latestResult.questionCount}
                </Text>
                <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
                  {latestResult.weakTypes.slice(0, 4).map((t) => (
                    <Badge key={t} label={t} tone="default" />
                  ))}
                </Row>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {phase === "run" && current ? (
        <Card style={{ marginTop: 12 }}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Badge label={`${idx + 1}/${questions.length}`} tone="default" />
            <Badge label={testType} tone="violet" />
          </Row>
          <Text style={styles.prompt}>{t(current.prompt)}</Text>
          {current.subPrompt ? <Text style={styles.muted}>{t(current.subPrompt)}</Text> : null}

          <View style={{ marginTop: 12, gap: 10 }}>
            {current.kind === "relatedPick" ? (
              <Text style={styles.muted}>{t("관련어 다중 선택은 데모에서는 제외했습니다.")}</Text>
            ) : (
              current.choices.map((c) => {
                const chosen = answered === c;
                const correct = (current as any).answer === c;
                const show = !!answered;
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
                    disabled={!!answered}
                    onPress={() => submitAnswer(c)}
                    style={({ pressed }) => [styles.choice, tone, pressed && !answered && { opacity: 0.9 }]}
                  >
                    <Text style={styles.choiceText}>{displayOption(c)}</Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {answered ? (
            <>
              <Card style={styles.feedback}>
                <Text style={styles.feedbackTitle}>{t(isCorrect ? "정답" : "오답")}</Text>
                <Text style={styles.muted}>{t("정답")}: {displayOption((current as any).answer)}</Text>
              </Card>
              <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={next}>
                <Text style={styles.primaryBtnText}>{t("다음")}</Text>
              </Pressable>
            </>
          ) : null}
        </Card>
      ) : null}

      {phase === "result" ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.hero}>{t("진단 완료")}</Text>
          {result ? (
            <>
              <Text style={styles.resultScore}>{result.accuracy}%</Text>
              <Text style={styles.muted}>
                {result.correctCount}/{result.questionCount} · {t(result.testType)}
              </Text>
              <Text style={styles.commentText}>{t(result.comment)}</Text>
              {result.weakTypes.length ? (
                <Row style={{ marginTop: 12, flexWrap: "wrap" }}>
                  {result.weakTypes.map((type) => (
                    <Badge key={type} label={type} tone="violet" />
                  ))}
                </Row>
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>{t("결과는 최근 진단에 저장됩니다.")}</Text>
          )}
          <Row style={{ marginTop: 12 }}>
            <Pressable
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => {
                if (!result?.mostMissedWordIds.length) {
                  Alert.alert(t("약점 세트"), t("이번 진단에서 새로 만들 오답 세트가 없습니다."));
                  return;
                }
                onCreateWeakSet(result.weakTypes.length ? result.weakTypes : [result.testType], result.mostMissedWordIds);
              }}
            >
              <Text style={styles.secondaryBtnText}>{t("오답 세트 만들기")}</Text>
            </Pressable>
            <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setPhase("setup")}>
              <Text style={styles.secondaryBtnText}>{t("다시 진단")}</Text>
            </Pressable>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Pressable
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => {
                onBack();
              }}
            >
              <Text style={styles.secondaryBtnText}>{t("홈으로")}</Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  stickyHeader: { backgroundColor: COLORS.bg, paddingBottom: 10, zIndex: 10 },
  backBtn: { height: 48, minWidth: 82, paddingHorizontal: 12, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center" },
  backText: { color: COLORS.text, fontWeight: "800" },
  topTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, textAlign: "center", flex: 1 },
  hero: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2 },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  courseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  courseCard: { width: "48%", minHeight: 92, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2 },
  courseCardOn: { borderColor: COLORS.blue, backgroundColor: "#10143C" },
  courseTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  courseSubtitle: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 6 },
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  prompt: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2, marginTop: 14 },
  choice: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2 },
  choiceOn: { borderColor: COLORS.blue, backgroundColor: "#10143C" },
  choiceDefault: {},
  choiceCorrect: { backgroundColor: "#173D35", borderColor: "#173D35" },
  choiceCorrectOutline: { borderColor: "#4ADE80" },
  choiceWrong: { backgroundColor: "#3B1F3E", borderColor: "#3B1F3E" },
  choiceText: { color: COLORS.text, fontWeight: "800" },
  feedback: { marginTop: 12, backgroundColor: "#10143C" },
  feedbackTitle: { color: COLORS.gold, fontWeight: "800", fontSize: TYPO.h3 },
  resultScore: { color: COLORS.text, fontWeight: "900", fontSize: 42, marginTop: 8 },
  commentText: { color: "#DDE3FF", fontWeight: "800", lineHeight: TYPO.bodyLine, marginTop: 12 },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 16, minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 12 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  pill: { flex: 1, backgroundColor: COLORS.card2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 10, alignItems: "center" },
  pillOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  pillText: { color: COLORS.text, fontWeight: "800" },
});
