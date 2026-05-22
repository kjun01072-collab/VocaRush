import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Badge, Card, PillButton, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AppLanguage, StudentSettings, StudyStyle, UserRole } from "../types";

function styleDescription(style: StudyStyle) {
  if (style === "균형형") return "낱말카드/퀴즈/예문/복습을 균형 있게 섞습니다.";
  if (style === "빠른 암기형") return "더 많은 낱말카드, 빠른 반복, 짧은 설명 중심.";
  if (style === "문제풀이형") return "뜻/유형 퀴즈를 우선으로 학습합니다.";
  if (style === "예문중심형") return "예문 빈칸을 우선으로 학습합니다.";
  if (style === "오답집중형") return "오답 단어와 리뷰 큐부터 먼저 복습합니다.";
  return "기출 출현 빈도가 높은 단어부터 학습합니다.";
}

const languageOptions: Array<{ value: AppLanguage; label: string; preview: string }> = [
  { value: "한국어", label: "한국어", preview: "오늘 학습 시작" },
  { value: "日本語", label: "日本語", preview: "今日の学習を始める" },
  { value: "中文", label: "中文", preview: "开始今天的学习" },
  { value: "English", label: "English", preview: "Start today’s study" },
];

function languageDescription(language: AppLanguage) {
  if (language === "日本語") return "일본어 UI 데모 모드입니다. 학습 데이터와 단어 정보는 그대로 유지됩니다.";
  if (language === "中文") return "중국어 UI 데모 모드입니다. 학습 데이터와 단어 정보는 그대로 유지됩니다.";
  if (language === "English") return "영어 UI 데모 모드입니다. 학습 데이터와 단어 정보는 그대로 유지됩니다.";
  return "기본 한국어 UI입니다.";
}

