import React from "react";
import { Alert, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Badge, Card, PillButton, Row, SectionHeader } from "../components/common";
import { LEARNING_COURSES } from "../data/learningCatalog";
import { useI18n } from "../i18n";
import { COLORS, PRESS_FEEDBACK, RADII, TYPO } from "../theme";
import { AppLanguage, EjuExamPlan, LearningCourse, StudentSettings, StudyStyle, TargetScore, UserRole } from "../types";
import { getSafeErrorMessage, logInternalError } from "../utils/errors";

function styleDescription(style: StudyStyle) {
  if (style === "균형형") return "낱말카드/퀴즈/예문/복습을 균형 있게 섞습니다.";
  if (style === "빠른 암기형") return "더 많은 낱말카드, 빠른 반복, 짧은 설명 중심.";
  if (style === "문제풀이형") return "뜻/유형 퀴즈를 우선으로 학습합니다.";
  if (style === "예문중심형") return "예문 빈칸을 우선으로 학습합니다.";
  if (style === "오답집중형") return "오답 단어와 리뷰 큐부터 먼저 복습합니다.";
  return "기출 출현 빈도가 높은 단어부터 학습합니다.";
}

function courseStyleDescription(course: LearningCourse, style: StudyStyle) {
  if (course === "STARTUP_BUSINESS_ENGLISH") {
    if (style === "예문중심형") return "피치, 투자자 미팅, SaaS 지표 문장을 먼저 익힙니다.";
    if (style === "빠른 암기형") return "PMF, runway, CAC 같은 핵심 용어를 짧게 반복합니다.";
    if (style === "오답집중형") return "헷갈린 실무 용어와 문장만 다시 돌립니다.";
    return "용어 카드와 실제 업무 문장을 가볍게 섞습니다.";
  }
  if (course === "BUSINESS_JAPANESE") {
    if (style === "예문중심형") return "메일, 회의, 일정 조율 문장을 상황별로 익힙니다.";
    if (style === "오답집중형") return "틀린 경어와 실무 표현을 우선 복습합니다.";
    if (style === "빠른 암기형") return "자주 쓰는 회사 표현을 짧게 반복합니다.";
  }
  if (course === "CAMPUS_JAPANESE") {
    if (style === "예문중심형") return "캠퍼스 대화와 SNS 표현을 예문 중심으로 익힙니다.";
    if (style === "빠른 암기형") return "신조어와 자주 쓰는 말투를 빠르게 훑습니다.";
    if (style === "오답집중형") return "익숙하지 않은 실사용 표현부터 다시 봅니다.";
  }
  if (course === "ADMISSION_ENGLISH") {
    if (style === "문제풀이형") return "TOEFL/IELTS/출원 문맥의 뜻 고르기를 우선합니다.";
    if (style === "예문중심형") return "지원서와 academic 문장을 예문으로 익힙니다.";
  }
  if (course === "TOEIC_BUSINESS") {
    if (style === "기출빈도형") return "TOEIC 빈출 업무 표현부터 우선 학습합니다.";
    if (style === "문제풀이형") return "RC/LC 업무 상황 퀴즈를 우선합니다.";
  }
  return styleDescription(style);
}

