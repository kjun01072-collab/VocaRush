import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO, clamp } from "../theme";
import { DiagnosticResult, DiagnosticTestType, QuizQuestion, StudySet, VocabItem } from "../types";

function TopBack({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
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

function makeMeaningQuestion(word: VocabItem, pool: VocabItem[], seed: number): QuizQuestion {
  const wrongs = shuffle(pool.filter((w) => w.id !== word.id).map((w) => w.meaningKo), seed).slice(0, 3);
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
  const wrongs = shuffle(pool.filter((w) => w.id !== word.id).map((w) => w.reading), seed).slice(0, 3);
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
  const wrongs = shuffle(pool.filter((w) => w.id !== word.id).map((w) => w.word), seed).slice(0, 3);
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
  const allTypes = uniq(pool.flatMap((w) => w.questionTypes)).filter(Boolean);
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
  const correct = (word.synonyms || []).filter(Boolean)[0] || (word.relatedWords[0] || word.meaningKo);
  const wrongs = shuffle(
    pool
      .filter((w) => w.id !== word.id)
      .map((w) => w.synonyms[0] || w.relatedWords[0] || w.meaningKo),
    seed
  ).slice(0, 3);
  const choices = choiceSet(correct, wrongs, seed + 5);
  return {
    id: `q_syn_${word.id}_${seed}`,
    kind: "synonym",
    promptWordId: word.id,
    prompt: word.word,
    subPrompt: "동의어/유사 표현을 고르세요",
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

export function DiagnosticScreen({
  vocab,
  onBack,
  onComplete,
  onCreateWeakSet,
  latestResult,
}: {
  vocab: VocabItem[];
  onBack: () => void;
  onComplete: (result: DiagnosticResult, wrongWordIds: string[]) => void;
  onCreateWeakSet: (weakTypes: string[], wordIds: string[]) => void;
  latestResult: DiagnosticResult | null;
}) {
  const { t, tm } = useI18n();
  const [phase, setPhase] = useState<"setup" | "run" | "result">("setup");
  const [testType, setTestType] = useState<DiagnosticTestType>("전체 진단");
  const [count, setCount] = useState<10 | 20 | 30>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const pool = useMemo(() => (vocab.length >= 60 ? vocab : vocab.concat(vocab).concat(vocab)), [vocab]);

  const buildQuestions = (seed: number) => {
    const pickPool = shuffle(pool, seed).slice(0, count);
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
    const seed = 20000 + Date.now() % 10000;
    const q = buildQuestions(seed);
    setQuestions(q);
    setAnswers({});
    setIdx(0);
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
        weakSubjects: weakSubjects.map((k) => ({ key: (k.split(" / ")[0] as any) || "일본어", wrong: 1 })),
        weakQuestionTypes: weakTypes.map((k) => ({ key: k, wrong: 1 })),
        weakLevels: weakLevels.map((k) => ({ key: k as any, wrong: 1 })),
        mostMissedWordIds: uniq(graded.wrongWordIds).slice(0, 8),
        recommendedActions: ["약점 단어세트 만들기", "오답 복습 시작", "같은 유형만 다시 테스트"],
        weakTypes,
      };

      onComplete(res, graded.wrongWordIds);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack title={t("단어 진단 테스트")} onBack={phase === "setup" ? onBack : resetToSetup} />

      {phase === "setup" ? (
        <>
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.hero}>{t("진단 유형")}</Text>
            <Text style={styles.muted}>{t("시험이 아니라 “단어 약점 진단”입니다. (기출 메타데이터 기반)")}</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {(
                [
                  "전체 진단",
                  "목표 점수별 진단",
                  "독해 유형 진단",
                  "청독해 자료형 진단",
                  "기술문 표현 진단",
                  "종합과목 단어 진단",
                  "오답 재진단",
                ] as DiagnosticTestType[]
              ).map((typeLabel) => (
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
          <Text style={styles.muted}>{t("결과는 화면 상단 “최근 진단”에 저장됩니다.")}</Text>
          <Row style={{ marginTop: 12 }}>
            <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setPhase("setup")}>
              <Text style={styles.secondaryBtnText}>{t("다시 진단")}</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => {
                Alert.alert(t("안내"), t("진단 결과 화면은 App에서 리포트로도 확인할 수 있습니다."));
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
  backBtn: { height: 48, minWidth: 82, paddingHorizontal: 12, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center" },
  backText: { color: COLORS.text, fontWeight: "800" },
  topTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, textAlign: "center", flex: 1 },
  hero: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2 },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
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
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 16, minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 12 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  pill: { flex: 1, backgroundColor: COLORS.card2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 10, alignItems: "center" },
  pillOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  pillText: { color: COLORS.text, fontWeight: "800" },
});
