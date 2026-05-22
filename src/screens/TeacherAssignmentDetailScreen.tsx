import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudentProfile, VocabularyAssignment } from "../types";

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

export function TeacherAssignmentDetailScreen({
  assignment,
  cls,
  students,
  onBack,
  onOpenStudent,
  onExtendDueDate,
  onUpdateMemo,
}: {
  assignment: VocabularyAssignment;
  cls: AcademyClass;
  students: StudentProfile[];
  onBack: () => void;
  onOpenStudent: (studentId: string) => void;
  onExtendDueDate: (assignmentId: string) => void;
  onUpdateMemo: (assignmentId: string) => void;
}) {
  const { t } = useI18n();
  const classStudents = useMemo(() => students.filter((s) => s.classId === cls.id), [students, cls.id]);

  const completionRate = useMemo(() => {
    const statuses = Object.values(assignment.statusByStudent);
    if (!statuses.length) return 0;
    const done = statuses.filter((s) => s === "완료").length;
    return Math.round((done / statuses.length) * 100);
  }, [assignment.statusByStudent]);

  const sortedStudents = useMemo(() => {
    return classStudents
      .slice()
      .sort((a, b) => {
        const pa = assignment.progressByStudent[a.id] || 0;
        const pb = assignment.progressByStudent[b.id] || 0;
        return pb - pa;
      });
  }, [classStudents, assignment.progressByStudent]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack title={t("과제 상세")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>{t(assignment.title)}</Text>
        <Text style={styles.muted}>
          {t(cls.name)} · {t("단어")} {assignment.wordIds.length}{t("개")} · {t("마감")} {assignment.dueDate}
        </Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Badge label={`${t("필수 정답률")} ${assignment.requiredAccuracy}%`} tone="violet" />
          <Badge label={`${t("완료율")} ${completionRate}%`} tone="blue" />
        </Row>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={completionRate} />
        </View>
        <Text style={styles.mutedSmall}>{t("메모")}: {t(assignment.teacherMemo)}</Text>

        <Row style={{ marginTop: 12 }}>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => Alert.alert(t("리마인드"), t("리마인드 전송 데모: 실제 푸시는 백엔드 연결 후 지원됩니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("전체 리마인드")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onExtendDueDate(assignment.id)}>
            <Text style={styles.secondaryBtnText}>{t("마감 연장")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onUpdateMemo(assignment.id)}>
            <Text style={styles.secondaryBtnText}>{t("메모 수정")}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => Alert.alert(t("복사"), t("과제 복사 데모: 단어 배포 화면에서 템플릿으로 사용할 수 있게 확장 예정입니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("과제 복사")}</Text>
          </Pressable>
        </Row>
      </Card>

      <SectionHeader title="학생별 진행" right={<Text style={styles.rightHint}>{t("탭해서 학생 상세")}</Text>} />
      <View style={{ gap: 10 }}>
        {sortedStudents.map((s) => {
          const status = assignment.statusByStudent[s.id] || "미시작";
          const progress = assignment.progressByStudent[s.id] || 0;
          const acc = assignment.accuracyByStudent[s.id] || 0;
          const pct = Math.round((progress / Math.max(1, assignment.wordIds.length)) * 100);
          return (
            <Pressable
              key={s.id}
              onPress={() => onOpenStudent(s.id)}
              style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.name}</Text>
                <Text style={styles.muted}>
                  {t("상태")} {t(status)} · {t("진행")} {progress}/{assignment.wordIds.length} · {t("정답률")} {acc}%
                </Text>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar value={pct} />
                </View>
              </View>
              <Badge label={t(status)} tone={status === "완료" ? "success" : status === "진행 중" ? "blue" : "default"} />
            </Pressable>
          );
        })}
      </View>

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
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line, marginTop: 10 },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  rowCard: { backgroundColor: COLORS.card, borderRadius: RADII.cardLg, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
});