function courseSettingsProfile(course: LearningCourse) {
  const ejuStyles: StudyStyle[] = ["균형형", "빠른 암기형", "문제풀이형", "예문중심형", "오답집중형", "기출빈도형"];
  if (course === "STARTUP_BUSINESS_ENGLISH") {
    return {
      styleOptions: ["균형형", "예문중심형", "빠른 암기형", "오답집중형"] as StudyStyle[],
      defaultStyle: "예문중심형" as StudyStyle,
      dailyGoalMin: 10,
      dailyGoalMax: 80,
      dailyGoalHelp: "실무 코스는 많이 외우기보다 실제 문장에 바로 붙이는 흐름이 좋아서 80개까지만 둡니다.",
      settingSummary: "실무 문장·핵심 용어 중심",
      showEjuPlans: false,
      goalTitle: "실무 목표",
      goalBody: "스타트업 영어는 시험 점수보다 피치, 투자자 미팅, 제품/지표 설명 문장을 바로 쓰는 쪽에 맞춰 설정합니다.",
    };
  }
  if (course === "BUSINESS_JAPANESE") {
    return {
      styleOptions: ["균형형", "예문중심형", "빠른 암기형", "오답집중형"] as StudyStyle[],
      defaultStyle: "예문중심형" as StudyStyle,
      dailyGoalMin: 10,
      dailyGoalMax: 80,
      dailyGoalHelp: "비즈니스 일본어는 경어와 상황 문장 반복이 중요해서 단어 목표를 너무 높게 잡지 않습니다.",
      settingSummary: "메일·회의 표현 중심",
      showEjuPlans: false,
      goalTitle: "실무 목표",
      goalBody: "비즈니스 일본어는 EJU 점수 대신 메일, 회의, 일정 조율 같은 상황별 표현 완성도를 우선합니다.",
    };
  }
  if (course === "CAMPUS_JAPANESE") {
    return {
      styleOptions: ["균형형", "예문중심형", "빠른 암기형", "오답집중형"] as StudyStyle[],
      defaultStyle: "균형형" as StudyStyle,
      dailyGoalMin: 10,
      dailyGoalMax: 80,
      dailyGoalHelp: "캠퍼스 표현은 짧게 자주 보는 편이 좋아서 현실적인 범위로 제한합니다.",
      settingSummary: "실사용 표현 중심",
      showEjuPlans: false,
      goalTitle: "사용 목표",
      goalBody: "대학생 일본어는 시험 점수보다 실제 대화, SNS, 수업/동아리 상황에서 자연스럽게 쓰는 것을 목표로 합니다.",
    };
  }
  if (course === "ADMISSION_ENGLISH") {
    return {
      styleOptions: ["균형형", "문제풀이형", "예문중심형", "빠른 암기형", "오답집중형"] as StudyStyle[],
      defaultStyle: "문제풀이형" as StudyStyle,
      dailyGoalMin: 10,
      dailyGoalMax: 100,
      dailyGoalHelp: "입시 영어는 시험/서류 표현을 같이 보므로 100개까지만 권장합니다.",
      settingSummary: "시험·서류 표현 중심",
      showEjuPlans: false,
      goalTitle: "입시 영어 목표",
      goalBody: "TOEFL, IELTS, 지원 서류 표현은 EJU 일정 점수와 분리해서 단어 목표와 공부방법만 조정합니다.",
    };
  }
  if (course === "TOEIC_BUSINESS") {
    return {
      styleOptions: ["균형형", "문제풀이형", "기출빈도형", "빠른 암기형", "예문중심형", "오답집중형"] as StudyStyle[],
      defaultStyle: "문제풀이형" as StudyStyle,
      dailyGoalMin: 10,
      dailyGoalMax: 120,
      dailyGoalHelp: "TOEIC은 빈출어를 많이 돌릴 수 있어 120개까지 열어둡니다.",
      settingSummary: "TOEIC 빈출·업무 상황 중심",
      showEjuPlans: false,
      goalTitle: "TOEIC 목표",
      goalBody: "TOEIC 코스는 EJU 일정 대신 RC/LC 빈출어, 업무 상황 표현, 오답 반복을 우선합니다.",
    };
  }
  return {
    styleOptions: ejuStyles,
    defaultStyle: "균형형" as StudyStyle,
    dailyGoalMin: 10,
    dailyGoalMax: 120,
    dailyGoalHelp: "EJU 코스는 시험 대비량을 넓게 잡을 수 있어 120개까지 설정할 수 있습니다.",
    settingSummary: "EJU 점수·시험 일정 중심",
    showEjuPlans: true,
    goalTitle: "EJU 일정별 목표",
    goalBody: "6월과 11월 시험 목표를 따로 잡아두면, 같은 해 안에서도 단계적으로 목표를 올릴 수 있습니다.",
  };
}

const languageOptions: Array<{ value: AppLanguage; label: string; preview: string; teacherPreview: string }> = [
  { value: "한국어", label: "한국어", preview: "오늘 학습 시작", teacherPreview: "오늘 과제 현황 확인" },
  { value: "日本語", label: "日本語", preview: "今日の学習を始める", teacherPreview: "今日の課題状況を確認" },
  { value: "中文", label: "中文", preview: "开始今天的学习", teacherPreview: "查看今天的作业状态" },
  { value: "English", label: "English", preview: "Start today’s study", teacherPreview: "Check today’s assignments" },
];

function languageDescription(language: AppLanguage) {
  if (language === "日本語") return "일본어 UI 데모 모드입니다. 학습 데이터와 단어 정보는 그대로 유지됩니다.";
  if (language === "中文") return "중국어 UI 데모 모드입니다. 학습 데이터와 단어 정보는 그대로 유지됩니다.";
  if (language === "English") return "영어 UI 데모 모드입니다. 학습 데이터와 단어 정보는 그대로 유지됩니다.";
  return "기본 한국어 UI입니다.";
}

function defaultEjuPlans(targetScore: TargetScore): EjuExamPlan[] {
  const firstTargetScoreValue = targetScore === "350+" ? 350 : targetScore === "300점" ? 300 : 200;
  return [
    { examDate: "2026.06 EJU", targetScore, targetScoreValue: firstTargetScoreValue },
    { examDate: "2026.11 EJU", targetScore: "350+", targetScoreValue: 350 },
  ];
}

function normalizeEjuPlans(plans: EjuExamPlan[] | undefined, targetScore: TargetScore) {
  const fallback = defaultEjuPlans(targetScore);
  return fallback.map((base, index) => {
    const saved = plans?.[index];
    if (!saved) return base;
    return {
      ...base,
      ...saved,
      examDate: base.examDate,
      targetScoreValue: planScoreValue(saved),
    };
  });
}

function targetScoreBucket(score: number): TargetScore {
  if (score >= 350) return "350+";
  if (score >= 300) return "300점";
  return "200점";
}

