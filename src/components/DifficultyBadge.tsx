import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { COLORS, FONT_WEIGHT, RADII, TYPO } from "../theme";
import { VocabDifficulty } from "../types";

const DIFFICULTY_UI: Record<
  VocabDifficulty,
  {
    label: string;
    shortLabel: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    fillColor: string;
  }
> = {
  1: {
    label: "기초",
    shortLabel: "기초",
    backgroundColor: "#20284F",
    borderColor: "rgba(137,151,255,0.28)",
    textColor: "#DCE3FF",
    fillColor: "#8EA0FF",
  },
  2: {
    label: "쉬움",
    shortLabel: "쉬움",
    backgroundColor: "#173341",
    borderColor: "rgba(105,215,255,0.34)",
    textColor: "#C7F3FF",
    fillColor: COLORS.cyan,
  },
  3: {
    label: "보통",
    shortLabel: "보통",
    backgroundColor: "#3A3219",
    borderColor: "rgba(246,200,95,0.42)",
    textColor: "#FFE49B",
    fillColor: COLORS.gold,
  },
  4: {
    label: "어려움",
    shortLabel: "어려움",
    backgroundColor: "#4A253A",
    borderColor: "rgba(255,121,168,0.58)",
    textColor: "#FFC1D8",
    fillColor: "#FF79A8",
  },
  5: {
    label: "심화",
    shortLabel: "심화",
    backgroundColor: "#4F2028",
    borderColor: "rgba(255,107,122,0.7)",
    textColor: "#FFB8C0",
    fillColor: COLORS.red,
  },
};

function clampDifficulty(value: number): VocabDifficulty {
  return Math.max(1, Math.min(5, Math.round(value))) as VocabDifficulty;
}

export function difficultyUiLabel(difficulty: VocabDifficulty) {
  return DIFFICULTY_UI[clampDifficulty(difficulty)].label;
}

export function DifficultyBadge({
  difficulty,
  compact = false,
}: {
  difficulty: VocabDifficulty;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const safeDifficulty = clampDifficulty(difficulty);
  const ui = DIFFICULTY_UI[safeDifficulty];
  const label = compact
    ? `${safeDifficulty}/5 ${t(ui.shortLabel)}`
    : `${t("난이도")} ${safeDifficulty}/5 · ${t(ui.label)}`;

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: ui.backgroundColor,
          borderColor: ui.borderColor,
        },
      ]}
      accessibilityLabel={`${t("난이도")} ${safeDifficulty}/5 ${t(ui.label)}`}
    >
      <Text style={[styles.text, compact && styles.textCompact, { color: ui.textColor }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.meter} accessibilityElementsHidden>
        {[1, 2, 3, 4, 5].map((step) => (
          <View
            key={step}
            style={[
              styles.meterCell,
              step <= safeDifficulty && { backgroundColor: ui.fillColor, opacity: 0.5 + step * 0.08 },
              step > safeDifficulty && styles.meterCellOff,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: RADII.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeCompact: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  text: {
    fontSize: TYPO.badge,
    lineHeight: TYPO.microLine,
    fontWeight: FONT_WEIGHT.bold,
  },
  textCompact: {
    fontSize: TYPO.micro,
  },
  meter: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  meterCell: {
    width: 5,
    height: 11,
    borderRadius: 99,
  },
  meterCellOff: {
    backgroundColor: "rgba(255,255,255,0.16)",
    opacity: 1,
  },
});
