import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Card, EmptyState, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, SPACING, TYPO } from "../theme";
import { StudySet, UserStudyFolder } from "../types";

export function UserFolderDetailScreen({
  folder,
  studySets,
  onBack,
  onOpenSet,
}: {
  folder: UserStudyFolder;
  studySets: StudySet[];
  onBack: () => void;
  onOpenSet: (id: string) => void;
}) {
  const { t } = useI18n();
  const sets = useMemo(
    () => folder.setIds.map((id) => studySets.find((set) => set.id === id)).filter(Boolean) as StudySet[],
    [folder.setIds, studySets]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <Row style={[styles.stickyHeader, styles.header]}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("뒤로")}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t(folder.title)}</Text>
          <Text style={styles.subtitle}>{t(folder.description || "학생이 직접 만든 폴더")}</Text>
        </View>
      </Row>

      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>{t("개인 학습 폴더")}</Text>
        <Text style={styles.summaryValue}>{sets.length}{t("개 세트")}</Text>
        <Text style={styles.subtitle}>{t("폴더 안의 세트를 골라 이어서 학습할 수 있습니다.")}</Text>
      </Card>

      <SectionHeader title="폴더 세트" />
      {sets.length ? (
        sets.map((set) => (
          <Pressable
            key={set.id}
            onPress={() => onOpenSet(set.id)}
            style={({ pressed }) => [styles.setRow, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={t(set.title)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.setTitle}>{t(set.title)}</Text>
              <Text style={styles.setMeta}>{t(set.description)}</Text>
              <Text style={styles.setMeta}>{t("단어")} {set.wordCount}{t("개")} · {t("진행")} {set.progress}%</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        ))
      ) : (
        <EmptyState title="빈 폴더" body="아직 세트가 없는 폴더입니다." />
      )}
      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  stickyHeader: { backgroundColor: COLORS.bg, paddingBottom: 10, zIndex: 10 },
  header: { alignItems: "center", gap: 12 },
  backBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  title: { color: COLORS.text, fontSize: TYPO.h2, lineHeight: TYPO.h2Line, fontWeight: "900" },
  subtitle: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  summary: { marginTop: SPACING.md, borderColor: "rgba(103,217,255,0.24)" },
  summaryLabel: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small },
  summaryValue: { color: COLORS.text, fontSize: TYPO.h2, lineHeight: TYPO.h2Line, fontWeight: "900", marginTop: 6 },
  setRow: { minHeight: 88, borderRadius: RADII.card, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lineSoft, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  setTitle: { color: COLORS.text, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: "900" },
  setMeta: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
});
