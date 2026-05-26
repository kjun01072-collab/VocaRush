import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { difficultyLabel } from "../data/vocabData";
import { useI18n } from "../i18n";
import { COLORS, PRESS_FEEDBACK, RADII, TYPO } from "../theme";
import { StudySet, VocabDifficulty, VocabItem } from "../types";
import { getSafeErrorMessage, logInternalError } from "../utils/errors";
import { parseStudySetRows, StudySetRowInput } from "../utils/studySetRows";
import { sanitizeText, validateRequiredText } from "../utils/validation";
import { pickDocumentUploadFile, UploadableFile } from "../utils/uploadFiles";

function displaySetDetailLabel(label: string) {
  if (label === "출원 영어") return "TOEFL·IELTS";
  return label;
}

type SetEditInput = {
  title: string;
  description: string;
  rows: StudySetRowInput[];
};

function confirmDangerAction({
  title,
  body,
  cancelLabel,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const browserConfirm = (globalThis as typeof globalThis & { confirm?: (message?: string) => boolean }).confirm;
  if (typeof browserConfirm === "function") {
    if (browserConfirm(`${title}\n\n${body}`)) onConfirm();
    return;
  }

  Alert.alert(title, body, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

function TopBack({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Row style={[styles.stickyHeader, { justifyContent: "space-between", alignItems: "center" }]}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && PRESS_FEEDBACK.soft]}>
        <Text style={styles.backText}>‹ {t("뒤로")}</Text>
      </Pressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        {t(title)}
      </Text>
      <View style={{ width: 82, alignItems: "flex-end" }}>{right || null}</View>
    </Row>
  );
}

function topCounts(values: string[], limit = 4) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

type DifficultyPlanId = "hard_first" | "hard_only" | "top_frequency" | "all";

const DIFFICULTY_PLANS: Array<{
  id: DifficultyPlanId;
  label: string;
  body: string;
  minDifficulty: VocabDifficulty;
  sort: "hard" | "frequency";
}> = [
  {
    id: "hard_first",
    label: "어려운 단어 우선",
    body: "난이도 3~5 단어만 골라 어려운 순서로 시작합니다.",
    minDifficulty: 3,
    sort: "hard",
  },
  {
    id: "hard_only",
    label: "고난도만",
    body: "난이도 4~5 단어만 테스트하고 싶을 때 씁니다.",
    minDifficulty: 4,
    sort: "hard",
  },
  {
    id: "top_frequency",
    label: "빈출 핵심",
    body: "너무 쉬운 단어는 빼고 빈도 높은 단어부터 봅니다.",
    minDifficulty: 2,
    sort: "frequency",
  },
  {
    id: "all",
    label: "전체",
    body: "세트 전체를 원래 우선순위대로 학습합니다.",
    minDifficulty: 1,
    sort: "frequency",
  },
];

function importanceValue(word: VocabItem) {
  if (word.importance === "최우선") return 4;
  if (word.importance === "매우 중요") return 3;
  if (word.importance === "중요") return 2;
  return 1;
}

export function SetDetailScreen({
  set,
  vocabById,
  onBack,
  onStartFlashcard,
  onStartLearn,
  onStartTest,
  onStartReview,
  onOpenHighlight,
  onOpenWord,
  onOpenWordListForSet,
  canEdit,
  onSaveSetEdits,
  onDuplicateSet,
  onDeleteSet,
  onExtractImportFile,
}: {
  set: StudySet;
  vocabById: Map<string, VocabItem>;
  onBack: () => void;
  onStartFlashcard: (wordIds: string[], title: string) => void;
  onStartLearn: (wordIds: string[], title: string) => void;
  onStartTest: (wordIds: string[], title: string) => void;
  onStartReview: (wordIds: string[], title: string) => void;
  onOpenHighlight?: () => void;
  onOpenWord: (id: string) => void;
  onOpenWordListForSet: (setId: string) => void;
  canEdit?: boolean;
  onSaveSetEdits?: (setId: string, input: SetEditInput) => void;
  onDuplicateSet?: (setId: string) => void;
  onDeleteSet?: (setId: string) => void;
  onExtractImportFile?: (file: UploadableFile) => Promise<StudySetRowInput[]>;
}) {
  const { t, tm } = useI18n();
  const [editorOpen, setEditorOpen] = useState(false);
  const [difficultyPlanId, setDifficultyPlanId] = useState<DifficultyPlanId>("hard_first");
  const [difficultyPickerOpen, setDifficultyPickerOpen] = useState(false);
  const words = useMemo(() => set.wordIds.map((id) => vocabById.get(id)).filter(Boolean) as VocabItem[], [set.wordIds, vocabById]);
  const avgDiff = useMemo(() => {
    if (!words.length) return 0;
    return Math.round((words.reduce((s, w) => s + w.difficulty, 0) / words.length) * 10) / 10;
  }, [words]);
  const commonType = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of words) {
      const t = w.questionTypes[0] || "문맥 이해";
      m.set(t, (m.get(t) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "문맥 이해";
  }, [words]);
  const avgDifficulty = Math.max(1, Math.min(5, Math.round(avgDiff || 1))) as VocabDifficulty;
  const difficulty = difficultyLabel(avgDifficulty);
  const topSubjects = useMemo(() => topCounts(words.map((w) => w.part || w.subject), 4), [words]);
  const topTypes = useMemo(() => topCounts(words.flatMap((w) => w.questionTypes.slice(0, 2)), 4), [words]);
  const selectedDifficultyPlan = DIFFICULTY_PLANS.find((plan) => plan.id === difficultyPlanId) || DIFFICULTY_PLANS[0];
  const difficultyCounts = useMemo(
    () => ({
      high: words.filter((word) => word.difficulty >= 4).length,
      mediumUp: words.filter((word) => word.difficulty >= 3).length,
      coreUp: words.filter((word) => word.difficulty >= 2).length,
      all: words.length,
    }),
    [words]
  );
  const prioritizedWords = useMemo(() => {
    const pool = words.filter((word) => word.difficulty >= selectedDifficultyPlan.minDifficulty);
    const source = pool.length ? pool : words;
    const originalOrder = new Map(set.wordIds.map((id, index) => [id, index] as const));
    return source.slice().sort((a, b) => {
      if (selectedDifficultyPlan.sort === "hard") {
        return (
          b.difficulty - a.difficulty ||
          importanceValue(b) - importanceValue(a) ||
          b.frequencyScore - a.frequencyScore ||
          (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0)
        );
      }
      return (
        b.frequencyScore - a.frequencyScore ||
        b.difficulty - a.difficulty ||
        importanceValue(b) - importanceValue(a) ||
        (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0)
      );
    });
  }, [selectedDifficultyPlan, set.wordIds, words]);
  const recentOccurrence = useMemo(() => {
    const latest = words
      .flatMap((w) => w.appearedIn)
      .sort((a, b) => b.year - a.year || (a.session === b.session ? 0 : a.session === "제2회" ? 1 : -1))[0];
    return latest ? `${latest.year}${t("년")} ${latest.session}` : "-";
  }, [words, t]);

  const activeWordIds = prioritizedWords.slice(0, 80).map((word) => word.id);
  const activeTitle = `${set.title} · ${t(selectedDifficultyPlan.label)}`;
  const canEditThisSet = Boolean(canEdit && onSaveSetEdits);
  const canDeleteThisSet = Boolean(canEditThisSet && onDeleteSet);
  const confirmDeleteSet = (afterDelete?: () => void) =>
    confirmDangerAction({
      title: t("세트 지우기"),
      body: t("이 작업은 되돌릴 수 없습니다."),
      cancelLabel: t("취소"),
      confirmLabel: t("삭제"),
      onConfirm: () => {
        onDeleteSet?.(set.id);
        afterDelete?.();
      },
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack
        title={t("세트")}
        onBack={onBack}
        right={
          canEditThisSet ? (
            <Pressable
              onPress={() => setEditorOpen(true)}
              style={({ pressed }) => [styles.headerIconBtn, pressed && PRESS_FEEDBACK.soft]}
              accessibilityRole="button"
              accessibilityLabel={t("세트 수정하기")}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
            </Pressable>
          ) : null
        }
      />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.setTitle}>{t(set.title)}</Text>
        <Text style={styles.desc}>{t(set.description)}</Text>

        <Row style={{ marginTop: 12, flexWrap: "wrap" }}>
          <Badge label={`${t("단어")} ${set.wordCount}${t("개")}`} tone="default" />
          <DifficultyBadge difficulty={avgDifficulty} compact />
          <Badge label={`${t("대표 유형")} ${t(displaySetDetailLabel(commonType))}`} tone="blue" />
          {set.createdFrom === "diagnostic" ? <Badge label={t("진단 기반")} tone="violet" /> : null}
        </Row>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("학습 레벨")}</Text>
            <Text style={styles.summaryValue}>{t("난이도")} {avgDifficulty}/5</Text>
            <Text style={styles.summaryHelp}>{t(difficulty.description)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("최근 출현")}</Text>
            <Text style={styles.summaryValue}>{recentOccurrence}</Text>
            <Text style={styles.summaryHelp}>{t("연도/회차 메타데이터 기준")}</Text>
          </View>
        </View>

        <View style={styles.difficultyPanel}>
          <Row style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>{t("난이도별 학습")}</Text>
              <Text style={styles.difficultyCompactText}>
                {t(selectedDifficultyPlan.label)} · {activeWordIds.length}{t("개")}
              </Text>
            </View>
            <Pressable
              onPress={() => setDifficultyPickerOpen((prev) => !prev)}
              style={({ pressed }) => [styles.moreSmallBtn, pressed && PRESS_FEEDBACK.soft]}
              accessibilityRole="button"
              accessibilityLabel={t(difficultyPickerOpen ? "접기" : "더보기")}
            >
              <Text style={styles.moreSmallText}>{t(difficultyPickerOpen ? "접기" : "더보기")}</Text>
              <Ionicons name={difficultyPickerOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.text} />
            </Pressable>
          </Row>
          {difficultyPickerOpen ? (
            <>
              <Text style={styles.desc}>{t("쉬운 단어를 제외하고, 지금 필요한 난이도부터 학습/테스트합니다.")}</Text>
              <View style={styles.difficultyGrid}>
                {DIFFICULTY_PLANS.map((plan) => {
                  const count =
                    plan.id === "hard_only"
                      ? difficultyCounts.high
                      : plan.id === "hard_first"
                      ? difficultyCounts.mediumUp
                      : plan.id === "top_frequency"
                      ? difficultyCounts.coreUp
                      : difficultyCounts.all;
                  const selected = plan.id === difficultyPlanId;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => {
                        setDifficultyPlanId(plan.id);
                        setDifficultyPickerOpen(false);
                      }}
                      style={({ pressed }) => [styles.difficultyChip, selected && styles.difficultyChipOn, pressed && (selected ? PRESS_FEEDBACK.strong : PRESS_FEEDBACK.soft)]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(plan.label)}
                    >
                      <Text style={[styles.difficultyChipTitle, selected && styles.difficultyChipTitleOn]}>{t(plan.label)}</Text>
                      <Text style={styles.difficultyChipMeta}>{count}{t("개")}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.difficultyHelp}>
                {t(selectedDifficultyPlan.body)} · {t("선택된 단어")} {activeWordIds.length}{t("개")}
              </Text>
            </>
          ) : null}
        </View>

        <Row style={{ marginTop: 14 }}>
          <Pressable style={({ pressed }) => [styles.primaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.strong]} onPress={() => onStartFlashcard(activeWordIds, `${activeTitle} · ${t("낱말카드")}`)}>
            <Text style={styles.primaryBtnText}>{t("낱말카드")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => onStartLearn(activeWordIds, `${activeTitle} · ${t("학습하기")}`)}>
            <Text style={styles.secondaryBtnText}>{t("학습하기")}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => onStartTest(activeWordIds, `${activeTitle} · ${t("테스트")}`)}>
            <Text style={styles.secondaryBtnText}>{t("테스트")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]}
            onPress={() => onStartReview(activeWordIds, `${activeTitle} · ${t("오답 복습")}`)}
          >
            <Text style={styles.secondaryBtnText}>{t("오답 복습")}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && PRESS_FEEDBACK.soft]} onPress={() => onOpenWordListForSet(set.id)}>
            <Text style={styles.secondaryBtnText}>{t("단어 전체 보기")}</Text>
          </Pressable>
        </Row>
      </Card>

      <Card style={styles.manageCard}>
        <Text style={styles.blockTitle}>{t("세트 관리")}</Text>
        <Text style={styles.desc}>
          {canEditThisSet
            ? t("단어를 직접 추가하거나 수정하고, Quizlet처럼 붙여넣기나 파일 가져오기로 빠르게 채울 수 있습니다.")
            : t("공식 세트는 원본을 보호합니다. 수정하려면 사본을 만들어 개인 세트로 관리하세요.")}
        </Text>
        <Row style={{ marginTop: 14, flexWrap: "wrap" }}>
          {canEditThisSet ? (
            <Pressable
              style={({ pressed }) => [styles.manageBtn, styles.manageBtnPrimary, pressed && PRESS_FEEDBACK.soft]}
              onPress={() => setEditorOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("세트 수정하기")}
            >
              <Ionicons name="pencil-outline" size={18} color={COLORS.text} />
              <Text style={styles.manageBtnText}>{t("세트 수정하기")}</Text>
            </Pressable>
          ) : onDuplicateSet ? (
            <Pressable
              style={({ pressed }) => [styles.manageBtn, styles.manageBtnPrimary, pressed && PRESS_FEEDBACK.soft]}
              onPress={() => onDuplicateSet(set.id)}
              accessibilityRole="button"
              accessibilityLabel={t("사본 만들어 수정")}
            >
              <Ionicons name="copy-outline" size={18} color={COLORS.text} />
              <Text style={styles.manageBtnText}>{t("사본 만들어 수정")}</Text>
            </Pressable>
          ) : null}
          {canDeleteThisSet ? (
            <Pressable
              style={({ pressed }) => [styles.manageBtn, styles.manageBtnDanger, pressed && PRESS_FEEDBACK.soft]}
              onPress={() => confirmDeleteSet()}
              accessibilityRole="button"
              accessibilityLabel={t("세트 지우기")}
            >
              <Ionicons name="trash-outline" size={18} color="#FFB4B4" />
              <Text style={[styles.manageBtnText, styles.manageBtnDangerText]}>{t("세트 지우기")}</Text>
            </Pressable>
          ) : null}
        </Row>
      </Card>

      {set.createdFrom === "highlight" ? (
        <Card style={styles.highlightUploadCard}>
          <Text style={styles.blockTitle}>{t("사진·파일에서 단어 추가")}</Text>
          <Text style={styles.desc}>
            {t("교재 사진이나 이미지 파일을 올리면 추출 후보를 보여주고, 선택한 단어만 이 세트에 저장합니다.")}
          </Text>
          <Pressable
            onPress={() => onOpenHighlight?.()}
            style={({ pressed }) => [styles.primaryBtn, { marginTop: 14 }, pressed && PRESS_FEEDBACK.strong]}
          >
            <Text style={styles.primaryBtnText}>{t("사진·파일 업로드")}</Text>
          </Pressable>
        </Card>
      ) : null}

      <SectionHeader title="세트 구성" />
      <Card>
        <Text style={styles.blockTitle}>{t("주요 유형")}</Text>
        {topTypes.map(([type, count]) => (
          <View key={type} style={styles.distRow}>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.distLabel}>{t(displaySetDetailLabel(type))}</Text>
              <Text style={styles.distCount}>{count}{t("개")}</Text>
            </Row>
            <ProgressBar value={words.length ? (count / words.length) * 100 : 0} />
          </View>
        ))}

        <Text style={[styles.blockTitle, { marginTop: 16 }]}>{t("주요 파트")}</Text>
        {topSubjects.map(([subject, count]) => (
          <View key={subject} style={styles.distRow}>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.distLabel}>{t(displaySetDetailLabel(subject))}</Text>
              <Text style={styles.distCount}>{count}{t("개")}</Text>
            </Row>
            <ProgressBar value={words.length ? (count / words.length) * 100 : 0} />
          </View>
        ))}
      </Card>

      <SectionHeader title="우선 학습 단어" right={<Text style={styles.rightHint}>{t(selectedDifficultyPlan.label)}</Text>} />
      {prioritizedWords.slice(0, 10).map((w) => (
        <Pressable
          key={w.id}
          onPress={() => onOpenWord(w.id)}
          style={({ pressed }) => [styles.wordRow, pressed && PRESS_FEEDBACK.soft]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.word}>{w.word}</Text>
            <Text style={styles.muted}>{w.reading} · {tm(w.meaningKo)}</Text>
          </View>
          <View style={styles.wordMetaWrap}>
            <DifficultyBadge difficulty={w.difficulty} compact />
            <Text style={styles.meta}>{t("빈출")} {w.frequencyScore}</Text>
          </View>
        </Pressable>
      ))}

      {!words.length ? (
        <Card>
          <Text style={styles.muted}>{t("아직 이 세트에 표시할 단어가 없습니다.")}</Text>
          <Pressable
            onPress={() => Alert.alert(t("세트"), t("단어가 없는 세트입니다. 진단/오답/형광펜을 통해 세트를 채워보세요."))}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9, marginTop: 12 }]}
          >
            <Text style={styles.secondaryBtnText}>{t("안내 보기")}</Text>
          </Pressable>
        </Card>
      ) : null}

      <View style={{ height: 110 }} />

      <SetEditorModal
        visible={editorOpen}
        close={() => setEditorOpen(false)}
        set={set}
        words={words}
        canDelete={canDeleteThisSet}
        onDelete={onDeleteSet ? () => confirmDeleteSet(() => setEditorOpen(false)) : undefined}
        onSave={(input) => {
          onSaveSetEdits?.(set.id, input);
          setEditorOpen(false);
        }}
        onExtractImportFile={onExtractImportFile}
      />
    </ScrollView>
  );
}

