import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Card, PillButton, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { AcademyClass, StudySet, VocabItem, VocabularyAssignment } from "../types";
import { createImmediateAssignmentAvailability, createPreClassTestAvailability, formatClassSchedule, getAssignmentAvailability } from "../utils/assignmentAvailability";
import { sanitizeText, validateDateString, validateNumberRange, validateRequiredText } from "../utils/validation";

type AssignMode =
  | "기존 단어세트 배포"
  | "단어 직접 선택"
  | "단어 직접 입력"
  | "오답 기반 자동 추천 세트"
  | "유형별 추천 세트";

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

function seeded01(seed: number) {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function TeacherDistributeScreen({
  classes,
  studySets,
  vocab,
  prefillClassId,
  onBack,
  onAssign,
}: {
  classes: AcademyClass[];
  studySets: StudySet[];
  vocab: VocabItem[];
  prefillClassId: string | null;
  onBack: () => void;
  onAssign: (assignment: VocabularyAssignment) => void;
}) {
  const { t, tm, language } = useI18n();
  const [classId, setClassId] = useState(prefillClassId || classes[0]?.id || "");
  const [mode, setMode] = useState<AssignMode>("기존 단어세트 배포");

  const builtinSets = useMemo(
    () =>
      studySets.filter((s) =>
        [
          "set_recent_eju_2016_2025",
          "set_top100",
          "set_300",
          "set_reason",
          "set_reading_context",
          "set_reading_relation",
          "set_table",
          "set_listening_notice",
          "set_writing",
          "set_economy",
          "set_geography",
          "set_geo_skills",
          "set_geo_climate_resources",
          "set_geo_population_city",
          "set_world_history_textbook",
          "set_modern_world_history",
          "set_contemporary_history",
          "set_market_price",
          "set_income_cycle",
          "set_financial_policy",
          "set_fiscal_policy",
          "set_international_trade",
          "set_international_economy_system",
          "set_politics_textbook",
          "set_democracy_rights",
          "set_local_autonomy",
          "set_international_society",
          "set_un_peace",
          "set_modern_society",
          "set_environment_global",
          "set_highlight",
          "set_wrong",
        ].includes(s.id)
      ),
    [studySets]
  );

  const [selectedSetId, setSelectedSetId] = useState(builtinSets[0]?.id || "");
  const [search, setSearch] = useState("");
  const [selectedWordIds, setSelectedWordIds] = useState<Record<string, boolean>>({});

  const [customWord, setCustomWord] = useState({
    word: "",
    reading: "",
    meaningKo: "",
    category: "기술문",
    level: "300점 목표",
    questionType: "근거 찾기",
    exampleJa: "",
  });

  const [settings, setSettings] = useState({
    title: "",
    dueDate: "",
    requiredAccuracy: 80,
    teacherMemo: "매일 15분씩 진행해보세요.",
    dailyReminder: false,
    allowAfterDue: true,
    releaseMode: "수업 30분 전 공개" as VocabularyAssignment["releaseMode"],
  });

  const cls = useMemo(() => classes.find((c) => c.id === classId) || classes[0], [classes, classId]);
  const releasePreview = useMemo(() => {
    if (!cls) return null;
    const availability =
      settings.releaseMode === "수업 30분 전 공개"
        ? getAssignmentAvailability({ ...createPreClassTestAvailability(cls), id: "preview", title: "", classId: cls.id, wordIds: [], dueDate: "", requiredAccuracy: 80, teacherMemo: "", createdBy: "", statusByStudent: {}, progressByStudent: {}, accuracyByStudent: {} })
        : getAssignmentAvailability({ ...createImmediateAssignmentAvailability(), id: "preview", title: "", classId: cls.id, wordIds: [], dueDate: "", requiredAccuracy: 80, teacherMemo: "", createdBy: "", statusByStudent: {}, progressByStudent: {}, accuracyByStudent: {} });
    return availability;
  }, [cls, settings.releaseMode]);

  const filteredVocab = useMemo(() => {
    const q = search.trim();
    const base = vocab.slice(0, 220);
    if (!q) return base;
    const qLower = q.toLowerCase();
    return base.filter(
      (v) =>
        v.word.includes(q) ||
        v.reading.toLowerCase().includes(qLower) ||
        v.meaningKo.includes(q) ||
        v.questionTypes.some((t) => t.includes(q))
    );
  }, [vocab, search]);

  function toggleWord(id: string) {
    setSelectedWordIds((p) => ({ ...p, [id]: !p[id] }));
  }

  function makeDefaultTitle(): string {
    if (!cls) return "단어 과제";
    if (mode === "기존 단어세트 배포") {
      const s = builtinSets.find((x) => x.id === selectedSetId);
      return s ? `${cls.name} ${s.title}` : `${cls.name} 단어 과제`;
    }
    if (mode === "유형별 추천 세트") return `${cls.name} 유형별 빈출어`;
    if (mode === "오답 기반 자동 추천 세트") return `${cls.name} 오답 기반 세트`;
    if (mode === "단어 직접 입력") return `${cls.name} 선생님 입력 단어`;
    return `${cls.name} 선택 단어 과제`;
  }

  function collectWordIds(): string[] {
    if (mode === "기존 단어세트 배포") {
      const s = studySets.find((x) => x.id === selectedSetId);
      return s?.wordIds.slice(0, 80) || [];
    }
    if (mode === "오답 기반 자동 추천 세트") {
      return vocab
        .filter((v) => v.cumulativeWrongAttempts > 0 || v.recentWrongAttempts7d > 0)
        .slice()
        .sort((a, b) => b.recentWrongAttempts7d - a.recentWrongAttempts7d || b.cumulativeWrongAttempts - a.cumulativeWrongAttempts)
        .slice(0, 60)
        .map((v) => v.id);
    }
    if (mode === "유형별 추천 세트") {
      const type = "근거 찾기";
      return vocab
        .filter((v) => v.questionTypes.includes(type))
        .slice()
        .sort((a, b) => b.frequencyScore - a.frequencyScore)
        .slice(0, 60)
        .map((v) => v.id);
    }
    if (mode === "단어 직접 선택") {
      return Object.entries(selectedWordIds)
        .filter(([, v]) => v)
        .map(([k]) => k);
    }
    // direct input creates teacher custom word set: for prototype just reuse a few vocab words
    return vocab.slice(0, 20).map((v) => v.id);
  }

  function assign() {
    const wordIds = collectWordIds();
    if (!cls) {
      Alert.alert(t("반 선택"), t("클래스를 선택해 주세요."));
      return;
    }
    if (!wordIds.length) {
      Alert.alert(t("단어"), t("배포할 단어를 선택해 주세요."));
      return;
    }

    const now = new Date();
    const dueValidation = validateDateString(settings.dueDate, language, false);
    if (!dueValidation.ok) {
      Alert.alert(t("마감일"), dueValidation.message);
      return;
    }

    const accuracyValidation = validateNumberRange(settings.requiredAccuracy, 50, 95, language);
    if (!accuracyValidation.ok) {
      Alert.alert(t("필수 정답률"), accuracyValidation.message);
      return;
    }

    const titleValidation = validateRequiredText(settings.title || makeDefaultTitle(), 80, language);
    if (!titleValidation.ok) {
      Alert.alert(t("제목"), titleValidation.message);
      return;
    }

    const due = dueValidation.value
      ? dueValidation.value
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate() + 1).padStart(2, "0")} 18:00`;

    const title = titleValidation.value;
    const availabilityFields =
      settings.releaseMode === "수업 30분 전 공개" && cls
        ? createPreClassTestAvailability(cls, now)
        : createImmediateAssignmentAvailability();
    const a: VocabularyAssignment = {
      id: `asmt_${Date.now()}`,
      title,
      classId: cls.id,
      wordIds: wordIds.slice(0, 120),
      ...availabilityFields,
      dueDate: due,
      requiredAccuracy: accuracyValidation.value,
      teacherMemo: sanitizeText(settings.teacherMemo, 300),
      createdBy: "EJUEDU 선생님",
      statusByStudent: {},
      progressByStudent: {},
      accuracyByStudent: {},
    };

    for (const sid of cls.studentIds) {
      a.statusByStudent[sid] = "미시작";
      a.progressByStudent[sid] = 0;
      a.accuracyByStudent[sid] = 0;
    }

    onAssign(a);

    Alert.alert(t("배포 완료"), `${t(cls.name)}${t("에 단어 과제를 배포했습니다.")}`);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack title={t("단어 배포")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>1) {t("반 선택")}</Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          {classes.map((c) => (
            <PillButton
              key={c.id}
              label={c.name}
              selected={classId === c.id}
              onPress={() => setClassId(c.id)}
            />
          ))}
        </Row>
        {cls ? (
          <Text style={styles.muted}>{t("수업 시간")}: {formatClassSchedule(cls)}</Text>
        ) : null}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>2) {t("배포 방식")}</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {(
            [
              "기존 단어세트 배포",
              "단어 직접 선택",
              "단어 직접 입력",
              "오답 기반 자동 추천 세트",
              "유형별 추천 세트",
            ] as AssignMode[]
          ).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={({ pressed }) => [styles.choice, mode === m && styles.choiceOn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.choiceText}>{t(m)}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {mode === "기존 단어세트 배포" ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.hero}>3) {t("세트 선택")}</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {builtinSets.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSelectedSetId(s.id)}
                style={({ pressed }) => [styles.choice, selectedSetId === s.id && styles.choiceOn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.choiceText}>{t(s.title)}</Text>
                <Text style={styles.muted}>{t("단어")} {s.wordCount}{t("개")}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {mode === "단어 직접 선택" ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.hero}>3) {t("단어 직접 선택")}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("단어/뜻/독음/유형 검색")}
            placeholderTextColor="#7B82A6"
            style={styles.textInput}
          />
          <Text style={styles.muted}>{t("선택된 단어")}: {Object.values(selectedWordIds).filter(Boolean).length}{t("개")}</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {filteredVocab.slice(0, 30).map((v) => {
              const on = !!selectedWordIds[v.id];
              return (
                <Pressable
                  key={v.id}
                  onPress={() => toggleWord(v.id)}
                  style={({ pressed }) => [styles.pickRow, on && styles.pickRowOn, pressed && { opacity: 0.9 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{v.word}</Text>
                    <Text style={styles.muted}>{v.reading} · {tm(v.meaningKo)}</Text>
                  </View>
                  <Badge label={on ? t("선택됨") : t("선택")} tone={on ? "blue" : "default"} />
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {mode === "단어 직접 입력" ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.hero}>3) {t("단어 직접 입력")} ({t("데모")})</Text>
          <Text style={styles.muted}>{t("프로토타입: 입력한 단어는 “선생님 세트”로 저장되는 흐름만 데모합니다.")}</Text>
          <TextInput
            value={customWord.word}
            onChangeText={(t) => setCustomWord((p) => ({ ...p, word: t }))}
            placeholder={t("일본어 단어")}
            placeholderTextColor="#7B82A6"
            style={styles.textInput}
          />
          <TextInput
            value={customWord.reading}
            onChangeText={(t) => setCustomWord((p) => ({ ...p, reading: t }))}
            placeholder={t("독음")}
            placeholderTextColor="#7B82A6"
            style={styles.textInput}
          />
          <TextInput
            value={customWord.meaningKo}
            onChangeText={(t) => setCustomWord((p) => ({ ...p, meaningKo: t }))}
            placeholder={t("한국어 뜻")}
            placeholderTextColor="#7B82A6"
            style={styles.textInput}
          />
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => Alert.alert(t("단어 추가"), t("단어 직접 입력 데모: 실제 저장은 로컬 상태로 확장 예정입니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("단어 추가")}</Text>
          </Pressable>
        </Card>
      ) : null}

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.hero}>4) {t("과제 설정")}</Text>
        <Text style={styles.settingLabel}>{t("공개 방식")}</Text>
        <Row style={{ marginTop: 8, flexWrap: "wrap" }}>
          <PillButton
            label="수업 30분 전 공개"
            selected={settings.releaseMode === "수업 30분 전 공개"}
            onPress={() => setSettings((p) => ({ ...p, releaseMode: "수업 30분 전 공개" }))}
          />
          <PillButton
            label="즉시 공개"
            selected={settings.releaseMode === "즉시 공개"}
            onPress={() => setSettings((p) => ({ ...p, releaseMode: "즉시 공개" }))}
          />
        </Row>
        <View style={styles.releaseBox}>
          <Text style={styles.releaseTitle}>
            {t(settings.releaseMode === "수업 30분 전 공개" ? "수업 전 단어 테스트" : "일반 단어 과제")}
          </Text>
          <Text style={styles.muted}>
            {settings.releaseMode === "수업 30분 전 공개"
              ? t("학생 화면에는 잠금 상태로 보이고, 수업 시작 30분 전부터 테스트 버튼이 열립니다.")
              : t("배포 직후 학생이 바로 학습을 시작할 수 있습니다.")}
          </Text>
          {releasePreview ? (
            <Text style={styles.mutedSmall}>
              {t("공개")}: {releasePreview.availableLabel}
              {releasePreview.classStartLabel ? ` · ${t("수업")} ${releasePreview.classStartLabel}` : ""}
            </Text>
          ) : null}
        </View>
        <TextInput
          value={settings.title}
          onChangeText={(t) => setSettings((p) => ({ ...p, title: t }))}
          maxLength={80}
          placeholder={`${t("제목")} (${t("기본")}: ${t(makeDefaultTitle())})`}
          placeholderTextColor="#7B82A6"
          style={styles.textInput}
        />
        <TextInput
          value={settings.dueDate}
          onChangeText={(t) => setSettings((p) => ({ ...p, dueDate: t }))}
          maxLength={40}
          placeholder={`${t("마감일")} (${t("예")}: 2026-05-09 18:00)`}
          placeholderTextColor="#7B82A6"
          style={styles.textInput}
        />
        <TextInput
          value={String(settings.requiredAccuracy)}
          onChangeText={(t) =>
            setSettings((p) => ({
              ...p,
              requiredAccuracy: Math.max(50, Math.min(95, Number(t.replace(/[^0-9]/g, "")) || p.requiredAccuracy)),
            }))
          }
          placeholder={`${t("필수 정답률")}(%)`}
          placeholderTextColor="#7B82A6"
          style={styles.textInput}
          keyboardType="number-pad"
        />
        <TextInput
          value={settings.teacherMemo}
          onChangeText={(t) => setSettings((p) => ({ ...p, teacherMemo: t }))}
          maxLength={300}
          placeholder={t("선생님 메모")}
          placeholderTextColor="#7B82A6"
          style={styles.textInput}
        />

        <Row style={{ marginTop: 12 }}>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => Alert.alert(t("리마인드"), t("리마인드 전송 데모: 실제 푸시는 백엔드 연결 후 지원됩니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("리마인드")}({t("데모")})</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => Alert.alert(t("옵션"), t("마감 이후 복습 허용 등 옵션은 프로토타입에서 고정입니다."))}
          >
            <Text style={styles.secondaryBtnText}>{t("옵션")}({t("데모")})</Text>
          </Pressable>
        </Row>
      </Card>

      <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={assign}>
        <Text style={styles.primaryBtnText}>{t("클래스에 배포")}</Text>
      </Pressable>

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
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  mutedSmall: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 10 },
  settingLabel: { color: COLORS.text, fontWeight: "900", marginTop: 12 },
  releaseBox: { backgroundColor: COLORS.card2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 12, marginTop: 10 },
  releaseTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  choice: { backgroundColor: COLORS.card2, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 14 },
  choiceOn: { borderColor: COLORS.blue, backgroundColor: "#10143C" },
  choiceText: { color: COLORS.text, fontWeight: "800" },
  textInput: { backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, minHeight: 52, paddingHorizontal: 12, color: COLORS.text, fontWeight: "700", marginTop: 10 },
  pickRow: { backgroundColor: COLORS.card2, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  pickRowOn: { borderColor: COLORS.blue },
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 16, minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line, marginTop: 10 },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
});
