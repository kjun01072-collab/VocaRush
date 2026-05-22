import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, Card, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, TYPO } from "../theme";
import { VocabItem } from "../types";
import { HighlightExtractionCandidate } from "../lib/highlightExtraction";

const DUMMY_EXTRACTED = [
  { word: "少子化", reading: "しょうしか", meaningKo: "저출산", category: "종합과목/사회", confidence: 94 },
  { word: "社会保障", reading: "しゃかいほしょう", meaningKo: "사회보장", category: "종합과목/사회", confidence: 91 },
  { word: "根拠", reading: "こんきょ", meaningKo: "근거", category: "기술문/논리", confidence: 88 },
  { word: "需要", reading: "じゅよう", meaningKo: "수요", category: "종합과목/경제", confidence: 87 },
];

export function HighlightModal({
  visible,
  close,
  vocab,
  onAddExtractedWords,
  onExtractFile,
}: {
  visible: boolean;
  close: () => void;
  vocab: VocabItem[];
  onAddExtractedWords: (items: Array<{ word: string; reading: string; meaningKo: string }>) => void;
  onExtractFile?: (file: Blob & { name?: string; type?: string }) => Promise<HighlightExtractionCandidate[]>;
}) {
  const { t, tm } = useI18n();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<"사진" | "파일" | null>(null);
  const [extracted, setExtracted] = useState<HighlightExtractionCandidate[]>(DUMMY_EXTRACTED);

  async function scan(nextSourceName?: string, nextSourceType?: "사진" | "파일", file?: Blob & { name?: string; type?: string }) {
    if (nextSourceName) setSourceName(nextSourceName);
    if (nextSourceType) setSourceType(nextSourceType);
    setLoading(true);
    setDone(false);
    setSelected({});
    try {
      if (file && onExtractFile) {
        const words = await onExtractFile(file);
        setExtracted(words.length ? words : DUMMY_EXTRACTED);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
        setExtracted(DUMMY_EXTRACTED);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(t("분석 데모로 전환"), `${t("실제 추출에 실패해 샘플 결과를 표시합니다.")}\n${message}`);
      setExtracted(DUMMY_EXTRACTED);
    } finally {
      setLoading(false);
      setDone(true);
    }
  }

  function pickUpload(kind: "사진" | "파일") {
    if (Platform.OS !== "web") {
      scan(kind === "사진" ? "교재 사진 데모" : "단어 파일 데모", kind);
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "사진" ? "image/*" : "image/*,.pdf,.png,.jpg,.jpeg,.webp";
    input.onchange = () => {
      const file = input.files?.[0];
      scan(file?.name || (kind === "사진" ? "교재 사진" : "업로드 파일"), kind, file);
    };
    input.click();
  }

  function toggle(key: string) {
    setSelected((p) => ({ ...p, [key]: !p[key] }));
  }

  function addSelected() {
    const picked = extracted.filter((x) => selected[x.word]);
    if (!picked.length) {
      Alert.alert(t("선택"), t("추가할 단어를 선택해 주세요."));
      return;
    }

    const payload = picked.map((p) => ({ word: p.word, reading: p.reading, meaningKo: p.meaningKo }));
    onAddExtractedWords(payload);
    Alert.alert(t("저장 완료"), `${t("형광펜")} ${t("단어")} ${payload.length}${t("개")} ${t("추가했습니다")}. (${t("리뷰 큐에 포함됩니다")})`);
    close();
  }

  const matchReason = (w: { word: string; reading: string; meaningKo: string }) => {
    const hit = vocab.find((v) => v.word === w.word || v.reading === w.reading);
    if (!hit) return `${t("DB 매칭")}: ${t("신규 단어")}`;
    return `${t("DB 매칭")}: ${t(hit.subject)} / ${t(hit.part)} · ${t("기출")} ${hit.occurrenceCount}${t("회")}`;
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.safe}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.pageTitle}>{t("형광펜 단어 추가")}</Text>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>

          <Text style={styles.desc}>
            {t("교재나 프린트에서 표시한 단어를 사진/파일로 올리면 추출 후보를 보여주고, 선택한 단어만 형광펜 단어장에 저장합니다.")}
          </Text>

          <View style={styles.uploadGrid}>
            <Pressable onPress={() => pickUpload("사진")} style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.uploadIcon}>▧</Text>
              <Text style={styles.uploadTitle}>{t("사진 업로드")}</Text>
              <Text style={styles.uploadHelp}>{t("교재 사진")}</Text>
            </Pressable>
            <Pressable onPress={() => pickUpload("파일")} style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.uploadIcon}>▤</Text>
              <Text style={styles.uploadTitle}>{t("파일 업로드")}</Text>
              <Text style={styles.uploadHelp}>PDF / JPG / PNG</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => scan(sourceName || "샘플 이미지", sourceType || "사진")} style={({ pressed }) => [styles.scanBox, pressed && { opacity: 0.9 }]}>
            <Text style={styles.scanIcon}>{loading ? "…" : "⌕"}</Text>
            <Text style={styles.scanTitle}>{t(loading ? "분석 중..." : "추출 후보 보기")}</Text>
            <Text style={styles.muted}>
              {sourceName
                ? `${t(sourceType || "파일")} · ${sourceName}`
                : t("파일을 선택하거나 샘플 추출을 시작할 수 있습니다.")}
            </Text>
          </Pressable>

          {done ? (
            <>
              <SectionHeader title="AI 추출 결과" right={<Text style={styles.muted}>{t("선택 후 추가")}</Text>} />
              {extracted.map((w) => {
                const isOn = !!selected[w.word];
                return (
                  <Pressable
                    key={w.word}
                    onPress={() => toggle(w.word)}
                    style={({ pressed }) => [styles.wordCard, pressed && { opacity: 0.9 }, isOn && styles.wordCardOn]}
                  >
                    <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.word}>{w.word}</Text>
                        <Text style={styles.muted}>
                          {w.reading} · {tm(w.meaningKo)}
                        </Text>
                      </View>
                      <Badge label={`${w.confidence}%`} tone={isOn ? "blue" : "default"} />
                    </Row>
                    <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
                      <Badge label={w.category} tone="violet" />
                      <Badge label={matchReason(w)} tone="default" />
                    </Row>
                  </Pressable>
                );
              })}

              <Pressable onPress={addSelected} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.primaryBtnText}>{t("선택 단어 추가")}</Text>
              </Pressable>
            </>
          ) : null}

          <Card style={{ marginTop: 18 }}>
            <Text style={styles.noticeTitle}>{t("프라이버시")}</Text>
            <Text style={styles.noticeText}>{t("사진 원본은 단어 추출 후 저장하지 않는 구조로 설계됩니다.")}</Text>
            <Text style={[styles.noticeText, { marginTop: 8 }]}>
              {t("현재 버전은 실제 OCR/AI 없이 데모 추출 결과를 보여줍니다. 실제 자동 추출은 OCR 또는 AI 서버 연결 후 지원됩니다.")}
            </Text>
          </Card>

          <View style={{ height: 110 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  scroll: { paddingTop: 18, paddingBottom: 115 },
  pageTitle: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  desc: { color: COLORS.muted, marginTop: 10, lineHeight: TYPO.bodyLine, fontSize: TYPO.small },
  closeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center", alignItems: "center" },
  closeText: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  uploadGrid: { flexDirection: "row", gap: 10, marginTop: 16 },
  uploadBtn: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADII.card, padding: 16, borderWidth: 1, borderColor: COLORS.line },
  uploadIcon: { color: COLORS.cyan, fontSize: 28, fontWeight: "900" },
  uploadTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.body, marginTop: 8 },
  uploadHelp: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.micro, marginTop: 4 },
  scanBox: { backgroundColor: COLORS.card, borderRadius: RADII.cardLg, padding: 22, alignItems: "center", marginTop: 16, borderWidth: 1, borderColor: COLORS.line },
  scanIcon: { color: COLORS.cyan, fontSize: 48, marginBottom: 8 },
  scanTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  muted: { color: COLORS.muted, fontWeight: "700", marginTop: 6, fontSize: TYPO.small },
  wordCard: { backgroundColor: COLORS.card, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 10 },
  wordCardOn: { borderColor: COLORS.blue },
  word: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 16, minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 14 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  noticeTitle: { color: "#C7B8FF", fontWeight: "800", marginBottom: 6 },
  noticeText: { color: "#C5CBE8", lineHeight: TYPO.smallLine, fontSize: TYPO.small },
});
