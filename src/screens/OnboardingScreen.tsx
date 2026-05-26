import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Badge, Card, Row } from "../components/common";
import { COLORS, RADII, SPACING, TYPO } from "../theme";
import { SupabaseProfile, UserGoal, UserRole } from "../types";
import { getSafeErrorMessage, logInternalError } from "../utils/errors";
import { sanitizeText, validateRequiredText, validateUserProfile } from "../utils/validation";

type OnboardingStep = 0 | 1 | 2 | 3;

type OnboardingDraft = {
  name: string;
  role: UserRole;
  goal: UserGoal;
  current_level: string;
  customSubject: string;
  customLevel: string;
};

const stepTitles = ["이름", "역할", "학습 과목/시험", "현재 수준"] as const;

const goalOptions: Array<{ value: UserGoal; label: string; body: string }> = [
  { value: "EJU", label: "EJU", body: "일본 유학시험 과목·기출 단어" },
  { value: "JLPT", label: "JLPT", body: "급수별 일본어 어휘" },
  { value: "TOEIC", label: "TOEIC", body: "입시·취업 영어 시험 어휘" },
  { value: "TOEFL", label: "TOEFL", body: "대학 수업형 아카데믹 영어" },
  { value: "IELTS", label: "IELTS", body: "아카데믹 영어·스피킹 대비" },
  { value: "BusinessEnglish", label: "스타트업 영어", body: "PMF, 투자, 회의, 제안 표현" },
  { value: "BusinessJapanese", label: "비즈니스 일본어", body: "메일, 회의, 일정 조율 표현" },
  { value: "CampusJapanese", label: "대학생 일본어", body: "JLPT 밖 실사용 표현·신조어" },
  { value: "other", label: "기타", body: "직접 과목이나 시험을 입력" },
];

const levelOptionsByGoal: Record<UserGoal, string[]> = {
  EJU: ["처음 준비", "200점 목표", "300점 목표", "350+ 목표", "일본어 약함", "종합과목 약함", "직접 입력"],
  JLPT: ["N5", "N4", "N3", "N2", "N1", "급수 미정", "직접 입력"],
  TOEIC: ["입문", "500점대", "600점대", "700점대", "800점대", "900점 이상", "직접 입력"],
  TOEFL: ["처음 준비", "60점 목표", "80점 목표", "90점 이상", "Reading 약함", "Speaking 약함", "직접 입력"],
  IELTS: ["처음 준비", "5.5 목표", "6.0 목표", "6.5 목표", "7.0 이상", "Speaking 약함", "직접 입력"],
  BusinessEnglish: ["입문", "회의 표현", "메일 표현", "피치·투자", "스타트업 실무", "직접 입력"],
  BusinessJapanese: ["입문", "메일 표현", "회의 표현", "면접·인턴", "회사 실무", "직접 입력"],
  CampusJapanese: ["입문", "캠퍼스 회화", "신조어 이해", "SNS 표현", "친구 대화", "직접 입력"],
  other: ["직접 입력"],
};

const levelLabelByGoal: Record<UserGoal, string> = {
  EJU: "현재 준비 수준을 골라주세요",
  JLPT: "현재 급수를 골라주세요",
  TOEIC: "현재 점수대를 골라주세요",
  TOEFL: "현재 목표 점수와 약점을 골라주세요",
  IELTS: "현재 목표 밴드와 약점을 골라주세요",
  BusinessEnglish: "배우고 싶은 실무 영어 영역을 골라주세요",
  BusinessJapanese: "배우고 싶은 비즈니스 일본어 영역을 골라주세요",
  CampusJapanese: "배우고 싶은 실사용 일본어 영역을 골라주세요",
  other: "현재 수준을 입력해 주세요",
};

function firstLevelFor(goal: UserGoal) {
  return levelOptionsByGoal[goal][0];
}

function subjectLabel(goal: UserGoal, customSubject: string) {
  if (goal === "other") return customSubject.trim() || "기타";
  return goal;
}

