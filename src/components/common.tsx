import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useI18n } from "../i18n";
import { COLORS, FONT_WEIGHT, PRESS_FEEDBACK, RADII, SPACING, TYPO } from "../theme";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "blue" | "violet" | "gold" | "danger" | "success";
}) {
  const { t } = useI18n();
  const toneStyle =
    tone === "blue"
      ? styles.badgeBlue
      : tone === "violet"
      ? styles.badgeViolet
      : tone === "gold"
      ? styles.badgeGold
      : tone === "danger"
      ? styles.badgeDanger
      : tone === "success"
      ? styles.badgeSuccess
      : styles.badgeDefault;
  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{t(label)}</Text>
    </View>
  );
}

export function IconButton({
  label,
  onPress,
  tone = "default",
}: {
  label: string;
  onPress: () => void;
  tone?: "default" | "blue";
}) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        tone === "blue" ? styles.iconBtnBlue : styles.iconBtnDefault,
        pressed && (tone === "blue" ? PRESS_FEEDBACK.strong : PRESS_FEEDBACK.soft),
      ]}
      accessibilityRole="button"
      accessibilityLabel={t(label)}
    >
      <Text style={styles.iconBtnText}>{t(label)}</Text>
    </Pressable>
  );
}

export function PillButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={t(label)}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillActive : styles.pillInactive,
        pressed && (selected ? PRESS_FEEDBACK.strong : PRESS_FEEDBACK.soft),
      ]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextActive]} numberOfLines={1}>
        {t(label)}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const w = `${Math.max(0, Math.min(100, value))}%` as `${number}%`;
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.max(0, Math.min(100, value))) }}
    >
      <View style={[styles.progressFill, { width: w }]} />
    </View>
  );
}

export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
      <Text style={styles.sectionTitle}>{t(title)}</Text>
      {right}
    </Row>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{t(title)}</Text>
      {body ? <Text style={styles.emptyBody}>{t(body)}</Text> : null}
      {action ? <View style={{ marginTop: SPACING.md }}>{action}</View> : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.collapseWrap}>
      <Pressable
        onPress={onToggle}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t(title)}
        style={({ pressed }) => [styles.collapseHeader, pressed && PRESS_FEEDBACK.soft]}
      >
        <Text style={styles.collapseTitle}>{t(title)}</Text>
        <Text style={styles.collapseChevron}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <View style={styles.collapseBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  row: { flexDirection: "row", gap: SPACING.md },
  badge: {
    borderRadius: RADII.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  badgeText: { color: COLORS.text, fontWeight: FONT_WEIGHT.bold, fontSize: TYPO.badge, lineHeight: TYPO.microLine },
  badgeDefault: { backgroundColor: "#29305F" },
  badgeBlue: { backgroundColor: COLORS.blue },
  badgeViolet: { backgroundColor: COLORS.violet },
  badgeGold: { backgroundColor: "#3B3219", borderColor: "rgba(246,200,95,0.24)" },
  badgeDanger: { backgroundColor: "#3A1D36", borderColor: "rgba(255,107,122,0.2)" },
  badgeSuccess: { backgroundColor: "#16382F", borderColor: "rgba(80,216,144,0.2)" },
  iconBtn: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  iconBtnDefault: { backgroundColor: COLORS.card },
  iconBtnBlue: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  iconBtnText: { color: COLORS.text, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, fontWeight: FONT_WEIGHT.bold },
  pill: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 210,
    justifyContent: "center",
  },
  pillInactive: { backgroundColor: COLORS.card2 },
  pillActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  pillText: { color: COLORS.muted, fontWeight: FONT_WEIGHT.bold, fontSize: TYPO.small, lineHeight: TYPO.smallLine },
  pillTextActive: { color: COLORS.text },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: RADII.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.blue,
    borderRadius: RADII.pill,
  },
  sectionTitle: { color: COLORS.text, fontSize: TYPO.h2, lineHeight: TYPO.h2Line, fontWeight: FONT_WEIGHT.heavy },
  divider: { height: 1, backgroundColor: COLORS.lineSoft, opacity: 0.9 },
  collapseWrap: { marginTop: SPACING.md },
  collapseHeader: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collapseTitle: { color: COLORS.text, fontWeight: FONT_WEIGHT.bold, fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  collapseChevron: { color: COLORS.muted, fontWeight: FONT_WEIGHT.bold, fontSize: TYPO.h3, lineHeight: TYPO.h3Line },
  collapseBody: {
    padding: 12,
    backgroundColor: COLORS.panel,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    marginTop: 8,
  },
  emptyState: {
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.panel,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  emptyTitle: { color: COLORS.text, fontWeight: FONT_WEIGHT.heavy, fontSize: TYPO.h3, lineHeight: TYPO.h3Line, textAlign: "center" },
  emptyBody: { color: COLORS.muted, fontWeight: FONT_WEIGHT.medium, fontSize: TYPO.small, lineHeight: TYPO.smallLine, textAlign: "center", marginTop: SPACING.xs },
});
