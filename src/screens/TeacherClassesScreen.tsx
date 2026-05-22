import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudentProfile, VocabularyAssignment } from "../types";

export function TeacherClassesScreen({
  classes,
  students,
  assignments,
  onOpenClass,
}: {
  classes: AcademyClass[];
  students: StudentProfile[];
  assignments: VocabularyAssignment[];
  onOpenClass: (classId: string) => void;
}) {
  const { t } = useI18n();
  const studentByClass = useMemo(() => {
    const m = new Map<string, StudentProfile[]>();
    for (const s of students) {
      const list = m.get(s.classId) || [];
      list.push(s);
      m.set(s.classId, list);
    }
    return m;
  }, [students]);

  const assignmentByClass = useMemo(() => {
    const m = new Map<string, VocabularyAssignment[]>();
    for (const a of assignments) {
      const list = m.get(a.classId) || [];
      list.push(a);
      m.set(a.classId, list);
    }
    return m;
  }, [assignments]);

  const completionRate = (a: VocabularyAssignment) => {
    const statuses = Object.values(a.statusByStudent);
    if (!statuses.length) return 0;
    const done = statuses.filter((s) => s === "완료").length;
    return Math.round((done / statuses.length) * 100);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.pageTitle}>{t("클래스")}</Text>
        <Badge label="EJUEDU" tone="violet" />
      </Row>
      <Text style={styles.muted}>{t("단어 과제 배포/현황 확인을 위한 선생님 모드입니다.")}</Text>

      <SectionHeader title="반 목록" />
      <View style={{ gap: 10 }}>
        {classes.map((c) => {
          const ss = studentByClass.get(c.id) || [];
          const as = assignmentByClass.get(c.id) || [];
          const active = as.length;
          const avgCompletion = as.length
            ? Math.round(as.map(completionRate).reduce((s, n) => s + n, 0) / as.length)
            : 0;
          const weak = ss[0]?.weakTypes?.[0] || "근거 찾기";

          return (
            <Pressable
              key={c.id}
              onPress={() => onOpenClass(c.id)}
              style={({ pressed }) => [styles.classCard, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.className}>{t(c.name)}</Text>
                <Text style={styles.muted}>
                  {t(c.targetScore)} · {t(c.level)} · {t("초대코드")} {c.inviteCode}
                </Text>
                <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
                  <Badge label={`${t("학생")} ${ss.length}${t("명")}`} tone="default" />
                  <Badge label={`${t("진행 중 과제")} ${active}${t("개")}`} tone="default" />
                  <Badge label={`${t("평균 완료율")} ${avgCompletion}%`} tone="blue" />
                  <Badge label={`${t("약한 유형")} ${t(weak)}`} tone="violet" />
                </Row>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar value={avgCompletion} />
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
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
  pageTitle: { color: COLORS.text, fontSize: TYPO.h1, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 8 },
  classCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  className: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2 },
  chevron: { color: COLORS.muted, fontSize: TYPO.h2, fontWeight: "800" },
});