function planScoreValue(plan: EjuExamPlan) {
  if (typeof plan.targetScoreValue === "number") return plan.targetScoreValue;
  if (plan.targetScore === "350+") return 350;
  if (plan.targetScore === "300점") return 300;
  return 200;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export type TeacherAccountSummary = {
  academyName: string;
  classCount: number;
  studentCount: number;
  activeAssignmentCount: number;
  pendingAssignmentCount: number;
  avgCompletion: number;
  classNames: string[];
};

function StepControl({
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const [trackWidth, setTrackWidth] = React.useState(1);
  const [draft, setDraft] = React.useState(String(value));
  const safeValue = clampNumber(roundToStep(value, step), min, max);
  const pct = ((safeValue - min) / Math.max(1, max - min)) * 100;

  React.useEffect(() => {
    setDraft(String(safeValue));
  }, [safeValue]);

  function commit(next: number) {
    onChange(clampNumber(roundToStep(next, step), min, max));
  }

  function commitDraft() {
    const parsed = Number(draft.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(parsed)) {
      setDraft(String(safeValue));
      return;
    }
    commit(parsed);
  }

  function valueFromX(x: number) {
    const ratio = clampNumber(x / Math.max(1, trackWidth), 0, 1);
    return min + ratio * (max - min);
  }

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => commit(valueFromX(event.nativeEvent.locationX)),
        onPanResponderMove: (event) => commit(valueFromX(event.nativeEvent.locationX)),
      }),
    [max, min, step, trackWidth]
  );

  return (
    <View style={styles.stepperBox}>
      <Row style={{ alignItems: "center" }}>
        <Pressable
          onPress={() => commit(safeValue - step)}
          style={({ pressed }) => [styles.stepButton, pressed && PRESS_FEEDBACK.soft]}
        >
          <Text style={styles.stepButtonText}>-</Text>
        </Pressable>
        <View
          style={styles.sliderTrack}
          onLayout={(event) => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
          {...panResponder.panHandlers}
        >
          <View style={[styles.sliderFill, { width: `${pct}%` }]} />
          <View
            style={[
              styles.sliderThumb,
              { left: clampNumber((pct / 100) * trackWidth - 12, 0, Math.max(0, trackWidth - 24)) },
            ]}
          />
        </View>
        <Pressable
          onPress={() => commit(safeValue + step)}
          style={({ pressed }) => [styles.stepButton, pressed && PRESS_FEEDBACK.soft]}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </Row>
      <Row style={{ alignItems: "center", marginTop: 10 }}>
        <TextInput
          value={draft}
          onChangeText={(text) => setDraft(text.replace(/[^0-9]/g, ""))}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
          onKeyPress={(event) => {
            if (event.nativeEvent.key === "ArrowUp") commit(safeValue + step);
            if (event.nativeEvent.key === "ArrowDown") commit(safeValue - step);
          }}
          keyboardType="number-pad"
          maxLength={3}
          style={styles.stepInput}
        />
        <Text style={styles.stepSuffix}>{suffix}</Text>
        <Text style={styles.stepHelp}>{t("드래그 또는 ↑↓")}</Text>
      </Row>
    </View>
  );
}