export function OnboardingScreen({
  userEmail,
  userId,
  saving,
  error,
  onSubmit,
  onSignOut,
}: {
  userEmail?: string | null;
  userId: string;
  saving: boolean;
  error?: string | null;
  onSubmit: (profile: Omit<SupabaseProfile, "id" | "created_at" | "updated_at">) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [draft, setDraft] = useState<OnboardingDraft>({
    name: userEmail?.split("@")[0] || "",
    role: "student",
    goal: "EJU",
    current_level: firstLevelFor("EJU"),
    customSubject: "",
    customLevel: "",
  });
  const [touched, setTouched] = useState(false);

  const needsCustomSubject = draft.goal === "other";
  const needsCustomLevel = draft.goal === "other" || draft.current_level === "직접 입력";
  const selectedSubjectLabel = subjectLabel(draft.goal, draft.customSubject);
  const selectedLevelLabel = needsCustomLevel ? draft.customLevel.trim() : draft.current_level;

  const nameError = useMemo(() => {
    if (!touched && step !== 0) return "";
    const validation = validateRequiredText(draft.name, 40, "한국어", "이름을 입력해 주세요.");
    if (!validation.ok) return validation.message;
    if (validation.value.length < 2) return "이름은 2자 이상 입력해 주세요.";
    return "";
  }, [draft.name, step, touched]);

  const stepValid =
    step === 0
      ? draft.name.trim().length >= 2
      : step === 1
        ? Boolean(draft.role)
        : step === 2
          ? !needsCustomSubject || draft.customSubject.trim().length >= 2
          : !needsCustomLevel || draft.customLevel.trim().length >= 2;

  const canSubmit =
    !saving &&
    draft.name.trim().length >= 2 &&
    (!needsCustomSubject || draft.customSubject.trim().length >= 2) &&
    (!needsCustomLevel || draft.customLevel.trim().length >= 2) &&
    !!selectedLevelLabel;

  function next() {
    setTouched(true);
    if (!stepValid) return;
    setTouched(false);
    setStep((prev) => Math.min(3, prev + 1) as OnboardingStep);
  }

  function back() {
    if (saving) return;
    setTouched(false);
    setStep((prev) => Math.max(0, prev - 1) as OnboardingStep);
  }

  async function submit() {
    setTouched(true);
    if (!canSubmit) return;
    const normalizedLevel =
      draft.goal === "other"
        ? `${sanitizeText(selectedSubjectLabel, 40)} · ${sanitizeText(selectedLevelLabel, 80)}`
        : sanitizeText(selectedLevelLabel, 120);
    const profileValidation = validateUserProfile({ name: draft.name, current_level: normalizedLevel }, "한국어");
    if (!profileValidation.ok) return;

    await onSubmit({
      user_id: userId,
      name: profileValidation.value.name,
      role: draft.role,
      goal: draft.goal,
      current_level: profileValidation.value.current_level,
    });
  }

  function confirmSignOut() {
    Alert.alert("저장하지 않고 로그아웃할까요?", "입력 중인 프로필 설정은 저장되지 않습니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await onSignOut();
          } catch (error) {
            logInternalError(error, "Onboarding.signOut");
            Alert.alert("로그아웃", getSafeErrorMessage(error, "한국어"));
          }
        },
      },
    ]);
  }

  const primaryLabel = step < 3 ? "다음" : "VocaRush 시작하기";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Row style={styles.topRow}>
            <View>
              <Text style={styles.logo}>VocaRush</Text>
              <Text style={styles.subtitle}>처음 한 번만 설정하면 바로 학습을 시작할 수 있어요.</Text>
            </View>
            <Pressable onPress={confirmSignOut} disabled={saving} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="로그아웃">
              <Text style={styles.linkText}>로그아웃</Text>
            </Pressable>
          </Row>

          <View style={styles.progressWrap}>
            {stepTitles.map((title, index) => (
              <View key={title} style={styles.progressItem}>
                <View style={[styles.progressDot, index <= step && styles.progressDotActive]} />
                <Text style={[styles.progressText, index === step && styles.progressTextActive]}>{title}</Text>
              </View>
            ))}
          </View>

          <Card style={styles.heroCard}>
            <Badge label={`프로필 설정 ${step + 1}/4`} tone="blue" />
            <Text style={styles.title}>
              {step === 0
                ? "어떻게 불러드릴까요?"
                : step === 1
                  ? "어떤 방식으로 사용할까요?"
                  : step === 2
                    ? "무엇을 공부할까요?"
                    : levelLabelByGoal[draft.goal]}
            </Text>
            <Text style={styles.body}>
              {step === 0
                ? "홈 화면과 학습 기록에 표시될 이름입니다."
                : step === 1
                  ? "학생은 학습 중심, 선생님은 단어 세트 배포 중심으로 시작합니다."
                  : step === 2
                    ? "목표가 아니라 지금 공부할 과목이나 시험을 선택합니다."
                    : "선택한 시험에 맞는 수준만 보여드립니다. 맞는 항목이 없으면 직접 입력하세요."}
            </Text>
          </Card>

          {step === 0 ? (
            <View>
              <Text style={styles.label}>이름</Text>
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
                maxLength={40}
                onBlur={() => setTouched(true)}
                placeholder="예: Joon"
                placeholderTextColor={COLORS.dim}
                editable={!saving}
                autoFocus
                style={[styles.input, nameError && styles.inputError]}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <Text style={styles.label}>역할</Text>
              <View style={styles.stackedOptions}>
                {([
                  ["student", "학생", "단어 학습, 오답 복습, 선생님 과제 수행"],
                  ["teacher", "선생님", "단어 세트 배포, 반별 과제 현황 확인"],
                ] as const).map(([role, label, body]) => (
                  <Pressable
                    key={role}
                    onPress={() => setDraft((prev) => ({ ...prev, role }))}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.role === role }}
                    accessibilityLabel={label}
                    style={({ pressed }) => [
                      styles.optionCard,
                      draft.role === role && styles.optionCardActive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.optionTitle}>{label}</Text>
                    <Text style={styles.optionBody}>{body}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <Text style={styles.label}>학습 과목/시험</Text>
              <View style={styles.grid}>
                {goalOptions.map((goal) => (
                  <Pressable
                    key={goal.value}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        goal: goal.value,
                        current_level: firstLevelFor(goal.value),
                        customLevel: "",
                      }))
                    }
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.goal === goal.value }}
                    accessibilityLabel={goal.label}
                    style={({ pressed }) => [
                      styles.gridItem,
                      draft.goal === goal.value && styles.gridItemActive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.optionTitle}>{goal.label}</Text>
                    <Text style={styles.optionBody}>{goal.body}</Text>
                  </Pressable>
                ))}
              </View>

              {draft.goal === "other" ? (
                <>
                  <Text style={styles.label}>직접 입력</Text>
                  <TextInput
                    value={draft.customSubject}
                    onChangeText={(customSubject) => setDraft((prev) => ({ ...prev, customSubject }))}
                    maxLength={40}
                    placeholder="예: JPT, 일본어 회화, 중국어, 학교 내신"
                    placeholderTextColor={COLORS.dim}
                    editable={!saving}
                    style={styles.input}
                  />
                  {touched && draft.customSubject.trim().length < 2 ? (
                    <Text style={styles.errorText}>과목이나 시험명을 2자 이상 입력해 주세요.</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <Text style={styles.label}>{levelLabelByGoal[draft.goal]}</Text>
              <View style={styles.chipWrap}>
                {levelOptionsByGoal[draft.goal].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setDraft((prev) => ({ ...prev, current_level: level }))}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.current_level === level }}
                    accessibilityLabel={level}
                    style={({ pressed }) => [
                      styles.chip,
                      draft.current_level === level && styles.chipActive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={[styles.chipText, draft.current_level === level && styles.chipTextActive]}>{level}</Text>
                  </Pressable>
                ))}
              </View>

              {needsCustomLevel ? (
                <>
                  <TextInput
                    value={draft.customLevel}
                    onChangeText={(customLevel) => setDraft((prev) => ({ ...prev, customLevel }))}
                    maxLength={120}
                    placeholder={
                      draft.goal === "EJU"
                        ? "예: 종합과목은 약하고 일본어는 300점 목표"
                        : draft.goal === "JLPT"
                          ? "예: N2 공부 중, 한자는 약함"
                          : draft.goal === "TOEIC"
                            ? "예: 700점대 목표, LC 약함"
                            : draft.goal === "TOEFL"
                              ? "예: 80점 목표, Speaking Task 약함"
                              : draft.goal === "IELTS"
                                ? "예: 6.5 목표, Writing Task 2 약함"
                                : draft.goal === "BusinessEnglish"
                                  ? "예: 투자 미팅 표현과 SaaS 지표를 배우고 싶음"
                                  : draft.goal === "BusinessJapanese"
                                    ? "예: 인턴 면접과 메일 표현부터"
                                    : draft.goal === "CampusJapanese"
                                      ? "예: 대학 친구들이 쓰는 표현부터"
                            : "예: 입문, 중급, 시험 2개월 전"
                    }
                    placeholderTextColor={COLORS.dim}
                    editable={!saving}
                    style={[styles.input, styles.customLevelInput]}
                  />
                  {touched && draft.customLevel.trim().length < 2 ? (
                    <Text style={styles.errorText}>현재 수준을 2자 이상 입력해 주세요.</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {step === 3 ? (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>마지막 확인</Text>
              <Text style={styles.summaryText}>
                {[draft.name.trim(), draft.role === "student" ? "학생" : "선생님", selectedSubjectLabel, selectedLevelLabel || "수준 미입력"].filter(Boolean).join(" · ")}
              </Text>
            </Card>
          ) : null}

          {error ? <Text style={styles.submitError}>{error}</Text> : null}

          <View style={styles.footerRow}>
            {step > 0 ? (
              <Pressable
                onPress={back}
                disabled={saving}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.secondaryText}>이전</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={step < 3 ? next : submit}
              disabled={saving || !stepValid || (step === 3 && !canSubmit)}
              style={({ pressed }) => [
                styles.primaryBtn,
                (saving || !stepValid || (step === 3 && !canSubmit)) && styles.primaryBtnDisabled,
                pressed && stepValid && { opacity: 0.9 },
              ]}
            >
              {saving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.primaryText}>{primaryLabel}</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.pageX },
  scroll: { paddingTop: 22, paddingBottom: 56 },
  topRow: { justifyContent: "space-between", alignItems: "center" },
  logo: { color: COLORS.text, fontSize: TYPO.logo, fontWeight: "900" },
  subtitle: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  linkBtn: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  linkText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  progressWrap: { flexDirection: "row", gap: 8, marginTop: 22 },
  progressItem: { flex: 1 },
  progressDot: { height: 5, borderRadius: 999, backgroundColor: COLORS.lineSoft },
  progressDotActive: { backgroundColor: COLORS.blue },
  progressText: { color: COLORS.dim, fontSize: TYPO.micro, lineHeight: TYPO.microLine, marginTop: 7, fontWeight: "800" },
  progressTextActive: { color: COLORS.text },
  heroCard: { marginTop: 18, borderColor: "#4E56B8" },
  title: { color: COLORS.text, fontSize: TYPO.h1, lineHeight: TYPO.h1Line, fontWeight: "900", marginTop: 12 },
  body: { color: COLORS.muted, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, marginTop: 8 },
  label: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3, marginTop: 20, marginBottom: 10 },
  input: { minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.field, color: COLORS.text, paddingHorizontal: 14, fontWeight: "800" },
  customLevelInput: { marginTop: 12 },
  inputError: { borderColor: COLORS.red },
  errorText: { color: COLORS.red, fontSize: TYPO.small, marginTop: 7, fontWeight: "700" },
  stackedOptions: { gap: 10 },
  optionCard: { minHeight: 92, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card, padding: 14 },
  optionCardActive: { borderColor: COLORS.blue, backgroundColor: "#20275D" },
  optionTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  optionBody: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "48%", minHeight: 92, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card, padding: 14 },
  gridItemActive: { borderColor: COLORS.violet, backgroundColor: "#24225A" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card2, paddingHorizontal: 13, justifyContent: "center" },
  chipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  chipText: { color: COLORS.muted, fontWeight: "800" },
  chipTextActive: { color: COLORS.text },
  summaryCard: { marginTop: 20, padding: 14 },
  summaryLabel: { color: COLORS.dim, fontSize: TYPO.micro, lineHeight: TYPO.microLine, fontWeight: "900" },
  summaryText: { color: COLORS.text, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "800", marginTop: 5 },
  submitError: { color: COLORS.red, fontWeight: "800", lineHeight: TYPO.smallLine, marginTop: 18 },
  footerRow: { flexDirection: "row", gap: 10, marginTop: 22 },
  secondaryBtn: { minHeight: 56, flex: 0.42, borderRadius: 18, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft, justifyContent: "center", alignItems: "center" },
  secondaryText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  primaryBtn: { minHeight: 56, flex: 1, borderRadius: 18, backgroundColor: COLORS.blue, justifyContent: "center", alignItems: "center" },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
});