export function MyScreen({
  studentName,
  settings,
  setSettings,
  onOpenHighlight,
  onOpenDiagnostic,
  onOpenReport,
  onOpenClass,
  onSignOut,
}: {
  studentName: string;
  settings: StudentSettings;
  setSettings: (s: StudentSettings) => void;
  onOpenHighlight: () => void;
  onOpenDiagnostic: () => void;
  onOpenReport: () => void;
  onOpenClass: () => void;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [examDraft, setExamDraft] = useState(settings.examDate);
  const [goalDraft, setGoalDraft] = useState(String(settings.dailyWordGoal));

  const stylesList: StudyStyle[] = [
    "균형형",
    "빠른 암기형",
    "문제풀이형",
    "예문중심형",
    "오답집중형",
    "기출빈도형",
  ];

  function saveBasics() {
    const goal = Math.max(5, Math.min(200, Number(goalDraft.replace(/[^0-9]/g, "")) || settings.dailyWordGoal));
    setSettings({ ...settings, examDate: examDraft.trim() || settings.examDate, dailyWordGoal: goal });
    Alert.alert(t("저장"), t("설정이 저장되었습니다."));
  }

  async function handleSignOut() {
    try {
      await onSignOut();
    } catch (error) {
      Alert.alert(t("로그아웃"), error instanceof Error ? error.message : t("로그아웃 중 문제가 발생했습니다."));
    }
  }

  const roleLabel = settings.role === "student" ? t("학생") : t("선생님");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.pageTitle}>{t("마이")}</Text>
        <Pressable onPress={saveBasics} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.saveBtnText}>{t("저장")}</Text>
        </Pressable>
      </Row>

      <Card style={{ marginTop: 12, alignItems: "center" }}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(studentName[0] || "V").toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{studentName}</Text>
        <Text style={styles.muted}>{t("목표")} {t(settings.targetScore)} · {t("시험")} {settings.examDate}</Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Badge label={`${t("역할")}: ${roleLabel}`} tone="violet" />
          <Badge label={`${t("공부방법")}: ${t(settings.studyStyle)}`} tone="default" />
          <Badge label={`${t("언어")}: ${settings.appLanguage}`} tone="default" />
        </Row>
      </Card>

      <SectionHeader title="언어 설정" />
      <Card>
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
          {languageOptions.find((language) => language.value === settings.appLanguage)?.preview}
        </Text>
        <Text style={styles.mutedSmall}>{t(languageDescription(settings.appLanguage))}</Text>
      </Card>

      <SectionHeader title="역할 전환" right={<Text style={styles.rightHint}>EJUEDU</Text>} />
      <Card>
        <Row>
          {([
            ["student", "학생"],
            ["teacher", "선생님"],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setSettings({ ...settings, role: key as UserRole })}
              style={({ pressed }) => [styles.roleChip, settings.role === key && styles.roleChipOn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.roleChipText}>{t(label)}</Text>
            </Pressable>
          ))}
        </Row>
        <Text style={styles.mutedSmall}>
          {t("선생님 모드는 단어 과제 배포/현황 확인만 지원합니다. (모의고사 채점, 숙제 제출 관리 없음)")}
        </Text>
      </Card>

      <SectionHeader title="공부방법 설정" />
      <Card>
        <View style={styles.chipWrap}>
          {stylesList.map((s) => (
            <PillButton
              key={s}
              label={s}
              selected={settings.studyStyle === s}
              onPress={() => setSettings({ ...settings, studyStyle: s })}
            />
          ))}
        </View>
        <Text style={styles.mutedSmall}>{t(styleDescription(settings.studyStyle))}</Text>
      </Card>

      <SectionHeader title="목표/일정" />
      <Card>
        <Text style={styles.label}>{t("시험 일정")}</Text>
        <TextInput
          value={examDraft}
          onChangeText={setExamDraft}
          placeholder={t("예: 2026.06 EJU")}
          placeholderTextColor="#7B82A6"
          style={styles.textInput}
        />
        <Text style={[styles.label, { marginTop: 14 }]}>{t("일일 단어 목표")}</Text>
        <TextInput
          value={goalDraft}
          onChangeText={setGoalDraft}
          keyboardType="number-pad"
          placeholder={t("예: 30")}
          placeholderTextColor="#7B82A6"
          style={styles.textInput}
        />
        <Text style={styles.mutedSmall}>{t("권장")}: 20-40{t("개")} ({t("복습 포함")})</Text>
      </Card>

      <SectionHeader title="알림" />
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{t("학습 알림")}</Text>
            <Text style={styles.mutedSmall}>{t("실제 알림은 백엔드 연결 후 지원 예정입니다.")}</Text>
          </View>
          <Switch value={settings.notificationOn} onValueChange={(v) => setSettings({ ...settings, notificationOn: v })} />
        </Row>
      </Card>

      <SectionHeader title="바로가기" />
      <Card>
        <Pressable onPress={onOpenHighlight} style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.itemTitle}>{t("형광펜 단어 추가")}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable onPress={onOpenDiagnostic} style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.itemTitle}>{t("단어 진단 테스트")}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable onPress={onOpenReport} style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.itemTitle}>{t("리포트")}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable onPress={onOpenClass} style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{t("클래스")}</Text>
            <Text style={styles.mutedSmall}>{t("EJUEDU 연결 및 과제 확인")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Card>

      <SectionHeader title="기출 단어 데이터 가져오기" />
      <Card>
        <Text style={styles.mutedSmall}>
          {t("예상 컬럼")}: word, reading, meaningKo, year, session, subject, part, questionType, questionNumber, difficulty, synonym, relatedWords, example
        </Text>
        <Row style={{ marginTop: 12 }}>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => Alert.alert(t("CSV 가져오기 데모"), t("실제 데이터 import는 백엔드 연결 후 지원 예정입니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("CSV 가져오기 데모")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => Alert.alert(t("JSON 가져오기 데모"), t("실제 데이터 import는 백엔드 연결 후 지원 예정입니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("JSON 가져오기 데모")}</Text>
          </Pressable>
        </Row>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.noticeTitle}>{t("프라이버시")}</Text>
        <Text style={styles.noticeText}>{t("사진 원본은 단어 추출 후 저장하지 않는 구조로 설계됩니다.")}</Text>
      </Card>

      <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.9 }]}>
        <Text style={styles.signOutText}>{t("로그아웃")}</Text>
      </Pressable>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  pageTitle: { color: COLORS.text, fontSize: TYPO.h1, fontWeight: "800" },
  saveBtn: { backgroundColor: COLORS.blue, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  saveBtnText: { color: COLORS.text, fontWeight: "800" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.violet, justifyContent: "center", alignItems: "center" },
  avatarText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.logo },
  name: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2, marginTop: 10 },
  muted: { color: COLORS.muted, marginTop: 4, fontWeight: "700" },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
  roleChip: { flex: 1, backgroundColor: COLORS.card2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 10, alignItems: "center" },
  roleChipOn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  roleChipText: { color: COLORS.text, fontWeight: "800" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { color: COLORS.muted, fontWeight: "800", marginBottom: 8 },
  textInput: { backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, minHeight: 52, paddingHorizontal: 12, color: COLORS.text, fontWeight: "700" },
  languagePreview: { color: COLORS.text, fontSize: TYPO.h3, fontWeight: "800", marginTop: 14 },
  mutedSmall: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 10 },
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { flex: 1, minHeight: 52, borderRadius: RADII.card, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  rowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  divider: { height: 1, backgroundColor: COLORS.line, opacity: 0.7, marginVertical: 10 },
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
});