function rowsFromWords(words: VocabItem[]): StudySetRowInput[] {
  return words.map((word) => ({
    id: word.id,
    word: word.word,
    reading: word.reading,
    meaningKo: word.meaningKo,
  }));
}

function emptyRow(): StudySetRowInput {
  return { word: "", reading: "", meaningKo: "" };
}

function SetEditorModal({
  visible,
  close,
  set,
  words,
  canDelete,
  onSave,
  onDelete,
  onExtractImportFile,
}: {
  visible: boolean;
  close: () => void;
  set: StudySet;
  words: VocabItem[];
  canDelete: boolean;
  onSave: (input: SetEditInput) => void;
  onDelete?: () => void;
  onExtractImportFile?: (file: UploadableFile) => Promise<StudySetRowInput[]>;
}) {
  const { t, language } = useI18n();
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description);
  const [rows, setRows] = useState<StudySetRowInput[]>(() => rowsFromWords(words));
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const parsedImportRows = useMemo(() => parseStudySetRows(importText), [importText]);

  useEffect(() => {
    if (!visible) return;
    setTitle(set.title);
    setDescription(set.description);
    setRows(rowsFromWords(words));
    setImportText("");
    setImportOpen(false);
  }, [set.description, set.id, set.title, visible, words]);

  function updateRow(index: number, patch: Partial<StudySetRowInput>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => prev.concat(emptyRow()));
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)));
  }

  function importRows(nextRows: StudySetRowInput[], mode: "append" | "replace") {
    if (!nextRows.length) {
      Alert.alert(t("문서 스캔"), t("인식된 단어가 없습니다."));
      return;
    }
    setRows((prev) => (mode === "replace" ? nextRows : prev.concat(nextRows)));
    setImportOpen(false);
    setImportText("");
  }

  async function pickFile() {
    const file = await pickDocumentUploadFile([
      "text/plain",
      "text/csv",
      "text/tab-separated-values",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
      "image/heif",
    ]);
    if (!file) return;
    setLoading(true);
    try {
      const fileName = String(file.name || "").toLowerCase();
      const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/.test(fileName);
      if (isImage) {
        if (!onExtractImportFile) {
          Alert.alert(t("문서 스캔"), t("이미지 스캔은 형광펜 업로드에서 사용할 수 있습니다."));
          return;
        }
        const extracted = await onExtractImportFile(file);
        importRows(extracted, "append");
        return;
      }
      const fileText = await file.text();
      const imported = parseStudySetRows(fileText);
      if (!imported.length) {
        Alert.alert(t("문서 스캔"), t("txt, csv, tsv 파일은 한 줄에 단어/읽는 법/뜻 형식으로 가져올 수 있습니다."));
        return;
      }
      setImportText(fileText);
      importRows(imported, "append");
    } catch (error) {
      logInternalError(error, "SetEditorModal.pickFile");
      Alert.alert(t("문서 스캔"), getSafeErrorMessage(error, language));
    } finally {
      setLoading(false);
    }
  }

  function save() {
    const titleValidation = validateRequiredText(title || "내 단어장", 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("세트 수정하기"), titleValidation.message);
      return;
    }

    const cleanRows = rows
      .map((row) => ({
        id: row.id,
        word: sanitizeText(row.word, 80),
        reading: sanitizeText(row.reading || row.word, 80),
        meaningKo: sanitizeText(row.meaningKo, 160),
      }))
      .filter((row) => row.word || row.meaningKo);

    if (!cleanRows.length) {
      Alert.alert(t("세트 수정하기"), t("추가할 단어를 한 개 이상 입력해주세요."));
      return;
    }
    if (cleanRows.some((row) => !row.word || !row.meaningKo)) {
      Alert.alert(t("세트 수정하기"), t("단어와 뜻을 모두 입력해 주세요."));
      return;
    }
    if (cleanRows.length > 300) {
      Alert.alert(t("세트 수정하기"), t("입력한 문장이 너무 깁니다."));
      return;
    }

    onSave({
      title: titleValidation.value,
      description: sanitizeText(description, 180) || t("학생이 직접 만든 단어장"),
      rows: cleanRows,
    });
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.editorSafe}>
        <ScrollView style={styles.editorScreen} contentContainerStyle={styles.editorScroll} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
          <Row style={styles.editorTop}>
            <Pressable onPress={close} style={({ pressed }) => [styles.editorCircleBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.editorTitle}>{t("세트 수정하기")}</Text>
            <Pressable onPress={save} style={({ pressed }) => [styles.editorCircleBtn, styles.editorSaveBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("저장")}>
              <Ionicons name="checkmark" size={26} color={COLORS.text} />
            </Pressable>
          </Row>

          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            placeholder={t("제목")}
            placeholderTextColor="#9EA4C8"
            style={styles.editorTitleInput}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={180}
            placeholder={t("+ 설명")}
            placeholderTextColor="#9EA4C8"
            style={styles.editorDescInput}
          />

          <Row style={styles.editorActionRow}>
            <Pressable
              onPress={() => setImportOpen((prev) => !prev)}
              style={({ pressed }) => [styles.editorActionBtn, importOpen && styles.editorActionBtnActive, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={t("붙여넣기 가져오기")}
            >
              <Ionicons name="list-outline" size={18} color={COLORS.text} />
              <Text style={styles.editorActionText}>{t("붙여넣기")}</Text>
            </Pressable>
            <Pressable
              onPress={pickFile}
              style={({ pressed }) => [styles.editorActionBtn, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={t("문서 스캔")}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={COLORS.text} size="small" /> : <Ionicons name="document-attach-outline" size={18} color={COLORS.text} />}
              <Text style={styles.editorActionText}>{t("문서 스캔")}</Text>
            </Pressable>
          </Row>

          {importOpen ? (
            <Card style={styles.importCard}>
              <Text style={styles.blockTitle}>{t("Quizlet처럼 가져오기")}</Text>
              <Text style={styles.desc}>{t("한 줄에 단어/읽는 법/뜻을 탭, 쉼표, 하이픈으로 구분해 붙여넣으세요.")}</Text>
              <TextInput
                value={importText}
                onChangeText={setImportText}
                multiline
                textAlignVertical="top"
                maxLength={12000}
                placeholder={"残る\tのこる\t남다\nincrease, increase, 증가하다"}
                placeholderTextColor="#6F769B"
                style={styles.importInput}
              />
              <Text style={styles.previewMeta}>{t("미리보기")} · {parsedImportRows.length}{t("개")}</Text>
              <Row style={{ marginTop: 10 }}>
                <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => importRows(parsedImportRows, "append")}>
                  <Text style={styles.secondaryBtnText}>{t("목록에 추가")}</Text>
                </Pressable>
                <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => importRows(parsedImportRows, "replace")}>
                  <Text style={styles.secondaryBtnText}>{t("목록 교체")}</Text>
                </Pressable>
              </Row>
            </Card>
          ) : null}

          <Row style={styles.editorCountRow}>
            <Text style={styles.editorCount}>{rows.length}{t("개")}</Text>
            <Pressable onPress={addRow} style={({ pressed }) => [styles.addSmallBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("단어 추가")}>
              <Ionicons name="add" size={20} color={COLORS.text} />
              <Text style={styles.addSmallText}>{t("단어 추가")}</Text>
            </Pressable>
          </Row>

          {rows.map((row, index) => (
            <View key={`${row.id || "new"}_${index}`} style={styles.editWordCard}>
              <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.editWordIndex}>{index + 1}</Text>
                <Pressable onPress={() => removeRow(index)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("삭제")}>
                  <Ionicons name="trash-outline" size={18} color="#FFB4B4" />
                </Pressable>
              </Row>
              <TextInput
                value={row.word}
                onChangeText={(value) => updateRow(index, { word: value })}
                maxLength={80}
                placeholder={t("단어")}
                placeholderTextColor="#AEB4DC"
                style={styles.editLineInput}
              />
              <Text style={styles.editInputLabel}>{t("단어")}</Text>
              <TextInput
                value={row.reading}
                onChangeText={(value) => updateRow(index, { reading: value })}
                maxLength={80}
                placeholder={t("읽는 법")}
                placeholderTextColor="#AEB4DC"
                style={styles.editLineInput}
              />
              <Text style={styles.editInputLabel}>{t("읽는 법")}</Text>
              <TextInput
                value={row.meaningKo}
                onChangeText={(value) => updateRow(index, { meaningKo: value })}
                maxLength={160}
                placeholder={t("뜻")}
                placeholderTextColor="#AEB4DC"
                style={styles.editLineInput}
              />
              <Text style={styles.editInputLabel}>{t("뜻")}</Text>
            </View>
          ))}

          <Pressable onPress={addRow} style={({ pressed }) => [styles.floatingAddBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("단어 추가")}>
            <Ionicons name="add" size={28} color={COLORS.text} />
          </Pressable>

          {canDelete && onDelete ? (
            <Pressable
              style={({ pressed }) => [styles.deleteFullBtn, pressed && { opacity: 0.9 }]}
              onPress={() => onDelete()}
              accessibilityRole="button"
              accessibilityLabel={t("세트 지우기")}
            >
              <Ionicons name="trash-outline" size={18} color="#FFB4B4" />
              <Text style={styles.deleteFullText}>{t("세트 지우기")}</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  stickyHeader: { backgroundColor: COLORS.bg, paddingBottom: 10, zIndex: 10 },
  backBtn: { height: 48, minWidth: 82, paddingHorizontal: 12, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center" },
  backText: { color: COLORS.text, fontWeight: "800" },
  topTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, textAlign: "center", flex: 1 },
  headerIconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  setTitle: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  desc: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 8 },
  summaryGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  summaryCard: { flex: 1, backgroundColor: COLORS.card2, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 12 },
  manageCard: { marginTop: 12, borderColor: "rgba(103,217,255,0.22)" },
  manageBtn: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 },
  manageBtnPrimary: { backgroundColor: COLORS.card2, borderColor: COLORS.lineSoft },
  manageBtnDanger: { backgroundColor: "rgba(255,107,107,0.10)", borderColor: "rgba(255,107,107,0.28)" },
  manageBtnText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  manageBtnDangerText: { color: "#FFB4B4" },
  highlightUploadCard: { marginTop: 12, borderColor: "rgba(124,106,255,0.42)" },
  summaryLabel: { color: COLORS.muted, fontSize: TYPO.micro, fontWeight: "800" },
  summaryValue: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "800", marginTop: 5 },
  summaryHelp: { color: COLORS.muted, fontSize: TYPO.micro, lineHeight: TYPO.microLine, marginTop: 5 },
  blockTitle: { color: COLORS.text, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: "800", marginBottom: 8 },
  difficultyPanel: { marginTop: 16, borderRadius: RADII.card, borderWidth: 1, borderColor: "rgba(124,106,255,0.22)", backgroundColor: "rgba(80,98,255,0.08)", padding: 12 },
  difficultyCompactText: { color: "#C7B8FF", fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "900" },
  moreSmallBtn: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  moreSmallText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  difficultyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  difficultyChip: { flexBasis: "48%", minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card2, padding: 10, justifyContent: "center" },
  difficultyChipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  difficultyChipTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small, lineHeight: TYPO.smallLine },
  difficultyChipTitleOn: { color: COLORS.text },
  difficultyChipMeta: { color: "#C7B8FF", fontWeight: "900", fontSize: TYPO.micro, marginTop: 6 },
  difficultyHelp: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 10 },
  distRow: { marginBottom: 10 },
  distLabel: { color: COLORS.text, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "800", flex: 1 },
  distCount: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "800" },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  wordRow: { backgroundColor: COLORS.card, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  word: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  muted: { color: COLORS.muted, fontWeight: "700", marginTop: 4, fontSize: TYPO.small },
  meta: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  wordMetaWrap: { alignItems: "flex-end", gap: 4 },
  editorSafe: { flex: 1, backgroundColor: COLORS.bg },
  editorScreen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  editorScroll: { paddingTop: 18, paddingBottom: 120 },
  editorTop: { justifyContent: "space-between", alignItems: "center", marginBottom: 28, backgroundColor: COLORS.bg, paddingBottom: 10, zIndex: 10 },
  editorTitle: { color: COLORS.text, fontSize: TYPO.h2, lineHeight: TYPO.h2Line, fontWeight: "900", textAlign: "center" },
  editorCircleBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  editorSaveBtn: { backgroundColor: "#1E2250" },
  editorTitleInput: { color: COLORS.text, fontSize: 30, lineHeight: 38, fontWeight: "400", borderBottomWidth: 2, borderBottomColor: "rgba(239,242,255,0.92)", paddingVertical: 8 },
  editorDescInput: { color: COLORS.text, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft, paddingVertical: 12, marginTop: 8 },
  editorActionRow: { justifyContent: "space-between", marginTop: 18, marginBottom: 12 },
  editorActionBtn: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card2, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  editorActionBtnActive: { borderColor: COLORS.blue, backgroundColor: "rgba(80,98,255,0.18)" },
  editorActionText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  importCard: { marginTop: 4, marginBottom: 12, borderColor: "rgba(103,217,255,0.24)" },
  importInput: { minHeight: 150, borderRadius: 16, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.field, color: COLORS.text, padding: 12, marginTop: 12, fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  previewMeta: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small, marginTop: 10 },
  editorCountRow: { justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 10 },
  editorCount: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.body },
  addSmallBtn: { minHeight: 44, borderRadius: 999, backgroundColor: COLORS.blue, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6 },
  addSmallText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  editWordCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lineSoft, padding: 14, marginBottom: 12 },
  editWordIndex: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small },
  editLineInput: { color: COLORS.text, fontSize: 24, lineHeight: 32, fontWeight: "400", borderBottomWidth: 2, borderBottomColor: "rgba(239,242,255,0.92)", paddingVertical: 8 },
  editInputLabel: { color: COLORS.muted, fontSize: TYPO.small, fontWeight: "800", marginTop: 4, marginBottom: 10 },
  floatingAddBtn: { alignSelf: "center", width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.blue, justifyContent: "center", alignItems: "center", marginVertical: 14 },
  deleteFullBtn: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,107,107,0.28)", backgroundColor: "rgba(255,107,107,0.10)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteFullText: { color: "#FFB4B4", fontWeight: "900", fontSize: TYPO.body },
});
