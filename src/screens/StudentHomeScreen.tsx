import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Card, EmptyState, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, SPACING, TYPO } from "../theme";
import { LearningRecord, RewardItem, StudySet, VocabItem, WeakTypeStat } from "../types";

export function StudentHomeScreen({
  studentName,
  profileGoal,
  profileLevel,
  searchQuery,
  setSearchQuery,
  dailyWordGoal,
  studiedTodayCount,
  streakDays,
  totalXP,
  storeXP,
  rewardItems,
  redeemedRewardIds,
  learningTodayQuestionCount,
  learningAccuracy,
  recentWrongLearningRecords,
  learningRecordWordLabels,
  learningWeakTop3,
  learningSaveError,
  reviewTodayCount,
  wrongReviewWordCount,
  wrongReviewTotalWordCount,
  wrongReviewAttemptCount,
  recentWrongAttemptCount7d,
  highlightWordCount,
  weakTop3,
  recommendedSets,
  recentlyStudied,
  classHomeworkSummary,
  onGoVocab,
  onStartTodayLearn,
  onStartWrongReview,
  onStartDiagnostic,
  onOpenHighlight,
  onOpenWord,
  onOpenSet,
  onOpenClass,
  onOpenReport,
  onOpenLibrary,
  onExchangeReward,
  onWeakTypeReview,
  onWeakTypeCreateSet,
}: {
  studentName: string;
  profileGoal?: string;
  profileLevel?: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dailyWordGoal: number;
  studiedTodayCount: number;
  streakDays: number;
  totalXP: number;
  storeXP: number;
  rewardItems: RewardItem[];
  redeemedRewardIds: string[];
  learningTodayQuestionCount: number;
  learningAccuracy: number;
  recentWrongLearningRecords: LearningRecord[];
  learningRecordWordLabels: Record<string, string>;
  learningWeakTop3: Array<{ topic: string; errorType: string; subject: string; wrong: number; attempts: number }>;
  learningSaveError?: string | null;
  reviewTodayCount: number;
  wrongReviewWordCount: number;
  wrongReviewTotalWordCount: number;
  wrongReviewAttemptCount: number;
  recentWrongAttemptCount7d: number;
  highlightWordCount: number;
  weakTop3: WeakTypeStat[];
  recommendedSets: StudySet[];
  recentlyStudied: VocabItem[];
  classHomeworkSummary:
    | null
    | {
        className: string;
        title: string;
        dueDateLabel: string;
        progressLabel: string;
        progressPct: number;
      };
  onGoVocab: (query?: string) => void;
  onStartTodayLearn: () => void;
  onStartWrongReview: () => void;
  onStartDiagnostic: () => void;
  onOpenHighlight: () => void;
  onOpenWord: (id: string) => void;
  onOpenSet: (id: string) => void;
  onOpenClass: () => void;
  onOpenReport: () => void;
  onOpenLibrary: () => void;
  onExchangeReward: (item: RewardItem) => void;
  onWeakTypeReview: (typeName: string) => void;
  onWeakTypeCreateSet: (typeName: string) => void;
}) {
  const { t, tm } = useI18n();
  const goalPct =
    dailyWordGoal <= 0 ? 0 : Math.min(100, Math.round((studiedTodayCount / dailyWordGoal) * 100));

  const todayStudySet = recommendedSets[0] || null;
  const recentWrongLabels = useMemo(
    () =>
      recentWrongLearningRecords
        .map((record) => learningRecordWordLabels[record.question_id]?.split(" · ")[0])
        .filter(Boolean)
        .slice(0, 3),
    [learningRecordWordLabels, recentWrongLearningRecords]
  );
  const todayPlanRows = useMemo(
    () => [
      {
        icon: "book-outline" as const,
        title: "오늘 학습 세트",
        value: todayStudySet ? todayStudySet.title : `${profileGoal || "목표"} 단어`,
        meta: `${dailyWordGoal}${t("개")} · ${t("오늘 학습 시작")}을 누르면 이 세트로 시작합니다.`,
      },
      {
        icon: "refresh-circle-outline" as const,
        title: "이번 주 오답 복습",
        value: `${wrongReviewWordCount}${t("개")} ${t("단어")}`,
        meta: wrongReviewWordCount
          ? `${wrongReviewTotalWordCount > wrongReviewWordCount ? `${t("전체 오답")} ${wrongReviewTotalWordCount}${t("개")} ${t("중")} ` : ""}${t("최근 오답")} ${wrongReviewWordCount}${t("개만 빠르게 복습합니다.")}${recentWrongLabels.length ? ` ${recentWrongLabels.join(", ")}` : ""}`
          : t("아직 실제 오답 기록이 없습니다."),
      },
      {
        icon: "color-wand-outline" as const,
        title: "형광펜 단어장",
        value: `${highlightWordCount}${t("개")} ${t("단어")}`,
        meta: highlightWordCount ? t("사진/직접 추가로 저장한 개인 단어입니다.") : t("아직 추가한 단어가 없습니다."),
      },
    ],
    [dailyWordGoal, highlightWordCount, profileGoal, recentWrongLabels, t, todayStudySet, wrongReviewTotalWordCount, wrongReviewWordCount]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={styles.headerRow}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>V</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>VocaRush</Text>
            <Text style={styles.subtitle}>{t("EJU 기출 단어 데이터 중심")}</Text>
            {profileGoal || profileLevel ? (
              <Text style={styles.profileLine}>{[profileGoal, profileLevel].filter(Boolean).join(" · ")}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(studentName[0] || "V").toUpperCase()}</Text>
        </View>
      </Row>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color={COLORS.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("단어, 뜻, 독음, 연도(2015), 유형(근거 찾기)…")}
          placeholderTextColor="#7B82A6"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => onGoVocab(searchQuery)}
        />
        <Pressable
          onPress={() => {
            if (!searchQuery.trim()) {
              Alert.alert(t("검색"), t("검색어를 입력해 주세요."));
              return;
            }
            onGoVocab(searchQuery);
          }}
          style={({ pressed }) => [styles.searchGo, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="arrow-forward" size={17} color={COLORS.text} />
        </Pressable>
      </View>

      <Card style={styles.todayCard}>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.kicker}>{t("오늘 할 일")}</Text>
          <Badge label={`${t("예상")} 18${t("분")}`} tone="default" />
        </Row>
        <Text style={styles.heroTitle}>{t("오늘은 이 순서로 학습하세요")}</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {todayPlanRows.slice(0, 2).map((item) => (
            <View key={item.title} style={styles.planRow}>
              <View style={styles.planIcon}>
                <Ionicons name={item.icon} size={18} color={COLORS.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{t(item.title)}</Text>
                <Text style={styles.planValue}>{t(item.value)}</Text>
                <Text style={styles.planMeta}>{item.meta}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 12 }}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.mutedSmall}>{t("오늘 학습 진행률")}</Text>
            <Text style={styles.mutedSmall}>
              {studiedTodayCount}/{dailyWordGoal}
            </Text>
          </Row>
          <View style={{ marginTop: 8 }}>
            <ProgressBar value={goalPct} />
          </View>
          <Text style={styles.mutedSmall}>{t("연속")} {streakDays}{t("일")} · {t("누적")} XP {totalXP}</Text>
        </View>

        <Row style={{ marginTop: 12 }}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={onStartTodayLearn}>
            <Text style={styles.primaryBtnText}>{t("이 세트로 학습 시작")}</Text>
          </Pressable>
        </Row>

        <Row style={{ marginTop: 10 }}>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onStartWrongReview}>
            <Text style={styles.secondaryBtnText}>{t("오답 복습")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onStartDiagnostic}>
            <Text style={styles.secondaryBtnText}>{t("단어 진단 테스트")}</Text>
          </Pressable>
        </Row>

      </Card>

      <SectionHeader
        title="오늘 요약"
        right={
          <Pressable onPress={onOpenReport} hitSlop={8}>
            <Text style={styles.rightHint}>{t("리포트")}</Text>
          </Pressable>
        }
      />
      <Card>
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.statTitle}>{t("푼 문제")}</Text>
            <Text style={styles.statValue}>{learningTodayQuestionCount}{t("개")}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.statTitle}>{t("정답률")}</Text>
            <Text style={styles.statValue}>{learningAccuracy}%</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.statTitle}>{t("복습")}</Text>
            <Text style={styles.statValue}>{reviewTodayCount}{t("개")}</Text>
          </View>
        </View>
        <Text style={styles.mutedSmall}>
          {wrongReviewWordCount
            ? `${t("이번 주 오답")} ${wrongReviewWordCount}${t("개")} · ${t("최근")} 7${t("일")} ${recentWrongAttemptCount7d}${t("회")}`
            : t("아직 실제 오답 기록이 없습니다.")}
        </Text>
      </Card>
      {learningSaveError ? <Text style={styles.saveError}>{learningSaveError}</Text> : null}

      {classHomeworkSummary ? (
        <>
          <SectionHeader title="선생님 과제" right={<Text style={styles.rightHint}>{t("클래스")}</Text>} />
          <Pressable
            onPress={onOpenClass}
            style={({ pressed }) => [styles.homeworkCard, pressed && { opacity: 0.9 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.homeworkTitle}>{t(classHomeworkSummary.title)}</Text>
              <Text style={styles.mutedSmall}>
                {t(classHomeworkSummary.className)} · {t("마감")}: {classHomeworkSummary.dueDateLabel}
              </Text>
              <View style={{ marginTop: 10 }}>
                <ProgressBar value={classHomeworkSummary.progressPct} />
                <Text style={styles.mutedSmall}>{t("진행률")}: {classHomeworkSummary.progressLabel}</Text>
              </View>
            </View>
            <Badge label={t("이어하기")} tone="blue" />
          </Pressable>
        </>
      ) : null}

      {weakTop3[0] ? (
        <Card style={styles.weakCompactCard}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statTitle}>{t("가장 약한 유형")}</Text>
              <Text style={styles.weakTitle}>{t(weakTop3[0].typeName)}</Text>
              <Text style={styles.mutedSmall}>{t("정답률")} {weakTop3[0].accuracy}% · {weakTop3[0].attempts}{t("문제")}</Text>
            </View>
            <Pressable style={styles.compactAction} onPress={() => onWeakTypeReview(weakTop3[0].typeName)}>
              <Text style={styles.compactActionText}>{t("복습")}</Text>
            </Pressable>
          </Row>
        </Card>
      ) : null}

      <SectionHeader
        title="추천 세트"
        right={
          <Pressable onPress={onOpenLibrary} hitSlop={8}>
            <Text style={styles.rightHint}>{t("전체 보기")}</Text>
          </Pressable>
        }
      />
      {recommendedSets.slice(0, 3).map((s) => (
        <Pressable
          key={s.id}
          onPress={() => onOpenSet(s.id)}
          style={({ pressed }) => [styles.setCard, pressed && { opacity: 0.9 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.setTitle}>{t(s.title)}</Text>
            <Text style={styles.mutedSmall} numberOfLines={1}>
              {t(s.description)}
            </Text>
            <Text style={styles.mutedSmall}>{t("단어")} {s.wordCount}{t("개")} · {t("진행")} {s.progress}%</Text>
          </View>
          <View style={styles.setChip}>
            <Text style={styles.setChipText}>{t(s.createdFrom === "diagnostic" ? "진단" : "추천")}</Text>
          </View>
        </Pressable>
      ))}

      <SectionHeader title="스토어" right={<Text style={styles.rightHint}>{storeXP} XP</Text>} />
      <Card style={styles.storeNotice}>
        <Row style={{ alignItems: "center" }}>
          <View style={styles.storeIcon}>
            <Ionicons name="gift-outline" size={20} color={COLORS.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSectionTitle}>{t("학습 XP로 리워드 교환")}</Text>
            <Text style={styles.mutedSmall}>{t("현재는 실제 제휴/결제가 없는 로컬 데모입니다.")}</Text>
          </View>
        </Row>
        <View style={styles.rewardCompactList}>
          {rewardItems.slice(0, 2).map((item) => {
            const exchanged = redeemedRewardIds.includes(item.id);
            const enough = storeXP >= item.requiredXP;
            return (
              <View key={item.id} style={styles.rewardCompactRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardTitle}>{t(item.title)}</Text>
                  <Text style={styles.rewardDesc}>{item.requiredXP} XP</Text>
                </View>
                <Pressable
                  onPress={() => onExchangeReward(item)}
                  style={({ pressed }) => [
                    styles.exchangeBtn,
                    exchanged && styles.exchangeBtnDone,
                    !enough && !exchanged && styles.exchangeBtnMuted,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.exchangeBtnText}>{t(exchanged ? "교환 완료" : enough ? "교환" : "XP 부족")}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.pageX },
  scroll: { paddingTop: 20, paddingBottom: 118 },
  headerRow: { justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  brandLockup: { flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.md },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.blue,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  brandMarkText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h2, lineHeight: TYPO.h2Line },
  logo: { color: COLORS.text, fontSize: TYPO.logo, fontWeight: "800", letterSpacing: 0 },
  subtitle: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 1 },
  profileLine: { color: "#C7B8FF", fontSize: TYPO.micro, lineHeight: TYPO.microLine, marginTop: 2, fontWeight: "800" },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.violet, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  avatarText: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  searchWrap: {
    backgroundColor: COLORS.field,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingHorizontal: SPACING.lg,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  searchIcon: { color: COLORS.muted, fontSize: TYPO.h2 },
  searchInput: { flex: 1, color: COLORS.text, fontWeight: "700", fontSize: TYPO.body },
  searchGo: { backgroundColor: COLORS.blue, borderRadius: 999, width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  searchGoText: { color: COLORS.text, fontWeight: "800" },
  todayCard: { marginTop: SPACING.lg, borderColor: "rgba(105,215,255,0.16)" },
  kicker: { color: "#C9D0FF", fontWeight: "800", fontSize: TYPO.small, letterSpacing: 0.2 },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  heroTitle: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800", marginTop: 10, marginBottom: 6 },
  recLine: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.cyan },
  recRow: { color: COLORS.text, fontWeight: "700", lineHeight: TYPO.h3Line, flex: 1 },
  planRow: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: "rgba(32,38,80,0.72)",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(80,98,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  planTitle: { color: COLORS.muted, fontSize: TYPO.small, fontWeight: "900", lineHeight: TYPO.smallLine },
  planValue: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "900", lineHeight: TYPO.h3Line, marginTop: 1 },
  planMeta: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3 },
  mutedSmall: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 8 },
  primaryBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: RADII.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
    shadowColor: COLORS.blue,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: COLORS.card2,
    borderRadius: RADII.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  homeworkCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  homeworkTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  summaryStrip: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, height: 42, backgroundColor: COLORS.lineSoft, marginHorizontal: 10 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  gridCard: { width: "48%" },
  statTitle: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  statValue: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "800", marginTop: 6 },
  cardSectionTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3, lineHeight: TYPO.h3Line },
  recordRow: { minHeight: 58, borderRadius: 14, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  recordTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  recordAnswer: { color: COLORS.gold, fontWeight: "800", fontSize: TYPO.small, maxWidth: 150 },
  saveError: { color: COLORS.red, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "800", marginTop: 8 },
  weakCompactCard: { marginTop: SPACING.md, borderColor: "rgba(105,215,255,0.16)" },
  weakTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  compactAction: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  compactActionText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  setCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  setTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, marginBottom: 2 },
  setChip: { backgroundColor: "#2A245B", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  setChipText: { color: "#C7B8FF", fontWeight: "800", fontSize: TYPO.micro },
  storeNotice: { marginBottom: SPACING.md, borderColor: "rgba(246,200,95,0.22)" },
  storeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(246,200,95,0.16)",
    borderWidth: 1,
    borderColor: "rgba(246,200,95,0.24)",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardGrid: { gap: SPACING.md },
  rewardCompactList: { gap: 10, marginTop: SPACING.md },
  rewardCompactRow: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rewardCard: { padding: SPACING.lg },
  rewardBrand: { color: COLORS.gold, fontWeight: "900", fontSize: TYPO.small, lineHeight: TYPO.smallLine },
  rewardTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3, lineHeight: TYPO.h3Line, marginTop: 3 },
  rewardDesc: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  rewardCost: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  exchangeBtn: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  exchangeBtnMuted: { backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  exchangeBtnDone: { backgroundColor: "#16382F", borderWidth: 1, borderColor: "rgba(80,216,144,0.28)" },
  exchangeBtnText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  wordRow: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordTitle: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "800" },
  wordMeta: { color: COLORS.muted, fontWeight: "800" },
});
