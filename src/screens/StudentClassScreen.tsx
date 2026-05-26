import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudentSettings, VocabularyAssignment } from "../types";
import { formatClassSchedule, getAssignmentAvailability } from "../utils/assignmentAvailability";

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

export function StudentClassScreen({
  settings,
  classes,
  assignments,
  onBack,
  onOpenHomework,
}: {
  settings: StudentSettings;
  classes: AcademyClass[];
  assignments: VocabularyAssignment[];
  onBack: () => void;
  onOpenHomework: (assignmentId: string) => void;
}) {
  const { t } = useI18n();
  const connected = useMemo(() => classes.find((c) => c.id === settings.connectedClassId) || null, [classes, settings.connectedClassId]);
  const classAssignments = useMemo(() => assignments.filter((a) => a.classId === settings.connectedClassId), [assignments, settings.connectedClassId]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack title={t("클래스")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>{t("연결된 학원")}</Text>
        <Text style={styles.muted}>EJUEDU</Text>
        {connected ? (
          <>
            <Text style={[styles.itemTitle, { marginTop: 10 }]}>{t(connected.name)}</Text>
            <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
              <Badge label={`${t("초대코드")} ${connected.inviteCode}`} tone="default" />
              <Badge label={t(connected.targetScore)} tone="violet" />
              <Badge label={t(connected.level)} tone="default" />
            </Row>
            <Text style={styles.muted}>{t("포커스")}: {connected.focus.map((x) => t(x)).join(", ")}</Text>
            <Text style={styles.muted}>{t("수업 시간")}: {formatClassSchedule(connected)}</Text>
          </>
        ) : (
          <>
            <Text style={styles.muted}>{t("아직 연결된 클래스가 없습니다.")}</Text>
            <Pressable
              onPress={() => Alert.alert(t("클래스 연결"), t("초대코드 입력은 백엔드 연결 후 지원 예정입니다. (프로토타입)"))}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.secondaryBtnText}>{t("초대코드로 연결")}</Text>
            </Pressable>
          </>
        )}
      </Card>

      <SectionHeader title="선생님 과제" right={<Text style={styles.rightHint}>{classAssignments.length}{t("개")}</Text>} />
      {classAssignments.length ? (
        <View style={{ gap: 10 }}>
          {classAssignments.map((a) => {
            const total = a.wordIds.length || 1;
            // In this prototype we don't have "me id"; show averaged progress indicator.
            const anyProgress = Object.values(a.progressByStudent)[0] ?? 0;
            const pct = Math.round((anyProgress / total) * 100);
            const anyStatus = Object.values(a.statusByStudent)[0] ?? "미시작";
            const availability = getAssignmentAvailability(a);
            return (
              <Pressable key={a.id} onPress={() => onOpenHomework(a.id)} style={({ pressed }) => [styles.hwCard, pressed && { opacity: 0.9 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{t(a.title)}</Text>
                  <Row style={{ marginTop: 8, flexWrap: "wrap" }}>
                    <Badge label={t(a.assignmentKind || "단어 과제")} tone={a.assignmentKind === "수업 전 단어 테스트" ? "violet" : "default"} />
                    <Badge label={t(availability.statusLabel)} tone={availability.isOpen ? "blue" : "default"} />
                  </Row>
                  <Text style={styles.muted}>{t("단어")} {total}{t("개")} · {t("마감")} {a.dueDate}</Text>
                  <Text style={styles.muted}>{t("필수 정답률")} {a.requiredAccuracy}%</Text>
                  <Text style={styles.muted}>{t("공개")}: {availability.availableLabel}</Text>
                  <View style={{ marginTop: 10 }}>
                    <ProgressBar value={pct} />
                    <Text style={styles.mutedSmall}>{t("진행률")} {anyProgress}/{total} · {t("상태")} {t(anyStatus)}</Text>
                  </View>
                  <Text style={styles.mutedSmall}>{t("메모")}: {t(a.teacherMemo)}</Text>
                </View>
                <Badge label={t(availability.isOpen ? "시작" : "대기")} tone={availability.isOpen ? "blue" : "default"} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("현재 배포된 과제가 없습니다.")}</Text>
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
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  mutedSmall: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 10 },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  secondaryBtn: { marginTop: 12, backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  hwCard: { backgroundColor: COLORS.card, borderRadius: RADII.cardLg, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
});
