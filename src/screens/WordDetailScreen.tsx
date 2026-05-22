import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, Collapsible, Row, SectionHeader } from "../components/common";
import { difficultyLabel } from "../data/vocabData";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { VocabItem } from "../types";

function TopBack({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.9 }]}>
        <Text style={styles.backText}>‹ {t("뒤로")}</Text>
      </Pressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        {t(title)}
      </Text>
      <View style={{ width: 82, alignItems: "flex-end" }}>{right || null}</View>
    </Row>
  );
}

export function WordDetailScreen({
  word,
  allVocab,
  onBack,
  onToggleFavorite,
  onAddToReview,
  onStartFlashcard,
  onShowRelated,
  onShowSameType,
}: {
  word: VocabItem;
  allVocab: VocabItem[];
  onBack: () => void;
  onToggleFavorite: () => void;
  onAddToReview: () => void;
  onStartFlashcard: (wordIds: string[], title: string) => void;
  onShowRelated: (wordIds: string[], title: string) => void;
  onShowSameType: (typeName: string) => void;
}) {
  const { language, t, tm, td } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [openSec, setOpenSec] = useState({
    occ: true,
    dist: false,
    rel: false,
    ex: true,
    mistake: false,
  });

  const diff = difficultyLabel(word.difficulty);
  const recent = word.appearedIn[0];

  const typeDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of word.appearedIn) m.set(o.questionType, (m.get(o.questionType) || 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [word.appearedIn]);

  const subjectDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of word.appearedIn) m.set(o.subject, (m.get(o.subject) || 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [word.appearedIn]);

  const sameTypeRecs = useMemo(() => {
    const type = word.questionTypes[0];
    if (!type) return [];
    return allVocab
      .filter((v) => v.id !== word.id && v.questionTypes.includes(type))
      .slice()
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, 6);
  }, [allVocab, word.id, word.questionTypes, word.frequencyScore]);

  const relatedWordItems = useMemo(() => {
    const set = new Set(word.relatedWords);
    return allVocab.filter((v) => set.has(v.word)).slice(0, 10);
  }, [allVocab, word.relatedWords]);

  const flashcardPack = useMemo(() => {
    const ids = [word.id].concat(relatedWordItems.map((v) => v.id)).slice(0, 12);
    return ids;
  }, [word.id, relatedWordItems]);

  const exampleTranslation = language === "日本語" ? "" : td(word.exampleKo, word, "example");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <TopBack
        title={t("단어 상세")}
        onBack={onBack}
        right={
          <Pressable onPress={onToggleFavorite} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.iconBtnText}>{word.isFavorite ? "★" : "☆"}</Text>
          </Pressable>
        }
      />

      <Card style={{ marginTop: 12 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.word}>{word.word}</Text>
            <Text style={styles.reading}>{word.reading}</Text>
            <Text style={styles.meaning}>{tm(word.meaningKo)}</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert(t("음성"), t("발음 음성은 데모입니다. (백엔드 연결 후 지원 예정)"))}
            style={({ pressed }) => [styles.audioBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.audioText}>🔊</Text>
          </Pressable>
        </Row>

        <View style={{ marginTop: 12, gap: 8 }}>
          <Row style={{ flexWrap: "wrap" }}>
            <Badge label={`${t("학습 레벨")}: ${t(diff.label)}`} tone="violet" />
          <Badge label={`${t("추천 대상")}: ${t(word.targetScore)} ${t("목표")}`} tone="default" />
          </Row>
          <Row style={{ flexWrap: "wrap" }}>
            <Badge label={`${t("기출 출현")}: ${word.occurrenceCount}${t("회")}`} tone="blue" />
            <Badge label={`${t("주요 유형")}: ${t(word.questionTypes[0] || "문맥 이해")}`} tone="default" />
          </Row>
          <Row style={{ flexWrap: "wrap" }}>
            <Badge
              label={`${t("최근 출현")}: ${recent ? `${recent.year}${t("년")} ${t(recent.session)}` : "-"}`}
              tone="default"
            />
            <Badge label={`${t("중요도")}: ${t(word.importance)}`} tone="gold" />
          </Row>
        </View>

        <Text style={styles.shortExplain} numberOfLines={2}>
          {td(word.explanationKo, word, "explanation")}
        </Text>

        <Row style={{ marginTop: 12 }}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => onStartFlashcard(flashcardPack, `${word.word} 관련 낱말카드`)}>
            <Text style={styles.primaryBtnText}>{t("낱말카드로 학습")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onAddToReview}>
            <Text style={styles.secondaryBtnText}>{t("오답 복습에 추가")}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => {
              if (!relatedWordItems.length) {
                Alert.alert(t("관련어"), t("이 단어와 바로 연결된 관련어가 아직 없습니다."));
                return;
              }
              onShowRelated(relatedWordItems.map((x) => x.id), `${word.word} 관련어`);
            }}
          >
            <Text style={styles.secondaryBtnText}>{t("관련어 같이 보기")}</Text>
          </Pressable>
        </Row>
        <Row style={{ marginTop: 10 }}>
          <Pressable
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => {
              const type = word.questionTypes[0];
              if (!type) {
                Alert.alert(t("유형"), t("주요 유형 정보가 없습니다."));
                return;
              }
              onShowSameType(type);
            }}
          >
            <Text style={styles.secondaryBtnText}>{t("같은 유형 단어 보기")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setDetailsOpen((v) => !v)}>
            <Text style={styles.secondaryBtnText}>{t(detailsOpen ? "간단히 보기" : "자세한 기출 정보 보기")}</Text>
          </Pressable>
        </Row>
      </Card>

      {detailsOpen ? (
        <>
          <SectionHeader title="상세 정보" />

          <Collapsible
            title="기출 출현 기록"
            open={openSec.occ}
            onToggle={() => setOpenSec((p) => ({ ...p, occ: !p.occ }))}
          >
            {word.appearedIn.slice(0, 24).map((o, idx) => (
              <View key={`${o.year}_${o.session}_${idx}`} style={styles.rowLine}>
                <Text style={styles.lineLeft}>
                  {o.year}{t("년")} {t(o.session)} · {t(o.subject)} · {t(o.part)}
                </Text>
                <Text style={styles.lineRight}>
                  {t(o.questionType)}
                  {o.questionNumber ? ` #${o.questionNumber}` : ""}
                </Text>
              </View>
            ))}
            {word.appearedIn.length > 24 ? (
              <Text style={styles.mutedSmall}>{t("외")} {word.appearedIn.length - 24}{t("건")}</Text>
            ) : null}
          </Collapsible>

          <Collapsible
            title="유형별 출현"
            open={openSec.dist}
            onToggle={() => setOpenSec((p) => ({ ...p, dist: !p.dist }))}
          >
            {typeDist.map(([k, v]) => (
              <View key={k} style={styles.rowLine}>
                <Text style={styles.lineLeft}>{t(k)}</Text>
                <Text style={styles.lineRight}>{v}{t("회")}</Text>
              </View>
            ))}
            <View style={{ height: 8 }} />
            {subjectDist.map(([k, v]) => (
              <View key={k} style={styles.rowLine}>
                <Text style={styles.lineLeft}>{t(k)}</Text>
                <Text style={styles.lineRight}>{v}{t("회")}</Text>
              </View>
            ))}
          </Collapsible>

          <Collapsible
            title="관련어·동의어"
            open={openSec.rel}
            onToggle={() => setOpenSec((p) => ({ ...p, rel: !p.rel }))}
          >
            <Row style={{ flexWrap: "wrap" }}>
              {(word.synonyms || []).slice(0, 10).map((s) => (
                <Badge key={`syn_${s}`} label={`${t("동의")}: ${s}`} tone="default" />
              ))}
              {(word.antonyms || []).slice(0, 10).map((s) => (
                <Badge key={`ant_${s}`} label={`${t("반의")}: ${s}`} tone="danger" />
              ))}
              {word.relatedWords.slice(0, 12).map((s) => (
                <Badge key={`rel_${s}`} label={s} tone="violet" />
              ))}
            </Row>
          </Collapsible>

          <Collapsible
            title="예문·설명"
            open={openSec.ex}
            onToggle={() => setOpenSec((p) => ({ ...p, ex: !p.ex }))}
          >
            <Text style={styles.exampleJa}>{word.exampleJa}</Text>
            {exampleTranslation ? <Text style={styles.exampleKo}>{exampleTranslation}</Text> : null}
            <Text style={styles.longExplain}>{td(word.explanationKo, word, "explanation")}</Text>
          </Collapsible>

          <Collapsible
            title="헷갈리기 쉬운 포인트"
            open={openSec.mistake}
            onToggle={() => setOpenSec((p) => ({ ...p, mistake: !p.mistake }))}
          >
            <Text style={styles.longExplain}>
              {td(word.commonMistake || "비슷한 단어와 함께 외우면 헷갈림을 줄일 수 있어요. 예문으로 의미를 확인하세요.", word, "mistake")}
            </Text>
          </Collapsible>

          <SectionHeader title="같은 유형 추천" />
          {sameTypeRecs.length ? (
            <View style={{ gap: 10 }}>
              {sameTypeRecs.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    Alert.alert(t("추천 단어"), t("단어 상세로 이동합니다."));
                    onShowRelated([v.id], t("추천 단어"));
                  }}
                  style={({ pressed }) => [styles.recCard, pressed && { opacity: 0.9 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recWord}>{v.word}</Text>
                    <Text style={styles.mutedSmall}>{v.reading} · {tm(v.meaningKo)}</Text>
                  </View>
                  <Text style={styles.mutedSmall}>{t("기출")} {v.occurrenceCount}{t("회")}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card>
              <Text style={styles.mutedSmall}>{t("추천 단어를 생성할 데이터가 부족합니다.")}</Text>
            </Card>
          )}
        </>
      ) : null}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  backBtn: { height: 48, minWidth: 82, paddingHorizontal: 12, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center" },
  backText: { color: COLORS.text, fontWeight: "800" },
  topTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, textAlign: "center", flex: 1 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  iconBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  word: { color: COLORS.text, fontSize: TYPO.h1, fontWeight: "800" },
  reading: { color: COLORS.muted, marginTop: 6, fontWeight: "700" },
  meaning: { color: COLORS.text, marginTop: 8, fontSize: TYPO.h2, fontWeight: "800" },
  audioBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  audioText: { color: COLORS.text, fontSize: TYPO.h2 },
  shortExplain: { color: COLORS.muted, lineHeight: TYPO.bodyLine, fontSize: 13, marginTop: 12 },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.text, fontWeight: "800" },
  secondaryBtn: { backgroundColor: COLORS.card2, borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  secondaryBtnText: { color: COLORS.text, fontWeight: "800" },
  rowLine: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(53,58,114,0.6)" },
  lineLeft: { color: COLORS.text, fontWeight: "700", flex: 1 },
  lineRight: { color: COLORS.muted, fontWeight: "700" },
  mutedSmall: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 10 },
  exampleJa: { color: COLORS.text, fontWeight: "700", lineHeight: TYPO.bodyLine },
  exampleKo: { color: COLORS.muted, fontWeight: "700", marginTop: 6, lineHeight: TYPO.smallLine },
  longExplain: { color: COLORS.muted, marginTop: 10, lineHeight: TYPO.smallLine, fontSize: TYPO.small },
  recCard: { backgroundColor: COLORS.card, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  recWord: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
});