export function MyScreen({
  studentName,
  settings,
  setSettings,
  onRoleChange,
  teacherSummary,
  onTeacherOpenClasses,
  onTeacherOpenDistribute,
  onTeacherOpenStatus,
  onSignOut,
}: {
  studentName: string;
  settings: StudentSettings;
  setSettings: (s: StudentSettings) => void;
  onRoleChange?: (role: UserRole) => void;
  teacherSummary?: TeacherAccountSummary;
  onTeacherOpenClasses?: () => void;
  onTeacherOpenDistribute?: () => void;
  onTeacherOpenStatus?: () => void;
  onSignOut: () => Promise<void>;
}) {
  const { t, language } = useI18n();
  const [courseExpanded, setCourseExpanded] = React.useState(false);
  const [styleExpanded, setStyleExpanded] = React.useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const selectedCourse = LEARNING_COURSES.find((course) => course.id === settings.learningCourse) || LEARNING_COURSES[0];
  const courseProfile = courseSettingsProfile(selectedCourse.id);
  const stylesList = courseProfile.styleOptions;
  const ejuPlans = normalizeEjuPlans(settings.ejuExamPlans, settings.targetScore);
  const ejuSummary = ejuPlans.map((plan) => `${plan.examDate.replace(" EJU", "")} ${planScoreValue(plan)}점`).join(" · ");
  const isTeacher = settings.role === "teacher";
  const teacherAccountSummary = teacherSummary || {
    academyName: "EJUEDU",
    classCount: 0,
    studentCount: 0,
    activeAssignmentCount: 0,
    pendingAssignmentCount: 0,
    avgCompletion: 0,
    classNames: [],
  };
  const settingsSummary = isTeacher
    ? `${teacherAccountSummary.academyName} ${t("교사용 계정")} · ${teacherAccountSummary.classCount}${t("개")} ${t("반")} · ${teacherAccountSummary.studentCount}${t("명")}`
    : courseProfile.showEjuPlans
      ? ejuSummary
      : courseProfile.settingSummary;
  const selectedLanguageOption = languageOptions.find((language) => language.value === settings.appLanguage);
  const dailyWordGoalValue = clampNumber(roundToStep(settings.dailyWordGoal, 10), courseProfile.dailyGoalMin, courseProfile.dailyGoalMax);

  React.useEffect(() => {
    if (settings.role === "teacher") return;
    const nextStyle = stylesList.includes(settings.studyStyle) ? settings.studyStyle : courseProfile.defaultStyle;
    if (dailyWordGoalValue !== settings.dailyWordGoal || nextStyle !== settings.studyStyle) {
      setSettings({ ...settings, dailyWordGoal: dailyWordGoalValue, studyStyle: nextStyle });
    }
  }, [dailyWordGoalValue, settings.dailyWordGoal, settings.studyStyle, settings.learningCourse, settings.role]);

  function handleSignOut() {
    setSignOutConfirmOpen(true);
  }

  async function confirmSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
      setSignOutConfirmOpen(false);
    } catch (error) {
      logInternalError(error, "MyScreen.signOut");
      Alert.alert(t("로그아웃"), getSafeErrorMessage(error, language));
      setSigningOut(false);
    }
  }

  function changeRole(nextRole: UserRole) {
    if (nextRole === settings.role) return;
    if (onRoleChange) {
      onRoleChange(nextRole);
      return;
    }
    setSettings({ ...settings, role: nextRole });
  }

  function updateEjuPlan(planIndex: number, targetScoreValue: number) {
    const basePlans = normalizeEjuPlans(settings.ejuExamPlans, settings.targetScore);
    const targetScore = targetScoreBucket(targetScoreValue);
    const nextPlans = basePlans.map((plan, index) =>
      index === planIndex ? { ...plan, targetScore, targetScoreValue } : plan
    );
    const primary = nextPlans[0] || { examDate: "2026.06 EJU", targetScore, targetScoreValue };
    setSettings({
      ...settings,
      ejuExamPlans: nextPlans,
      examDate: primary.examDate,
      targetScore: primary.targetScore,
    });
  }

  function changeLearningCourse(courseId: LearningCourse) {
    const nextProfile = courseSettingsProfile(courseId);
    const nextDailyWordGoal = clampNumber(roundToStep(settings.dailyWordGoal, 10), nextProfile.dailyGoalMin, nextProfile.dailyGoalMax);
    const nextStudyStyle = nextProfile.styleOptions.includes(settings.studyStyle) ? settings.studyStyle : nextProfile.defaultStyle;
    setSettings({
      ...settings,
      learningCourse: courseId,
      dailyWordGoal: nextDailyWordGoal,
      studyStyle: nextStudyStyle,
    });
    setCourseExpanded(false);
  }

  const roleLabel = settings.role === "student" ? t("학생") : t("선생님");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.pageTitle}>{t("마이")}</Text>
        <View style={styles.autoSavePill} accessibilityLabel={t("자동 저장")}>
          <View style={styles.autoSaveDot} />
          <Text style={styles.autoSaveText}>{t("자동 저장")}</Text>
        </View>
      </Row>

      <Card style={{ marginTop: 12, alignItems: "center" }}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(studentName[0] || "V").toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{studentName}</Text>
        <Text style={styles.muted}>{t(settingsSummary)}</Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Badge label={`${t("역할")}: ${roleLabel}`} tone="violet" />
          {isTeacher ? (
            <Badge label={`${t("담당")} ${teacherAccountSummary.classCount}${t("반")}`} tone="blue" />
          ) : (
            <Badge label={`${t("공부방법")}: ${t(settings.studyStyle)}`} tone="default" />
          )}
          <Badge label={`${t("언어")}: ${settings.appLanguage}`} tone="default" />
        </Row>
      </Card>

      <SectionHeader title="프로필 수정" right={<Text style={styles.rightHint}>{t("자동 저장")}</Text>} />
      <Card style={styles.profileCard}>
        <View style={styles.profileBlock}>
          <Text style={styles.profileBlockTitle}>{t("계정")}</Text>
          <Text style={styles.mutedSmall}>{t("역할과 언어는 프로필 설정에서 함께 관리합니다.")}</Text>
          <Row style={{ marginTop: 12 }}>
            {([
              ["student", "학생"],
              ["teacher", "선생님"],
            ] as const).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => changeRole(key as UserRole)}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.role === key }}
                accessibilityLabel={t(label)}
                style={({ pressed }) => [styles.roleChip, settings.role === key && styles.roleChipOn, pressed && (settings.role === key ? PRESS_FEEDBACK.strong : PRESS_FEEDBACK.soft)]}
              >
                <Text style={styles.roleChipText}>{t(label)}</Text>
              </Pressable>
            ))}
          </Row>
          <Text style={styles.mutedSmall}>
            {isTeacher
              ? t("선생님 계정은 클래스, 단어 과제, 학생 진행 현황 중심으로 작동합니다.")
              : t("학생 계정은 학습 코스, 오답 복습, 선생님 과제를 중심으로 작동합니다.")}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileBlock}>
          <Text style={styles.profileBlockTitle}>{t("언어")}</Text>
          <View style={styles.chipWrap}>
            {languageOptions.map((language) => (
              <PillButton
                key={language.value}
                label={language.label}
                selected={settings.appLanguage === language.value}
                onPress={() => setSettings({ ...settings, appLanguage: language.value })}
              />
            ))}
          </View>
          <Text style={styles.languagePreview}>
            {isTeacher ? selectedLanguageOption?.teacherPreview : selectedLanguageOption?.preview}
          </Text>
          <Text style={styles.mutedSmall}>{t(languageDescription(settings.appLanguage))}</Text>
        </View>
      </Card>

      {isTeacher ? (
        <>
          <SectionHeader title="선생님 운영" right={<Text style={styles.rightHint}>{teacherAccountSummary.academyName}</Text>} />
          <Card style={styles.profileCard}>
            <View style={styles.teacherMetricGrid}>
              <View style={styles.teacherMetricCard}>
                <Text style={styles.teacherMetricValue}>{teacherAccountSummary.classCount}</Text>
                <Text style={styles.teacherMetricLabel}>{t("담당 반")}</Text>
              </View>
              <View style={styles.teacherMetricCard}>
                <Text style={styles.teacherMetricValue}>{teacherAccountSummary.studentCount}</Text>
                <Text style={styles.teacherMetricLabel}>{t("학생")}</Text>
              </View>
              <View style={styles.teacherMetricCard}>
                <Text style={styles.teacherMetricValue}>{teacherAccountSummary.activeAssignmentCount}</Text>
                <Text style={styles.teacherMetricLabel}>{t("진행 과제")}</Text>
              </View>
              <View style={styles.teacherMetricCard}>
                <Text style={styles.teacherMetricValue}>{teacherAccountSummary.avgCompletion}%</Text>
                <Text style={styles.teacherMetricLabel}>{t("평균 완료율")}</Text>
              </View>
            </View>
            <View style={styles.teacherClassList}>
              {teacherAccountSummary.classNames.slice(0, 4).map((className) => (
                <View key={className} style={styles.teacherClassChip}>
                  <Text style={styles.teacherClassChipText}>{t(className)}</Text>
                </View>
              ))}
            </View>
            <Row style={{ marginTop: 14 }}>
              <Pressable
                onPress={onTeacherOpenClasses}
                style={({ pressed }) => [styles.teacherActionBtn, pressed && PRESS_FEEDBACK.soft]}
                accessibilityRole="button"
                accessibilityLabel={t("클래스 관리")}
              >
                <Text style={styles.teacherActionText}>{t("클래스 관리")}</Text>
              </Pressable>
              <Pressable
                onPress={onTeacherOpenStatus}
                style={({ pressed }) => [styles.teacherActionBtn, pressed && PRESS_FEEDBACK.soft]}
                accessibilityRole="button"
                accessibilityLabel={t("과제 현황")}
              >
                <Text style={styles.teacherActionText}>{t("과제 현황")}</Text>
              </Pressable>
            </Row>
          </Card>

          <Card style={styles.profileCardGap}>
            <View style={styles.profileBlock}>
              <Text style={styles.profileBlockTitle}>{t("과제 기본 설정")}</Text>
              <Text style={styles.mutedSmall}>{t("새 과제를 만들 때 기본으로 참고하는 교사용 설정입니다.")}</Text>
              <View style={styles.teacherSettingRow}>
                <View>
                  <Text style={styles.itemTitle}>{t("기본 정답률")}</Text>
                  <Text style={styles.mutedSmall}>{t("학생이 과제를 완료 처리하기 위한 기준")}</Text>
                </View>
                <Text style={styles.teacherSettingValue}>80%</Text>
              </View>
              <View style={styles.teacherSettingRow}>
                <View>
                  <Text style={styles.itemTitle}>{t("기본 마감")}</Text>
                  <Text style={styles.mutedSmall}>{t("배포일 기준 권장 마감")}</Text>
                </View>
                <Text style={styles.teacherSettingValue}>{t("7일")}</Text>
              </View>
              <View style={styles.teacherSettingRow}>
                <View>
                  <Text style={styles.itemTitle}>{t("기본 공개")}</Text>
                  <Text style={styles.mutedSmall}>{t("단어 테스트는 수업 시작 30분 전부터 열립니다.")}</Text>
                </View>
                <Text style={styles.teacherSettingValue}>{t("30분 전")}</Text>
              </View>
              <Pressable
                onPress={onTeacherOpenDistribute}
                style={({ pressed }) => [styles.teacherPrimaryBtn, pressed && PRESS_FEEDBACK.strong]}
                accessibilityRole="button"
                accessibilityLabel={t("단어 과제 만들기")}
              >
                <Text style={styles.teacherPrimaryText}>{t("단어 과제 만들기")}</Text>
              </Pressable>
            </View>
          </Card>

          <Card style={styles.profileCardGap}>
            <View style={styles.profileBlock}>
              <Text style={styles.profileBlockTitle}>{t("선생님 권한")}</Text>
              <Text style={styles.noticeText}>{t("현재는 샘플 클래스와 로컬 과제 데이터로 동작합니다. 정식 출시 시 선생님 계정 승인, 학교/학원 소속 확인, 학생 개인정보 접근 권한을 서버에서 검증합니다.")}</Text>
              <View style={styles.teacherPermissionList}>
                {["반별 단어 과제 배포", "학생별 진행률 확인", "오답 유형 기반 보충 과제", "학생 데이터는 담당 반 기준으로 제한"].map((item) => (
                  <Text key={item} style={styles.teacherPermissionItem}>✓ {t(item)}</Text>
                ))}
              </View>
            </View>
          </Card>
        </>
      ) : (
        <>
          <Card style={styles.profileCardGap}>
            <View style={styles.profileBlock}>
              <Row style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={styles.profileBlockTitle}>{t("학습 코스")}</Text>
                <Pressable onPress={() => setCourseExpanded((prev) => !prev)} hitSlop={8}>
                  <Text style={styles.rightHint}>{t(courseExpanded ? "접기" : "전체보기")}</Text>
                </Pressable>
              </Row>
              <Pressable
                onPress={() => setCourseExpanded((prev) => !prev)}
                style={({ pressed }) => [styles.selectedPanel, pressed && PRESS_FEEDBACK.soft]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLabel}>{t("현재 선택")}</Text>
                  <Text style={styles.courseTitle}>{t(selectedCourse.title)}</Text>
                  <Text style={styles.courseSubtitle}>{t(selectedCourse.subtitle)}</Text>
                  <Text style={styles.mutedSmall}>{t(selectedCourse.description)}</Text>
                </View>
                <Text style={styles.expandMark}>{courseExpanded ? "⌃" : "⌄"}</Text>
              </Pressable>
              {courseExpanded ? (
                <View style={styles.courseGrid}>
                  {LEARNING_COURSES.map((course) => {
                    const selected = settings.learningCourse === course.id;
                    return (
                      <Pressable
                        key={course.id}
                        onPress={() => {
                          changeLearningCourse(course.id);
                        }}
                        style={({ pressed }) => [styles.courseCard, selected && styles.courseCardOn, pressed && (selected ? PRESS_FEEDBACK.strong : PRESS_FEEDBACK.soft)]}
                      >
                        <Text style={styles.courseTitle}>{t(course.title)}</Text>
                        <Text style={styles.courseSubtitle}>{t(course.subtitle)}</Text>
                        <Text style={styles.mutedSmall}>{t(course.description)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.divider} />

            <View style={styles.profileBlock}>
              <Row style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileBlockTitle}>{t("공부방법")}</Text>
                  <Text style={styles.mutedSmall}>
                    {t(selectedCourse.title)} · {t(courseProfile.settingSummary)}
                  </Text>
                </View>
                <Pressable onPress={() => setStyleExpanded((prev) => !prev)} hitSlop={8}>
                  <Text style={styles.rightHint}>{t(styleExpanded ? "접기" : "전체보기")}</Text>
                </Pressable>
              </Row>
              <Pressable
                onPress={() => setStyleExpanded((prev) => !prev)}
                style={({ pressed }) => [styles.selectedPanel, pressed && PRESS_FEEDBACK.soft]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLabel}>{t("현재 선택")}</Text>
                  <Text style={styles.styleTitle}>{t(settings.studyStyle)}</Text>
                  <Text style={styles.mutedSmall}>{t(courseStyleDescription(selectedCourse.id, settings.studyStyle))}</Text>
                </View>
                <Text style={styles.expandMark}>{styleExpanded ? "⌃" : "⌄"}</Text>
              </Pressable>
              {styleExpanded ? (
                <View style={styles.styleGrid}>
                  {stylesList.map((s) => {
                    const selected = settings.studyStyle === s;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setSettings({ ...settings, studyStyle: s });
                          setStyleExpanded(false);
                        }}
                        style={({ pressed }) => [styles.styleCard, selected && styles.styleCardOn, pressed && (selected ? PRESS_FEEDBACK.strong : PRESS_FEEDBACK.soft)]}
                      >
                        <Text style={styles.styleTitle}>{t(s)}</Text>
                        <Text style={styles.mutedSmall}>{t(courseStyleDescription(selectedCourse.id, s))}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </Card>

          <Card style={styles.profileCardGap}>
            <View style={styles.profileBlock}>
              <Row style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View>
                  <Text style={styles.profileBlockTitle}>{t("일일 단어 목표")}</Text>
                  <Text style={styles.rulerValue}>{dailyWordGoalValue}{t("개")}</Text>
                </View>
                <Text style={styles.rulerHint}>{courseProfile.dailyGoalMin}-{courseProfile.dailyGoalMax}{t("개")}</Text>
              </Row>
              <StepControl
                value={dailyWordGoalValue}
                min={courseProfile.dailyGoalMin}
                max={courseProfile.dailyGoalMax}
                step={10}
                suffix={t("개")}
                onChange={(dailyWordGoal) => setSettings({ ...settings, dailyWordGoal })}
              />
              <Text style={styles.mutedSmall}>{t(courseProfile.dailyGoalHelp)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.profileBlock}>
              <Text style={styles.profileBlockTitle}>{t(courseProfile.goalTitle)}</Text>
              {courseProfile.showEjuPlans ? (
                <>
                  <Text style={styles.mutedSmall}>{t(courseProfile.goalBody)}</Text>
                  <View style={styles.examPlanList}>
                    {ejuPlans.map((plan, planIndex) => (
                      <View key={plan.examDate} style={styles.examPlanCard}>
                        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.examPlanDate}>{plan.examDate}</Text>
                            <Text style={styles.mutedSmall}>{t("목표 점수")}</Text>
                          </View>
                          <Text style={styles.rulerValue}>{planScoreValue(plan)}{t("점")}</Text>
                        </Row>
                        <StepControl
                          value={planScoreValue(plan)}
                          min={180}
                          max={400}
                          step={10}
                          suffix={t("점")}
                          onChange={(score) => updateEjuPlan(planIndex, score)}
                        />
                        <Text style={styles.mutedSmall}>{t("가로로 밀어서 10점 단위로 조정합니다.")}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.noticeTitle}>{t(courseProfile.goalTitle)}</Text>
                  <Text style={styles.noticeText}>{t(courseProfile.goalBody)}</Text>
                </>
              )}
            </View>
          </Card>
        </>
      )}

      <SectionHeader title="알림" />
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{t(isTeacher ? "과제 알림" : "학습 알림")}</Text>
            <Text style={styles.mutedSmall}>{t(isTeacher ? "마감 전 리마인드와 제출 현황 알림은 백엔드 연결 후 지원 예정입니다." : "실제 알림은 백엔드 연결 후 지원 예정입니다.")}</Text>
          </View>
          <Switch value={settings.notificationOn} onValueChange={(v) => setSettings({ ...settings, notificationOn: v })} />
        </Row>
      </Card>

      <SectionHeader title="약관/프라이버시" />
      <Card>
        <Text style={styles.noticeTitle}>{t("서비스 이용약관")}</Text>
        <Text style={styles.noticeText}>{t("VocaRush는 학습 보조 앱이며, 시험 합격이나 특정 점수를 보장하지 않습니다. 사용자는 직접 추가한 단어와 학습 기록을 본인의 학습 목적으로 관리합니다.")}</Text>
        <View style={styles.divider} />
        <Text style={styles.noticeTitle}>{t("개인정보 처리방침")}</Text>
        <Text style={styles.noticeText}>{t("계정, 학습 기록, 직접 추가한 단어, 진단 결과는 학습 기능 제공과 동기화를 위해 사용됩니다. 사진 원본은 단어 추출 후 저장하지 않는 구조로 설계합니다.")}</Text>
        <View style={styles.divider} />
        <Text style={styles.noticeTitle}>{t("데이터 삭제")}</Text>
        <Text style={styles.noticeText}>{t("정식 출시 전까지는 앱 내 로그아웃과 로컬 데이터 초기화 중심의 프로토타입입니다. 출시 전 계정 삭제와 데이터 삭제 요청 흐름을 별도 연결합니다.")}</Text>
      </Card>

      <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOutBtn, pressed && PRESS_FEEDBACK.soft]} accessibilityRole="button" accessibilityLabel={t("로그아웃")}>
        <Text style={styles.signOutText}>{t("로그아웃")}</Text>
      </Pressable>

      <Modal visible={signOutConfirmOpen} transparent animationType="fade" onRequestClose={() => !signingOut && setSignOutConfirmOpen(false)}>
        <View style={styles.confirmDim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !signingOut && setSignOutConfirmOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("취소")}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t("로그아웃할까요?")}</Text>
            <Text style={styles.confirmBody}>{t("현재 계정에서 로그아웃합니다.")}</Text>
            <Row style={styles.confirmActions}>
              <Pressable
                disabled={signingOut}
                onPress={() => setSignOutConfirmOpen(false)}
                style={({ pressed }) => [styles.confirmCancelBtn, pressed && PRESS_FEEDBACK.soft, signingOut && { opacity: 0.55 }]}
                accessibilityRole="button"
                accessibilityLabel={t("취소")}
              >
                <Text style={styles.confirmCancelText}>{t("취소")}</Text>
              </Pressable>
              <Pressable
                disabled={signingOut}
                onPress={confirmSignOut}
                style={({ pressed }) => [styles.confirmDangerBtn, pressed && PRESS_FEEDBACK.soft, signingOut && { opacity: 0.65 }]}
                accessibilityRole="button"
                accessibilityLabel={t("로그아웃")}
              >
                <Text style={styles.confirmDangerText}>{signingOut ? t("로그아웃 중") : t("로그아웃")}</Text>
              </Pressable>
            </Row>
          </View>
        </View>
      </Modal>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  pageTitle: { color: COLORS.text, fontSize: TYPO.h1, fontWeight: "800" },
  autoSavePill: { minHeight: 36, borderRadius: 999, paddingHorizontal: 12, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, flexDirection: "row", alignItems: "center", gap: 7 },
  autoSaveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  autoSaveText: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.violet, justifyContent: "center", alignItems: "center" },
  avatarText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.logo },
  name: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2, marginTop: 10 },
  muted: { color: COLORS.muted, marginTop: 4, fontWeight: "700" },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  profileCard: { paddingVertical: 16 },
  profileCardGap: { marginTop: 10, paddingVertical: 16 },
  profileBlock: { gap: 8 },
  profileBlockTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  teacherMetricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  teacherMetricCard: {
    flexBasis: "48%",
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.card2,
    padding: 12,
    justifyContent: "center",
  },
  teacherMetricValue: { color: COLORS.text, fontWeight: "900", fontSize: 26, lineHeight: 32 },
  teacherMetricLabel: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small, marginTop: 3 },
  teacherClassList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  teacherClassChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.card2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  teacherClassChipText: { color: "#C7B8FF", fontWeight: "900", fontSize: TYPO.small },
  teacherActionBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.line,
    justifyContent: "center",
    alignItems: "center",
  },
  teacherActionText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  teacherSettingRow: {
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.card2,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  teacherSettingValue: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h2 },
  teacherPrimaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  teacherPrimaryText: { color: COLORS.text, fontWeight: "900" },
  teacherPermissionList: { gap: 8, marginTop: 10 },
  teacherPermissionItem: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small, lineHeight: TYPO.smallLine },
  roleChip: { flex: 1, backgroundColor: COLORS.card2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 10, minHeight: 44, alignItems: "center", justifyContent: "center" },
  roleChipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  roleChipText: { color: COLORS.text, fontWeight: "800" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { color: COLORS.muted, fontWeight: "800", marginBottom: 8 },
  textInput: { backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, minHeight: 52, paddingHorizontal: 12, color: COLORS.text, fontWeight: "700" },
  selectedPanel: { minHeight: 88, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  selectedLabel: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.micro, marginBottom: 5 },
  expandMark: { color: COLORS.muted, fontWeight: "900", fontSize: 24, width: 28, textAlign: "center" },
  courseGrid: { gap: 8, marginTop: 10 },
  courseCard: { minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, padding: 12 },
  courseCardOn: { borderColor: COLORS.blue, backgroundColor: "#10143C" },
  courseTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  courseSubtitle: { color: "#C7B8FF", fontWeight: "800", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  styleGrid: { gap: 8, marginTop: 10 },
  styleCard: { minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, padding: 12 },
  styleCardOn: { borderColor: COLORS.blue, backgroundColor: "#283075" },
  styleTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  selectorWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectorChip: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, paddingHorizontal: 14, justifyContent: "center" },
  selectorChipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  selectorText: { color: COLORS.text, fontWeight: "900" },
  goalScroll: { gap: 8, paddingRight: 8 },
  goalChip: { width: 58, height: 64, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, alignItems: "center", justifyContent: "center" },
  goalChipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  goalNumber: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  goalLabel: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small },
  examPlanList: { gap: 8, marginTop: 10 },
  examPlanCard: { minHeight: 116, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, padding: 12, gap: 10 },
  examPlanDate: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  rulerValue: { color: COLORS.text, fontWeight: "900", fontSize: 26 },
  rulerHint: { color: "#BCA8FF", fontWeight: "900", fontSize: TYPO.small },
  stepperBox: { marginTop: 4 },
  stepButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  stepButtonText: { color: COLORS.text, fontWeight: "900", fontSize: 24, lineHeight: 26 },
  sliderTrack: { flex: 1, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", overflow: "hidden", position: "relative" },
  sliderFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(76,91,255,0.42)" },
  sliderThumb: { position: "absolute", top: 9, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.text, borderWidth: 3, borderColor: COLORS.blue },
  stepInput: { width: 92, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.text, fontWeight: "900", fontSize: TYPO.h2, textAlign: "center" },
  stepSuffix: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  stepHelp: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small, marginLeft: "auto" },
  scoreRuler: { gap: 8, paddingRight: 8 },
  scoreChip: { width: 58, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, justifyContent: "center", alignItems: "center" },
  scoreChipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  scoreChipText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  languagePreview: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "800", marginTop: 8 },
  mutedSmall: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 10 },
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { flex: 1, minHeight: 52, borderRadius: RADII.card, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  rowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  divider: { height: 1, backgroundColor: COLORS.line, opacity: 0.55, marginVertical: 8 },
  chevron: { color: COLORS.muted, fontSize: 24, fontWeight: "800" },
  noticeTitle: { color: "#C7B8FF", fontWeight: "800", marginBottom: 6 },
  noticeText: { color: "#C5CBE8", lineHeight: TYPO.smallLine, fontSize: TYPO.small },
  signOutBtn: {
    minHeight: 52,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.red,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  signOutText: { color: COLORS.red, fontWeight: "800" },
  confirmDim: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "center", padding: 22 },
  confirmCard: { backgroundColor: COLORS.panel, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 18 },
  confirmTitle: { color: COLORS.text, fontSize: TYPO.h2, lineHeight: TYPO.h2Line, fontWeight: "900" },
  confirmBody: { color: COLORS.muted, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, marginTop: 8 },
  confirmActions: { marginTop: 18, justifyContent: "flex-end" },
  confirmCancelBtn: { flex: 1, minHeight: 50, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, justifyContent: "center", alignItems: "center" },
  confirmCancelText: { color: COLORS.text, fontWeight: "900" },
  confirmDangerBtn: { flex: 1, minHeight: 50, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.red, backgroundColor: "rgba(255,107,122,0.14)", justifyContent: "center", alignItems: "center" },
  confirmDangerText: { color: COLORS.red, fontWeight: "900" },
});
