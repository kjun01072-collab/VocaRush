import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, PillButton, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudentProfile, VocabularyAssignment } from "../types";

export function TeacherStatusScreen({
  classes,
  students,
  assignments,
  onOpenAssignment,
}: {
  classes: AcademyClass[];
  students: StudentProfile[];
  assignments: VocabularyAssignment[];
  onOpenAssignment: (assignmentId: string) => void;
}) {
  const { t } = useI18n();
  const [classFilter, setClassFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (classFilter === "all") return assignments;
    return assignments.filter((a) => a.classId === classFilter);
  }, [assignments, classFilter]);

  const completionRate = (a: VocabularyAssignment) => {
    const statuses = Object.values(a.statusByStudent);
    if (!statuses.length) return 0;
    const done = statuses.filter((s) => s === "완료").length;
    return Math.round((done / statuses.length) * 100);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.pageTitle}>{t("과제 현황")}</Text>
        <Badge label="EJUEDU" tone="violet" />
      </Row>
      <Text style={styles.muted}>{t("반/과제별 완료율과 진행 상황을 확인합니다. (로컬 더미)")}</Text>

      <SectionHeader title="필터" />
      <Card>
        <Row style={{ flexWrap: "wrap" }}>
          <PillButton label="전체" selected={classFilter === "all"} onPress={() => setClassFilter("all")} />
          {classes.map((c) => (
            <PillButton
              key={c.id}
              label={c.name}
              selected={classFilter === c.id}
              onPress={() => setClassFilter(c.id)}
            />
          ))}
        </Row>
      </Card>

      <SectionHeader title="과제 목록" right={<Text style={styles.rightHint}>{filtered.length}{t("개")}</Text>} />
      {filtered.length ? (
        <View style={{ gap: 10 }}>
          {filtered
            .slice()
            .sort((a, b) => completionRate(a) - completionRate(b))
            .map((a) => {
              const cls = classes.find((c) => c.id === a.classId);
              const pct = completionRate(a);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => onOpenAssignment(a.id)}
                  style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.9 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{t(a.title)}</Text>
                    <Text style={styles.muted}>
                      {cls ? t(cls.name) : "-"} · {t("단어")} {a.wordIds.length}{t("개")} · {t("마감")} {a.dueDate}
                    </Text>
                    <Text style={styles.muted}>{t("완료율")} {pct}% · {t("필수 정답률")} {a.requiredAccuracy}%</Text>
                    <View style={{ marginTop: 10 }}>
                      <ProgressBar value={pct} />
                    </View>
                    <Row style={{ marginTop: 10 }}>
                      <Pressable
                        style={[styles.secondaryBtn, { flex: 1 }]}
                        onPress={() => Alert.alert(t("리마인드"), t("리마인드 전송 데모: 실제 푸시는 백엔드 연결 후 지원됩니다."))}
                      >
                        <Text style={styles.secondaryBtnText}>{t("전체 리마인드")}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.secondaryBtn, { flex: 1 }]}
                        onPress={() => Alert.alert(t("복사"), t("과제 복사 데모: 다음 배포 화면에서 템플릿으로 제공됩니다."))}
                      >
                        <Text style={styles.secondaryBtnText}>{t("과제 복사")}</Text>
                      </Pressable>
                    </Row>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("표시할 과제가 없습니다.")}</Text>
        </Card>
      )}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  pageTitle: { color: COLORS.text, fontSize: TYPO.h1, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 8 },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  rowCard: { backgroundColor: COLORS.card, borderRadius: RADII.cardLg, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  itemTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  chevron: { color: COLORS.muted, fontSize: TYPO.h2, fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line, marginTop: 10 },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
