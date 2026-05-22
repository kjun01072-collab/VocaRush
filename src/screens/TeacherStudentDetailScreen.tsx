import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { StudentProfile, VocabularyAssignment } from "../types";

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

export function TeacherStudentDetailScreen({
  student,
  assignments,
  onBack,
}: {
  student: StudentProfile;
  assignments: VocabularyAssignment[];
  onBack: () => void;
}) {
  const { t } = useI18n();
  const classAssignments = useMemo(() => assignments.filter((a) => a.classId === student.classId), [assignments, student.classId]);

  const completion = useMemo(() => {
    if (!classAssignments.length) return 0;
    const rates: number[] = classAssignments.map((a) => {
      const status = a.statusByStudent[student.id] || "미시작";
      return status === "완료" ? 100 : status === "진행 중" ? 60 : 0;
    });
    return Math.round(rates.reduce((s, n) => s + n, 0) / Math.max(1, rates.length));
  }, [classAssignments, student.id]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack title={t("학생")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>{student.name}</Text>
        <Text style={styles.muted}>
          {t(student.targetScore)} · {t(student.currentLevel)} · {t("공부방법")} {t(student.studyStyle)}
        </Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Badge label={`${t("최근 정답률")} ${student.recentAccuracy}%`} tone="blue" />
          <Badge label={`${t("과제 완료")} ${student.homeworkCompletion}%`} tone="default" />
        </Row>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={completion} />
        </View>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          {student.weakTypes.slice(0, 3).map((typeName) => (
            <Badge key={typeName} label={t(typeName)} tone="violet" />
          ))}
        </Row>
      </Card>

      <SectionHeader title="배정 과제" />
      {classAssignments.length ? (
        <View style={{ gap: 10 }}>
          {classAssignments.map((a) => {
            const status = a.statusByStudent[student.id] || "미시작";
            const progress = a.progressByStudent[student.id] || 0;
            const acc = a.accuracyByStudent[student.id] || 0;
            const pct = Math.round((progress / Math.max(1, a.wordIds.length)) * 100);
            return (
              <Card key={a.id}>
                <Text style={styles.itemTitle}>{t(a.title)}</Text>
                <Text style={styles.muted}>{t("마감")} {a.dueDate} · {t("상태")} {t(status)}</Text>
                <Text style={styles.muted}>{t("진행")} {progress}/{a.wordIds.length} · {t("정답률")} {acc}%</Text>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar value={pct} />
                </View>
                <Row style={{ marginTop: 10 }}>
                  <Pressable
                    style={[styles.secondaryBtn, { flex: 1 }]}
                    onPress={() => Alert.alert(t("리마인드"), t("리마인드 전송 데모: 실제 푸시는 백엔드 연결 후 지원됩니다."))}
                  >
                    <Text style={styles.secondaryBtnText}>{t("개별 리마인드")}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryBtn, { flex: 1 }]}
                    onPress={() => Alert.alert(t("오답 단어"), t("학생 오답 단어 상세는 백엔드 연결 후 확장 예정입니다. (프로토타입)"))}
                  >
                    <Text style={styles.secondaryBtnText}>{t("오답 보기")}</Text>
                  </Pressable>
                </Row>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("현재 배정된 과제가 없습니다.")}</Text>
        </Card>
      )}

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
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
