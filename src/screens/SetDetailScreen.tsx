import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { difficultyLabel } from "../data/vocabData";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { StudySet, VocabDifficulty, VocabItem } from "../types";

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

function topCounts(values: string[], limit = 4) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
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
}) {
  const { t, tm } = useI18n();
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
  const recentOccurrence = useMemo(() => {
    const latest = words
      .flatMap((w) => w.appearedIn)
      .sort((a, b) => b.year - a.year || (a.session === b.session ? 0 : a.session === "제2회" ? 1 : -1))[0];
    return latest ? `${latest.year}${t("년")} ${latest.session}` : "-";
  }, [words, t]);

  const activeWordIds = set.wordIds.slice(0, 80);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack title={t("세트")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.setTitle}>{t(set.title)}</Text>
        <Text style={styles.desc}>{t(set.description)}</Text>

        <Row style={{ marginTop: 12, flexWrap: "wrap" }}>
          <Badge label={`${t("단어")} ${set.wordCount}${t("개")}`} tone="default" />
          <Badge label={difficulty.label} tone="gold" />
          <Badge label={`${t("대표 유형")} ${t(commonType)}`} tone="blue" />
          {set.createdFrom === "diagnostic" ? <Badge label={t("진단 기반")} tone="violet" /> : null}
        </Row>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("학습 레벨")}</Text>
            <Text style={styles.summaryValue}>{t(difficulty.label)}</Text>
            <Text style={styles.summaryHelp}>{t(difficulty.description)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("최근 출현")}</Text>
            <Text style={styles.summaryValue}>{recentOccurrence}</Text>
            <Text style={styles.summaryHelp}>{t("연도/회차 메타데이터 기준")}</Text>
          </View>
        </View>

        <Row style={{ marginTop: 14 }}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => onStartFlashcard(activeWordIds, `${set.title} · ${t("낱말카드")}`)}>
            <Text style={styles.primaryBtnText}>{t("낱말카드")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onStartLearn(activeWordIds, `${set.title} · ${t("학습하기")}`)}>
            <Text style={styles.secondaryBtnText}>{t("학습하기")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onStartTest(activeWordIds, `${set.title} · ${t("테스트")}`)}>
            <Text style={styles.secondaryBtnText}>{t("테스트")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => onStartReview(activeWordIds, `${set.title} · ${t("오답 복습")}`)}
          >
            <Text style={styles.secondaryBtnText}>{t("오답 복습")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onOpenWordListForSet(set.id)}>
            <Text style={styles.secondaryBtnText}>{t("단어 전체 보기")}</Text>
          </Pressable>
        </Row>
      </Card>

      {set.createdFrom === "highlight" ? (
        <Card style={styles.highlightUploadCard}>
          <Text style={styles.blockTitle}>{t("사진·파일에서 단어 추가")}</Text>
          <Text style={styles.desc}>
            {t("교재 사진이나 PDF/이미지 파일을 올리면 추출 후보를 보여주고, 선택한 단어만 이 세트에 저장합니다.")}
          </Text>
          <Pressable
            onPress={() => onOpenHighlight?.()}
            style={({ pressed }) => [styles.primaryBtn, { marginTop: 14 }, pressed && { opacity: 0.9 }]}
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
              <Text style={styles.distLabel}>{t(type)}</Text>
              <Text style={styles.distCount}>{count}{t("개")}</Text>
            </Row>
            <ProgressBar value={words.length ? (count / words.length) * 100 : 0} />
          </View>
        ))}

        <Text style={[styles.blockTitle, { marginTop: 16 }]}>{t("주요 파트")}</Text>
        {topSubjects.map(([subject, count]) => (
          <View key={subject} style={styles.distRow}>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.distLabel}>{t(subject)}</Text>
              <Text style={styles.distCount}>{count}{t("개")}</Text>
            </Row>
            <ProgressBar value={words.length ? (count / words.length) * 100 : 0} />
          </View>
        ))}
      </Card>

      <SectionHeader title="단어 미리보기" right={<Text style={styles.rightHint}>{t("상세")}</Text>} />
      {words.slice(0, 10).map((w) => (
        <Pressable
          key={w.id}
          onPress={() => onOpenWord(w.id)}
          style={({ pressed }) => [styles.wordRow, pressed && { opacity: 0.9 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.word}>{w.word}</Text>
            <Text style={styles.muted}>{w.reading} · {tm(w.meaningKo)}</Text>
          </View>
          <Text style={styles.meta}>{t("기출")} {w.occurrenceCount}{t("회")}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  backBtn: { height: 48, minWidth: 82, paddingHorizontal: 12, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center" },
  backText: { color: COLORS.text, fontWeight: "800" },
  topTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, textAlign: "center", flex: 1 },
  setTitle: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  desc: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 8 },
  summaryGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  summaryCard: { flex: 1, backgroundColor: COLORS.card2, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 12 },
  highlightUploadCard: { marginTop: 12, borderColor: "rgba(124,106,255,0.42)" },
  summaryLabel: { color: COLORS.muted, fontSize: TYPO.micro, fontWeight: "800" },
  summaryValue: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "800", marginTop: 5 },
  summaryHelp: { color: COLORS.muted, fontSize: TYPO.micro, lineHeight: TYPO.microLine, marginTop: 5 },
  blockTitle: { color: COLORS.text, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: "800", marginBottom: 8 },
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
});
