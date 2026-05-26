import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Card, EmptyState, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, SPACING, TYPO } from "../theme";
import { LearningRecord, RewardItem, StudySet, UserStudyFolder, VocabItem, WeakTypeStat } from "../types";

const MONDAY_FIRST_WEEK_LABELS = ["요일 월", "요일 화", "요일 수", "요일 목", "요일 금", "요일 토", "요일 일"] as const;

type TodayStudyCourseSummary = {
  courseTitle: string;
  seconds: number;
  activityCount: number;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  knownCount: number;
  learningCount: number;
  bonusXP: number;
};

type RecentLearningResume = {
  title: string;
  mode: string;
  progressLabel: string;
  progressPct: number;
};

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMondayStart(date: Date) {
  const start = new Date(date);
  const weekday = start.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatStudyTime(seconds: number) {
  if (seconds <= 0) return "0분";
  if (seconds < 60) return "1분 미만";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain ? `${hours}시간 ${remain}분` : `${hours}시간`;
}

export function StudentHomeScreen({
  studentName,
  profileGoal,
  profileLevel,
  searchQuery,
  setSearchQuery,
  dailyWordGoal,
  studiedTodayCount,
  streakDays,
  longestStreak,
  attendanceDates,
  totalXP,
  storeXP,
  rewardItems,
  redeemedRewardIds,
  learningTodayQuestionCount,
  learningAccuracy,
  todayStudySeconds,
  todayStudyBonusXP,
  todayStudyCourseSummaries,
  recentLearningResume,
  recentWrongLearningRecords,
  learningRecordWordLabels,
  learningWeakTop3,
  learningSaveError,
  reviewTodayCount,
  wrongReviewWordCount,
  wrongReviewTotalWordCount,
  wrongReviewAttemptCount,
  highlightWordCount,
  weakTop3,
  personalSets,
  userFolders,
  recommendedSets,
  recentlyStudied,
  classHomeworkSummary,
  onGoVocab,
  onStartTodayLearn,
  onResumeRecentLearning,
  onStartWrongReview,
  onStartDiagnostic,
  onOpenHighlight,
  onOpenWord,
  onOpenSet,
  onOpenUserFolder,
  onOpenClass,
  onOpenReport,
  onOpenLibrary,
  onOpenMy,
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
  longestStreak: number;
  attendanceDates: string[];
  totalXP: number;
  storeXP: number;
  rewardItems: RewardItem[];
  redeemedRewardIds: string[];
  learningTodayQuestionCount: number;
  learningAccuracy: number;
  todayStudySeconds: number;
  todayStudyBonusXP: number;
  todayStudyCourseSummaries: TodayStudyCourseSummary[];
  recentLearningResume: RecentLearningResume | null;
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
  personalSets: StudySet[];
  userFolders: UserStudyFolder[];
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
        assignmentKind: string;
        availabilityStatusLabel: string;
        availabilityLabel: string;
        isOpen: boolean;
      };
  onGoVocab: (query?: string) => void;
  onStartTodayLearn: () => void;
  onResumeRecentLearning: () => void;
  onStartWrongReview: () => void;
  onStartDiagnostic: () => void;
  onOpenHighlight: () => void;
  onOpenWord: (id: string) => void;
  onOpenSet: (id: string) => void;
  onOpenUserFolder: (id: string) => void;
  onOpenClass: () => void;
  onOpenReport: () => void;
  onOpenLibrary: () => void;
  onOpenMy: () => void;
  onExchangeReward: (item: RewardItem) => void;
  onWeakTypeReview: (typeName: string) => void;
  onWeakTypeCreateSet: (typeName: string) => void;
}) {
  const { t, tm } = useI18n();
  const goalPct =
    dailyWordGoal <= 0 ? 0 : Math.min(100, Math.round((studiedTodayCount / dailyWordGoal) * 100));
  const hasLearningSignal = learningTodayQuestionCount > 0 || wrongReviewWordCount > 0 || wrongReviewAttemptCount > 0;
  const todayActivityCount = todayStudyCourseSummaries.reduce((sum, item) => sum + item.activityCount, 0);
  const todayQuestionCount = todayStudyCourseSummaries.reduce((sum, item) => sum + item.questionCount, 0);
  const todayWrongCount = todayStudyCourseSummaries.reduce((sum, item) => sum + item.wrongCount, 0);

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
  const quickActions = [
    { title: "단어 진단", subtitle: "코스별 약점 확인", icon: "pulse-outline" as const, onPress: onStartDiagnostic },
    { title: "라이브러리", subtitle: "세트 이어하기", icon: "library-outline" as const, onPress: onOpenLibrary },
    { title: "형광펜", subtitle: `${highlightWordCount}${t("개")} ${t("단어")}`, icon: "color-wand-outline" as const, onPress: onOpenHighlight },
    { title: "학습 코스", subtitle: "마이에서 변경", icon: "options-outline" as const, onPress: onOpenMy },
  ];
  const attendanceWeek = useMemo(() => {
    const today = new Date();
    const todayKey = formatDateKey(today);
    const monday = getMondayStart(today);
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const key = formatDateKey(d);
      return {
        key,
        label: MONDAY_FIRST_WEEK_LABELS[index],
        done: attendanceDates.includes(key),
        isToday: key === todayKey,
      };
    });
  }, [attendanceDates]);
  const weekAttendancePct = Math.round((attendanceWeek.filter((day) => day.done).length / 7) * 100);
  const didAttendToday = attendanceWeek.some((day) => day.isToday && day.done);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={styles.headerRow}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>V</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logo}>VocaRush</Text>
            <Text style={styles.subtitle}>{t("EJU·입시 영어·실무 표현 학습")}</Text>
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
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("검색")}
          style={({ pressed }) => [styles.searchGo, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="arrow-forward" size={17} color={COLORS.text} />
        </Pressable>
      </View>

      {recentLearningResume ? (
        <Pressable
          onPress={onResumeRecentLearning}
          style={({ pressed }) => [styles.resumeCard, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={t("최근 학습 이어가기")}
        >
          <Row style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{t("최근 학습 이어가기")}</Text>
              <Text style={styles.resumeTitle} numberOfLines={1}>{t(recentLearningResume.title)}</Text>
              <Text style={styles.resumeMeta}>
                {t(recentLearningResume.mode)} · {recentLearningResume.progressLabel}
              </Text>
            </View>
            <View style={styles.resumeAction}>
              <Ionicons name="play" size={18} color={COLORS.text} />
            </View>
          </Row>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={recentLearningResume.progressPct} />
          </View>
        </Pressable>
      ) : null}

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

      <SectionHeader title="바로가기" />
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.title}
            onPress={action.onPress}
            style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.quickIcon}>
              <Ionicons name={action.icon} size={22} color={COLORS.text} />
            </View>
            <Text style={styles.quickTitle}>{t(action.title)}</Text>
            <Text style={styles.quickSubtitle}>{t(action.subtitle)}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="출석" />
      <Card style={styles.streakCard}>
        <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={styles.streakNumber}>{streakDays}{t("일")}</Text>
            <Text style={styles.mutedSmall}>{t("현재 연속 출석")} · {t("최고")} {longestStreak}{t("일")}</Text>
          </View>
          <View style={styles.streakRight}>
            <Badge label={didAttendToday ? "오늘 출석 완료" : "오늘 학습 전"} tone={didAttendToday ? "success" : "gold"} />
            <View style={styles.streakFlame}>
              <Ionicons name="flame" size={28} color={COLORS.gold} />
            </View>
          </View>
        </Row>
        <View style={styles.attendanceProgressRow}>
          <Text style={styles.mutedSmall}>{t("이번 주 출석률")}</Text>
          <Text style={styles.attendancePct}>{weekAttendancePct}%</Text>
        </View>
        <ProgressBar value={weekAttendancePct} />
        <View style={styles.weekRow}>
          {attendanceWeek.map((day) => (
            <View key={day.key} style={styles.weekDay}>
              <Text style={[styles.weekLabel, day.isToday && styles.weekLabelToday]}>{t(day.label)}</Text>
              <View style={[styles.weekDot, day.done && styles.weekDotDone, day.isToday && styles.weekDotToday]}>
                {day.done ? <Ionicons name="checkmark" size={15} color={COLORS.text} /> : null}
              </View>
              <Text style={[styles.todayMarker, !day.isToday && styles.todayMarkerHidden]}>{t("오늘")}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader
        title="오늘 요약"
        right={
          <Pressable onPress={onOpenReport} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("리포트")}>
            <Text style={styles.rightHint}>{t("리포트")}</Text>
          </Pressable>
        }
      />
      <Card>
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.statTitle}>{t("공부 시간")}</Text>
            <Text style={styles.statValue}>{formatStudyTime(todayStudySeconds)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.statTitle}>{t("완료 활동")}</Text>
            <Text style={styles.statValue}>{todayActivityCount}{t("회")}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.statTitle}>{t("완료 보너스")}</Text>
            <Text style={styles.statValue}>+{todayStudyBonusXP} XP</Text>
          </View>
        </View>
        {todayStudyCourseSummaries.length ? (
          <View style={styles.courseSummaryList}>
            {todayStudyCourseSummaries.slice(0, 3).map((item) => {
              const solved = item.correctCount + item.wrongCount;
              const accuracy = solved ? Math.round((item.correctCount / solved) * 100) : null;
              return (
                <View key={item.courseTitle} style={styles.courseSummaryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseSummaryTitle}>{t(item.courseTitle)}</Text>
                    <Text style={styles.mutedSmall}>
                      {formatStudyTime(item.seconds)} · {item.questionCount}{t("개")} · {item.activityCount}{t("회")}
                    </Text>
                  </View>
                  <View style={styles.courseSummaryBadge}>
                    <Text style={styles.courseSummaryBadgeText}>
                      {accuracy !== null
                        ? `${accuracy}%`
                        : item.learningCount
                        ? `${t("학습 중")} ${item.learningCount}`
                        : `+${item.bonusXP} XP`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.mutedSmall}>
            {t("아직 완료한 학습 세션이 없습니다. 낱말카드나 테스트를 끝까지 진행하면 시간이 기록됩니다.")}
          </Text>
        )}
        {hasLearningSignal && todayQuestionCount ? (
          <Text style={styles.mutedSmall}>
            {t("오늘 정답률")} {learningAccuracy}% · {t("오답")} {todayWrongCount}{t("개")}
          </Text>
        ) : null}
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
              <Row style={{ marginTop: 8, flexWrap: "wrap" }}>
                <Badge label={t(classHomeworkSummary.assignmentKind)} tone={classHomeworkSummary.assignmentKind === "수업 전 단어 테스트" ? "violet" : "default"} />
                <Badge label={t(classHomeworkSummary.availabilityStatusLabel)} tone={classHomeworkSummary.isOpen ? "blue" : "default"} />
              </Row>
              <Text style={styles.mutedSmall}>
                {t(classHomeworkSummary.className)} · {t("마감")}: {classHomeworkSummary.dueDateLabel}
              </Text>
              <Text style={styles.mutedSmall}>{t("공개")}: {classHomeworkSummary.availabilityLabel}</Text>
              <View style={{ marginTop: 10 }}>
                <ProgressBar value={classHomeworkSummary.progressPct} />
                <Text style={styles.mutedSmall}>{t("진행률")}: {classHomeworkSummary.progressLabel}</Text>
              </View>
            </View>
            <Badge label={t(classHomeworkSummary.isOpen ? "이어하기" : "대기")} tone={classHomeworkSummary.isOpen ? "blue" : "default"} />
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

      {personalSets.length || userFolders.length ? (
        <>
          <SectionHeader title="개인 학습" right={<Text style={styles.rightHint}>{t("홈에서 관리")}</Text>} />
          {userFolders.slice(0, 2).map((folder) => (
            <Pressable
              key={folder.id}
              onPress={() => onOpenUserFolder(folder.id)}
              style={({ pressed }) => [styles.setCard, styles.personalSetCard, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.setTitle}>{t(folder.title)}</Text>
                <Text style={styles.mutedSmall} numberOfLines={1}>
                  {t(folder.description)}
                </Text>
                <Text style={styles.mutedSmall}>
                  {folder.setIds.length ? `${folder.setIds.length}${t("개 세트")}` : t("빈 폴더")}
                </Text>
              </View>
              <View style={[styles.setChip, styles.personalSetChip]}>
                <Text style={styles.setChipText}>{t("폴더")}</Text>
              </View>
            </Pressable>
          ))}
          {personalSets.slice(0, 3).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onOpenSet(s.id)}
              style={({ pressed }) => [styles.setCard, styles.personalSetCard, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.setTitle}>{t(s.title)}</Text>
                <Text style={styles.mutedSmall} numberOfLines={1}>
                  {t(s.description)}
                </Text>
                <Text style={styles.mutedSmall}>{t("단어")} {s.wordCount}{t("개")} · {t("진행")} {s.progress}%</Text>
              </View>
              <View style={[styles.setChip, styles.personalSetChip]}>
                <Text style={styles.setChipText}>{t(s.createdFrom === "teacher" ? "과제" : "개인")}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}

      <SectionHeader
        title="추천 세트"
        right={
          <Pressable onPress={onOpenLibrary} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("전체 보기")}>
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
  searchGo: { backgroundColor: COLORS.blue, borderRadius: 999, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  searchGoText: { color: COLORS.text, fontWeight: "800" },
  resumeCard: {
    marginTop: SPACING.lg,
    borderRadius: RADII.cardLg,
    backgroundColor: "#171D46",
    borderWidth: 1,
    borderColor: "rgba(103,217,255,0.28)",
    padding: 16,
  },
  resumeTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h2, lineHeight: TYPO.h2Line, marginTop: 4 },
  resumeMeta: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  resumeAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
  },
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
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  quickCard: { width: "48%", minHeight: 118, borderRadius: RADII.card, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lineSoft, padding: 14 },
  quickIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(80,98,255,0.22)", justifyContent: "center", alignItems: "center" },
  quickTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3, marginTop: 10 },
  quickSubtitle: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 3 },
  streakCard: { borderColor: "rgba(246,200,95,0.22)" },
  streakNumber: { color: COLORS.text, fontWeight: "900", fontSize: 36 },
  streakRight: { alignItems: "flex-end", gap: 8 },
  streakFlame: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(246,200,95,0.16)", borderWidth: 1, borderColor: "rgba(246,200,95,0.24)", justifyContent: "center", alignItems: "center" },
  attendanceProgressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 },
  attendancePct: { color: COLORS.gold, fontWeight: "900", fontSize: TYPO.small },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  weekDay: { alignItems: "center", gap: 7 },
  weekLabel: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.micro },
  weekLabelToday: { color: COLORS.text },
  weekDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card2, justifyContent: "center", alignItems: "center" },
  weekDotDone: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  weekDotToday: { borderColor: COLORS.gold, borderWidth: 2 },
  todayMarker: { color: COLORS.gold, fontWeight: "900", fontSize: 10, lineHeight: 12 },
  todayMarkerHidden: { opacity: 0 },
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
  courseSummaryList: { gap: 10, marginTop: 14 },
  courseSummaryRow: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  courseSummaryTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body, lineHeight: TYPO.bodyLine },
  courseSummaryBadge: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: "rgba(80,98,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  courseSummaryBadgeText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
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
  personalSetCard: { borderColor: "rgba(103,217,255,0.24)", backgroundColor: "#171D46" },
  setChip: { backgroundColor: "#2A245B", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  personalSetChip: { backgroundColor: "rgba(103,217,255,0.14)" },
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
