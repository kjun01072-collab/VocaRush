import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudentProfile, VocabularyAssignment } from "../types";

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

export function TeacherClassDetailScreen({
  cls,
  students,
  assignments,
  onBack,
  onOpenStudent,
  onOpenAssignment,
  onGoDistributePrefill,
}: {
  cls: AcademyClass;
  students: StudentProfile[];
  assignments: VocabularyAssignment[];
  onBack: () => void;
  onOpenStudent: (studentId: string) => void;
  onOpenAssignment: (assignmentId: string) => void;
  onGoDistributePrefill: (classId: string) => void;
}) {
  const { t } = useI18n();
  const classStudents = useMemo(() => students.filter((s) => s.classId === cls.id), [students, cls.id]);
  const classAssignments = useMemo(() => assignments.filter((a) => a.classId === cls.id), [assignments, cls.id]);

  const completionRate = (a: VocabularyAssignment) => {
    const statuses = Object.values(a.statusByStudent);
    if (!statuses.length) return 0;
    const done = statuses.filter((s) => s === "완료").length;
    return Math.round((done / statuses.length) * 100);
  };

  const avgCompletion = useMemo(() => {
    if (!classAssignments.length) return 0;
    return Math.round(classAssignments.map(completionRate).reduce((s, n) => s + n, 0) / classAssignments.length);
  }, [classAssignments]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack title={t(cls.name)} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>{t(cls.name)}</Text>
        <Text style={styles.muted}>
          {t(cls.targetScore)} · {t(cls.level)} · {t("초대코드")} {cls.inviteCode}
        </Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Badge label={`${t("학생")} ${classStudents.length}${t("명")}`} tone="default" />
          <Badge label={`${t("진행 중 과제")} ${classAssignments.length}${t("개")}`} tone="default" />
          <Badge label={`${t("평균 완료율")} ${avgCompletion}%`} tone="blue" />
        </Row>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={avgCompletion} />
        </View>
        <Row style={{ marginTop: 12 }}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => onGoDistributePrefill(cls.id)}>
            <Text style={styles.primaryBtnText}>{t("이 반에 과제 배포")}</Text>
          </Pressable>
        </Row>
      </Card>

      <SectionHeader title="학생" right={<Text style={styles.rightHint}>{t("탭해서 상세")}</Text>} />
      <View style={{ gap: 10 }}>
        {classStudents.map((s) => (
          <Pressable key={s.id} onPress={() => onOpenStudent(s.id)} style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.9 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{s.name}</Text>
              <Text style={styles.muted}>
                {t(s.targetScore)} · {t(s.currentLevel)} · {t("공부방법")} {t(s.studyStyle)}
              </Text>
              <Text style={styles.muted}>{t("최근 정답률")} {s.recentAccuracy}% · {t("과제 완료")} {s.homeworkCompletion}%</Text>
              <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
                {s.weakTypes.slice(0, 2).map((typeName) => (
                  <Badge key={`${s.id}_${typeName}`} label={t(typeName)} tone="violet" />
                ))}
              </Row>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="과제" right={<Text style={styles.rightHint}>{t("탭해서 현황")}</Text>} />
      {classAssignments.length ? (
        <View style={{ gap: 10 }}>
          {classAssignments.map((a) => {
            const pct = completionRate(a);
            return (
              <Pressable key={a.id} onPress={() => onOpenAssignment(a.id)} style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.9 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{t(a.title)}</Text>
                  <Text style={styles.muted}>{t("단어")} {a.wordIds.length}{t("개")} · {t("마감")} {a.dueDate}</Text>
                  <Text style={styles.muted}>{t("필수 정답률")} {a.requiredAccuracy}% · {t("완료율")} {pct}%</Text>
                  <View style={{ marginTop: 10 }}>
                    <ProgressBar value={pct} />
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("현재 배포된 과제가 없습니다.")}</Text>
          <Pressable
            onPress={() => Alert.alert(t("과제"), t("단어 배포 탭에서 과제를 만들어 배포할 수 있습니다."))}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9, marginTop: 12 }]}
          >
            <Text style={styles.secondaryBtnText}>{t("안내")}</Text>
          </Pressable>
        </Card>
      )}

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
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  rowCard: { backgroundColor: COLORS.card, borderRadius: RADII.cardLg, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  itemTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  chevron: { color: COLORS.muted, fontSize: TYPO.h2, fontWeight: "800" },
});
