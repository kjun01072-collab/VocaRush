import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { DiagnosticResult, StudySet, VocabItem, WeakTypeStat } from "../types";

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

export function ReportScreen({
  vocab,
  studiedTodayIds,
  reviewQueueIds,
  generatedSets,
  weakTop3,
  latestDiagnostic,
  onBack,
}: {
  vocab: VocabItem[];
  studiedTodayIds: string[];
  reviewQueueIds: string[];
  generatedSets: StudySet[];
  weakTop3: WeakTypeStat[];
  latestDiagnostic: DiagnosticResult | null;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const byId = useMemo(() => new Map(vocab.map((v) => [v.id, v] as const)), [vocab]);

  const studiedToday = studiedTodayIds.map((id) => byId.get(id)).filter(Boolean) as VocabItem[];
  const mastered = vocab.filter((v) => v.reviewStatus === "Mastered").length;
  const wrongWords = vocab.filter((v) => v.wrongCount > 0).length;
  const highlightWords = vocab.filter((v) => v.sourceType === "형광펜").length;

  const top100Covered = useMemo(() => {
    const top100 = vocab
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore || b.occurrenceCount - a.occurrenceCount)
      .slice(0, 100);
    const done = top100.filter((v) => v.masteryLevel >= 60).length;
    return { done, total: 100, pct: Math.round((done / 100) * 100) };
  }, [vocab]);

  const coverage = useMemo(() => {
    const byType = (typeName: string) => {
      const pool = vocab.filter((v) => v.questionTypes.includes(typeName));
      if (!pool.length) return { typeName, pct: 0 };
      const done = pool.filter((v) => v.masteryLevel >= 60).length;
      return { typeName, pct: Math.round((done / pool.length) * 100) };
    };
    return [
      byType("근거 찾기"),
      byType("자료형"),
      byType("경제"),
    ];
  }, [vocab]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} stickyHeaderIndices={[0]}>
      <TopBack title={t("리포트")} onBack={onBack} />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.heroTitle}>{t("오늘 학습 요약")}</Text>
        <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Badge label={`${t("오늘")} ${t("학습")} ${studiedToday.length}${t("개")}`} tone="blue" />
          <Badge label={`${t("리뷰 큐")} ${reviewQueueIds.length}${t("개")}`} tone="default" />
          <Badge label={`${t("마스터")} ${mastered}${t("개")}`} tone="gold" />
          <Badge label={`${t("오답 대상")} ${wrongWords}${t("개")}`} tone="danger" />
        </Row>
        <Text style={styles.muted}>{t("숫자는 로컬 더미 기록을 기반으로 계산됩니다.")}</Text>
      </Card>

      <SectionHeader title="커버리지" />
      <Card>
        <Text style={styles.itemTitle}>{t("기출 상위 100단어")}</Text>
        <Text style={styles.muted}>{t("학습 완료")} {top100Covered.done}/{top100Covered.total}</Text>
        <View style={{ marginTop: 10 }}>
          <ProgressBar value={top100Covered.pct} />
        </View>
        <View style={{ marginTop: 14, gap: 12 }}>
          {coverage.map((c) => (
            <View key={c.typeName}>
              <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.itemTitle}>{t(c.typeName)} {t("커버리지")}</Text>
                <Text style={styles.muted}>{c.pct}%</Text>
              </Row>
              <View style={{ marginTop: 8 }}>
                <ProgressBar value={c.pct} />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="약한 유형" right={<Text style={styles.rightHint}>TOP 3</Text>} />
      {weakTop3.length ? (
        <View style={{ gap: 10 }}>
          {weakTop3.map((s) => (
            <Card key={s.typeName}>
              <Text style={styles.itemTitle}>{t(s.typeName)}</Text>
              <Text style={styles.muted}>
                {t("정답률")} {s.accuracy}% · {s.attempts}{t("문제")} · {t("오답")} {s.wrongAttempts}{t("회")}
              </Text>
              <View style={{ marginTop: 10 }}>
                <ProgressBar value={s.accuracy} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("학습 기록이 쌓이면 약한 유형을 보여줍니다.")}</Text>
        </Card>
      )}

      <SectionHeader title="최근 형광펜 단어" />
      <Card>
        <Text style={styles.muted}>{t("형광펜")} {t("단어")} {highlightWords}{t("개")}</Text>
        <Text style={styles.muted}>{t("미암기")} 9{t("개")} ({t("데모")})</Text>
      </Card>

      <SectionHeader title="생성된 약점 세트" />
      {generatedSets.length ? (
        <View style={{ gap: 10 }}>
          {generatedSets.slice(0, 6).map((s) => (
            <Card key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{t(s.title)}</Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {t(s.description)}
                </Text>
                <Text style={styles.muted}>{t("단어")} {s.wordCount}{t("개")}</Text>
              </View>
              <Badge label={t(s.createdFrom === "diagnostic" ? "진단" : "오답")} tone="violet" />
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("진단/테스트 결과로 약점 세트가 자동 생성됩니다.")}</Text>
        </Card>
      )}

      <SectionHeader title="최근 진단 결과" />
      {latestDiagnostic ? (
        <Card>
          <Text style={styles.itemTitle}>{t(latestDiagnostic.testType)}</Text>
          <Text style={styles.muted}>
            {t("정답률")} {latestDiagnostic.accuracy}% · {latestDiagnostic.correctCount}/{latestDiagnostic.questionCount}
          </Text>
          <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
            {latestDiagnostic.weakTypes.slice(0, 4).map((t) => (
              <Badge key={t} label={t} tone="default" />
            ))}
          </Row>
        </Card>
      ) : (
        <Card>
          <Text style={styles.muted}>{t("아직 진단 기록이 없습니다.")}</Text>
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
  heroTitle: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  itemTitle: { color: COLORS.text, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  rightHint: { color: "#BCA8FF", fontWeight: "800" },
});
