import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudentProfile, VocabularyAssignment } from "../types";

export function TeacherHomeScreen({
  classes,
  students,
  assignments,
  onGoCreateAssignment,
  onGoClasses,
  onGoStatus,
}: {
  classes: AcademyClass[];
  students: StudentProfile[];
  assignments: VocabularyAssignment[];
  onGoCreateAssignment: () => void;
  onGoClasses: () => void;
  onGoStatus: () => void;
}) {
  const { t } = useI18n();
  const totalStudents = students.length;
  const pending = useMemo(() => {
    // Just count assignments as "pending" if any student not completed.
    let count = 0;
    for (const a of assignments) {
      const statuses = Object.values(a.statusByStudent);
      if (statuses.some((s) => s !== "완료")) count += 1;
    }
    return count;
  }, [assignments]);

  const avgCompletion = useMemo(() => {
    if (!assignments.length) return 0;
    const rates = assignments.map((a) => {
      const statuses = Object.values(a.statusByStudent);
      if (!statuses.length) return 0;
      const done = statuses.filter((s) => s === "완료").length;
      return (done / statuses.length) * 100;
    });
    return Math.round(rates.reduce((s, n) => s + n, 0) / rates.length);
  }, [assignments]);

  const weakTypes = ["독해 / 근거 찾기", "청독해 / 자료형", "종합과목 / 경제"];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logo}>EJUEDU</Text>
          <Text style={styles.subtitle}>{classes.length}{t("개")} {t("반")} · {totalStudents}{t("명")}</Text>
        </View>
        <Badge label="선생님" tone="violet" />
      </Row>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.hero}>{t("이번 주 단어 과제")}</Text>
        <Text style={styles.muted}>{t("완료율")} {avgCompletion}% · {t("진행 중 과제")} {pending}{t("개")}</Text>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={avgCompletion} />
        </View>
        <Row style={{ marginTop: 12 }}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={onGoCreateAssignment}>
            <Text style={styles.primaryBtnText}>{t("단어 과제 만들기")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onGoClasses}>
            <Text style={styles.secondaryBtnText}>{t("클래스 보기")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onGoStatus}>
            <Text style={styles.secondaryBtnText}>{t("과제 현황 보기")}</Text>
          </Pressable>
        </Row>
      </Card>

      <SectionHeader title="오답 많은 유형" right={<Text style={styles.rightHint}>{t("이번 주")}</Text>} />
      <View style={{ gap: 10 }}>
        {weakTypes.map((typeLabel) => (
          <Card key={typeLabel}>
            <Text style={styles.itemTitle}>{t(typeLabel)}</Text>
            <Text style={styles.muted}>{t("완료율이 낮아지는 유형입니다. 과제에 포함해보세요.")}</Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="많이 틀린 단어" />
      <Card>
        <Text style={styles.muted}>需要, 供給, 根拠, 社会保障 ({t("데모")})</Text>
      </Card>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  logo: { color: COLORS.text, fontSize: TYPO.logo, fontWeight: "800" },
  subtitle: { color: COLORS.muted, fontSize: TYPO.small, marginTop: 4, fontWeight: "700" },
  hero: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
