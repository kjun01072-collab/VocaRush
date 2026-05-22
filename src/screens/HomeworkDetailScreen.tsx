import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { StudyStyle, VocabItem, VocabularyAssignment } from "../types";

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

export function HomeworkDetailScreen({
  assignment,
  vocabById,
  studyStyle,
  onBack,
  onStartHomeworkLearn,
  onMarkHomeworkDone,
}: {
  assignment: VocabularyAssignment;
  vocabById: Map<string, VocabItem>;
  studyStyle: StudyStyle;
  onBack: () => void;
  onStartHomeworkLearn: (wordIds: string[], title: string) => void;
  onMarkHomeworkDone: (assignmentId: string) => void;
}) {
  const { t, tm } = useI18n();
  const words = useMemo(() => assignment.wordIds.map((id) => vocabById.get(id)).filter(Boolean) as VocabItem[], [assignment.wordIds, vocabById]);
  const total = Math.max(1, assignment.wordIds.length);
  const progress = Object.values(assignment.progressByStudent)[0] ?? 0;
  const pct = Math.round((progress / total) * 100);
  const status = Object.values(assignment.statusByStudent)[0] ?? "미시작";

  const styleAdvice = useMemo(() => {
    if (studyStyle === "오답집중형") return "오답 단어부터 먼저 복습하는 흐름으로 진행합니다.";
    if (studyStyle === "예문중심형") return "예문 빈칸을 더 자주 섞어서 진행합니다.";
    if (studyStyle === "문제풀이형") return "퀴즈 위주로 진행합니다.";
    if (studyStyle === "기출빈도형") return "기출 출현 빈도가 높은 단어부터 노출합니다.";
    if (studyStyle === "빠른 암기형") return "짧게 빠르게 반복합니다.";
    return "낱말카드/퀴즈를 균형 있게 섞습니다.";
  }, [studyStyle]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack title={t("과제")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>{t(assignment.title)}</Text>
        <Text style={styles.muted}>{t("마감")}: {assignment.dueDate}</Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Badge label={`${t("단어")} ${assignment.wordIds.length}${t("개")}`} tone="default" />
          <Badge label={`${t("필수 정답률")} ${assignment.requiredAccuracy}%`} tone="violet" />
          <Badge label={`${t("상태")} ${t(status)}`} tone={status === "완료" ? "success" : "default"} />
        </Row>
        <View style={{ marginTop: 12 }}>
          <ProgressBar value={pct} />
          <Text style={styles.mutedSmall}>{t("진행률")} {progress}/{total}</Text>
        </View>
        <Text style={styles.mutedSmall}>{t("선생님 메모")}: {t(assignment.teacherMemo)}</Text>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.itemTitle}>{t("현재 공부방법")}: {t(studyStyle)}</Text>
        <Text style={styles.muted}>{t(styleAdvice)}</Text>
      </Card>

      <Row style={{ marginTop: 12 }}>
        <Pressable
          style={[styles.primaryBtn, { flex: 1 }]}
          onPress={() => onStartHomeworkLearn(assignment.wordIds, `${assignment.title} · ${t("과제 학습")}`)}
        >
          <Text style={styles.primaryBtnText}>{t("학습 시작")}</Text>
        </Pressable>
      </Row>
      <Row style={{ marginTop: 10 }}>
        <Pressable
          style={[styles.secondaryBtn, { flex: 1 }]}
          onPress={() => {
            Alert.alert(t("완료 처리"), t("프로토타입에서는 버튼으로 완료 처리합니다."), [
              { text: t("취소"), style: "cancel" },
              { text: t("완료"), onPress: () => onMarkHomeworkDone(assignment.id) },
            ]);
          }}
        >
          <Text style={styles.secondaryBtnText}>{t("완료로 표시")}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { flex: 1 }]}
          onPress={() => Alert.alert(t("오답 복습"), t("과제 단어 중 틀린 단어를 오답 복습으로 자동 편성합니다. (로컬 더미)"))}
        >
          <Text style={styles.secondaryBtnText}>{t("오답 복습")}</Text>
        </Pressable>
      </Row>

      <SectionHeader title="단어 미리보기" />
      {words.slice(0, 10).map((w) => (
        <Card key={w.id} style={{ marginBottom: 10 }}>
          <Text style={styles.itemTitle}>{w.word}</Text>
          <Text style={styles.muted}>{w.reading} · {tm(w.meaningKo)}</Text>
        </Card>
      ))}

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
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  mutedSmall: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 10 },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
