import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Card, EmptyState, PillButton, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, SPACING, TYPO } from "../theme";
import { DIFFICULTY_LABELS, difficultyLabel } from "../data/vocabData";
import { StudySet, UserStudyFolder, VocabDifficulty, VocabItem } from "../types";

type WrongWordStat = {
  wrong: number;
  recent: number;
};

type WrongWordStats = Record<string, WrongWordStat>;

type SortKey =
  | "기출 빈도순"
  | "최근 출현순"
  | "쉬운 단어부터"
  | "고득점 단어부터"
  | "오답 많은 순"
  | "내가 모르는 단어순";

const SORTS: SortKey[] = [
  "기출 빈도순",
  "최근 출현순",
  "쉬운 단어부터",
  "고득점 단어부터",
  "오답 많은 순",
  "내가 모르는 단어순",
];

const FILTERS = [
  "전체",
  "필수 기초",
  "빈출 핵심",
  "점수 상승",
  "고득점 어휘",
  "최상위 표현",
  "200점 목표",
  "300점 목표",
  "350+",
  "일본어",
  "청독해",
  "기술문",
  "종합과목",
  "어휘 추론",
  "주장 파악",
  "근거 찾기",
  "문맥 이해",
  "자료형",
  "사회",
  "경제",
  "정치",
  "세계사",
  "환경",
  "별표 단어",
  "형광펜 단어",
  "오답 단어",
] as const;

type FilterKey = (typeof FILTERS)[number];

const QUICK_FILTERS: FilterKey[] = [
  "전체",
  "빈출 핵심",
  "300점 목표",
  "청독해",
  "별표 단어",
  "오답 단어",
];

type FilterGroupKey = "level" | "target" | "subject" | "type" | "sougou" | "personal";

const FILTER_GROUPS: Array<{
  key: FilterGroupKey;
  title: string;
  description: string;
  filters: FilterKey[];
}> = [
  {
    key: "level",
    title: "학습 레벨",
    description: "단어 난이도와 학습 우선순위",
    filters: ["필수 기초", "빈출 핵심", "점수 상승", "고득점 어휘", "최상위 표현"],
  },
  {
    key: "target",
    title: "목표 점수",
    description: "200점, 300점, 350+ 목표별 단어",
    filters: ["200점 목표", "300점 목표", "350+"],
  },
  {
    key: "subject",
    title: "영역",
    description: "일본어, 청독해, 기술문, 종합과목",
    filters: ["일본어", "청독해", "기술문", "종합과목"],
  },
  {
    key: "type",
    title: "문제 유형",
    description: "독해와 청독해에서 자주 쓰는 유형",
    filters: ["어휘 추론", "주장 파악", "근거 찾기", "문맥 이해", "자료형"],
  },
  {
    key: "sougou",
    title: "종합과목 주제",
    description: "사회, 경제, 정치, 세계사, 환경",
    filters: ["사회", "경제", "정치", "세계사", "환경"],
  },
  {
    key: "personal",
    title: "내 단어",
    description: "별표, 형광펜, 오답 단어만 보기",
    filters: ["별표 단어", "형광펜 단어", "오답 단어"],
  },
];

type SetFolderKey =
  | "전체 세트"
  | "EJU 단어"
  | "종합과목"
  | "개인·과제";

type SetFolder = {
  key: SetFolderKey;
  title: string;
  subtitle: string;
};

const SET_FOLDERS: SetFolder[] = [
  {
    key: "EJU 단어",
    title: "EJU 단어",
    subtitle: "최빈출, 목표 점수, 독해·청독해·기술문 세트",
  },
  {
    key: "종합과목",
    title: "종합과목",
    subtitle: "지리·세계사·경제·정치·사회 세트",
  },
  {
    key: "개인·과제",
    title: "개인·과제 세트",
    subtitle: "오답, 형광펜, 진단, 선생님 배포 세트",
  },
];

const SET_FOLDER_FILTERS: SetFolderKey[] = ["전체 세트", ...SET_FOLDERS.map((f) => f.key)];

const SET_ORDER = [
  "set_curiosity",
  "set_favorites",
  "set_highlight",
  "set_wrong",
  "set_top100",
  "set_200",
  "set_300",
  "set_350",
  "set_reason",
  "set_claim",
  "set_reading_context",
  "set_reading_relation",
  "set_academic_abstract",
  "set_table",
  "set_listening_notice",
  "set_writing",
  "set_geography",
  "set_geo_skills",
  "set_geo_climate_resources",
  "set_geo_population_city",
  "set_world_history_textbook",
  "set_modern_world_history",
  "set_contemporary_history",
  "set_history",
  "set_society",
  "set_economy",
  "set_economy_system",
  "set_market_price",
  "set_income_cycle",
  "set_financial_policy",
  "set_fiscal_policy",
  "set_japan_economy",
  "set_japan_economy_issues",
  "set_international_trade",
  "set_international_economy_system",
  "set_civics",
  "set_politics_textbook",
  "set_democracy_rights",
  "set_local_autonomy",
  "set_international_society",
  "set_un_peace",
  "set_modern_society",
  "set_environment_global",
];

function setOrderIndex(set: StudySet) {
  const idx = SET_ORDER.indexOf(set.id);
  return idx >= 0 ? idx : 100 + set.createdAt;
}

function setFolderKey(set: StudySet): SetFolderKey {
  if (set.createdFrom === "diagnostic" || set.createdFrom === "highlight" || set.createdFrom === "wrong" || set.createdFrom === "teacher" || set.createdFrom === "custom") {
    return "개인·과제";
  }

  if (["set_top100", "set_200", "set_300", "set_350"].includes(set.id)) return "EJU 단어";
  if (["set_reason", "set_claim", "set_reading_context", "set_reading_relation", "set_academic_abstract", "set_table", "set_listening_notice", "set_writing"].includes(set.id)) return "EJU 단어";
  if (["set_geography", "set_geo_skills", "set_geo_climate_resources", "set_geo_population_city", "set_world_history_textbook", "set_modern_world_history", "set_contemporary_history", "set_history"].includes(set.id)) return "종합과목";
  if ([
    "set_economy",
    "set_economy_system",
    "set_market_price",
    "set_income_cycle",
    "set_financial_policy",
    "set_fiscal_policy",
    "set_japan_economy",
    "set_japan_economy_issues",
    "set_international_trade",
    "set_international_economy_system",
  ].includes(set.id)) return "종합과목";
  if (["set_society", "set_civics", "set_politics_textbook", "set_democracy_rights", "set_local_autonomy", "set_international_society", "set_un_peace", "set_modern_society", "set_environment_global"].includes(set.id)) return "종합과목";

  if (set.weakTypes.some((type) => ["근거 찾기", "주장 파악", "자료형", "기술문 표현"].includes(type))) return "EJU 단어";
  if (set.weakTypes.some((type) => ["세계사", "지리", "경제", "경제 정책", "사회 문제", "정치 제도", "국제사회", "환경"].includes(type))) return "종합과목";
  return "EJU 단어";
}

function groupedStudySets(studySets: StudySet[], folderFilter: SetFolderKey) {
  const sorted = studySets.slice().sort((a, b) => setOrderIndex(a) - setOrderIndex(b));
  return SET_FOLDERS.map((folder) => ({
    ...folder,
    sets: sorted.filter((set) => setFolderKey(set) === folder.key),
  })).filter((folder) => folder.sets.length > 0 && (folderFilter === "전체 세트" || folder.key === folderFilter));
}

function parseSetRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line
        .split(/\t|,| \/ | - | — | – /)
        .map((x) => x.trim())
        .filter(Boolean);
      if (cols.length >= 3) return { word: cols[0], reading: cols[1], meaningKo: cols.slice(2).join(" ") };
      if (cols.length === 2) return { word: cols[0], reading: cols[0], meaningKo: cols[1] };
      return { word: cols[0] || "", reading: cols[0] || "", meaningKo: "" };
    })
    .filter((row) => row.word && row.meaningKo);
}

function mostRecentYear(item: VocabItem) {
  return item.appearedIn.length ? item.appearedIn[0].year : 0;
}

function difficultyKey(item: VocabItem): VocabDifficulty {
  return item.difficulty;
}

function matchReasons(item: VocabItem, query: string) {
  const q = query.trim();
  if (!q) return [];
  const reasons: string[] = [];
  const qLower = q.toLowerCase();
  if (item.word.includes(q)) reasons.push("단어");
  if (item.reading.toLowerCase().includes(qLower)) reasons.push("독음");
  if (item.meaningKo.includes(q)) reasons.push("뜻");
  if (/^\d{4}$/.test(q)) {
    const year = Number(q);
    if (item.appearedIn.some((o) => o.year === year)) reasons.push(`${year}년 출현`);
  }
  if (item.subject.includes(q as any)) reasons.push(`과목 ${item.subject}`);
  if (item.part.includes(q)) reasons.push(`파트 ${item.part}`);
  if (item.questionTypes.some((t) => t.includes(q))) reasons.push(`유형 ${q}`);
  if (item.synonyms.some((word) => word.includes(q))) reasons.push("동의어");
  if (item.relatedWords.some((word) => word.includes(q))) reasons.push("관련어");
  if (item.exampleJa.includes(q) || item.exampleKo.includes(q)) reasons.push("예문");
  return reasons.slice(0, 2);
}

function isCuriosityWord(item: VocabItem) {
  return item.part === "궁금한 일본어" || item.questionTypes.includes("개인 검색");
}

function applyFilter(item: VocabItem, filter: FilterKey, wrongWordStats: WrongWordStats) {
  if (filter === "전체") return true;

  if (filter === "필수 기초") return item.difficulty === 1;
  if (filter === "빈출 핵심") return item.difficulty === 2;
  if (filter === "점수 상승") return item.difficulty === 3;
  if (filter === "고득점 어휘") return item.difficulty === 4;
  if (filter === "최상위 표현") return item.difficulty === 5;

  if (filter === "200점 목표") return item.targetScore === "200점";
  if (filter === "300점 목표") return item.targetScore === "300점";
  if (filter === "350+") return item.targetScore === "350+";

  if (filter === "일본어") return item.subject === "일본어" || item.subject === "문법" || item.subject === "한자";
  if (filter === "청독해") return item.subject === "청독해";
  if (filter === "기술문") return item.subject === "기술문";
  if (filter === "종합과목") return item.subject === "종합과목";

  if (filter === "사회" || filter === "경제" || filter === "정치" || filter === "세계사" || filter === "환경") {
    return item.part === filter;
  }

  if (filter === "형광펜 단어") return item.sourceType === "형광펜";
  if (filter === "별표 단어") return item.isFavorite;
  if (filter === "오답 단어") return (wrongWordStats[item.id]?.wrong || 0) > 0;

  return item.questionTypes.includes(filter);
}

function sortItems(items: VocabItem[], sortKey: SortKey, wrongWordStats: WrongWordStats) {
  const arr = items.slice();
  arr.sort((a, b) => {
    if (sortKey === "기출 빈도순") return b.occurrenceCount - a.occurrenceCount || b.frequencyScore - a.frequencyScore;
    if (sortKey === "최근 출현순") return mostRecentYear(b) - mostRecentYear(a);
    if (sortKey === "쉬운 단어부터") return a.difficulty - b.difficulty || b.frequencyScore - a.frequencyScore;
    if (sortKey === "고득점 단어부터") return b.difficulty - a.difficulty || b.frequencyScore - a.frequencyScore;
    if (sortKey === "오답 많은 순") {
      const aWrong = wrongWordStats[a.id]?.wrong || 0;
      const bWrong = wrongWordStats[b.id]?.wrong || 0;
      const aRecent = wrongWordStats[a.id]?.recent || 0;
      const bRecent = wrongWordStats[b.id]?.recent || 0;
      return bWrong - aWrong || bRecent - aRecent || b.frequencyScore - a.frequencyScore;
    }
    return a.masteryLevel - b.masteryLevel || b.frequencyScore - a.frequencyScore;
  });
  return arr;
}

export function VocabularyScreen({
  vocab,
  studySets,
  userFolders,
  initialQuery,
  defaultSort,
  title = "단어장",
  subtitle = "필터/정렬로 필요한 단어를 빠르게 찾으세요.",
  initialMode = "단어",
  lockMode = false,
  setWordFilter = null,
  onClearSetWordFilter,
  wrongWordStats = {},
  onOpenWord,
  onOpenSet,
  onOpenUserFolder,
  onToggleFavorite,
  onLookupDictionary,
  onSaveCuriosityWord,
}: {
  vocab: VocabItem[];
  studySets: StudySet[];
  userFolders: UserStudyFolder[];
  initialQuery: string;
  defaultSort: SortKey;
  title?: string;
  subtitle?: string;
  initialMode?: "단어" | "세트";
  lockMode?: boolean;
  setWordFilter?: { title: string; wordIds: string[] } | null;
  onClearSetWordFilter?: () => void;
  wrongWordStats?: WrongWordStats;
  onOpenWord: (id: string) => void;
  onOpenSet: (id: string) => void;
  onOpenUserFolder: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onLookupDictionary?: (query: string) => VocabItem | null;
  onSaveCuriosityWord?: (query: string) => string | null;
}) {
  const { t, tm } = useI18n();
  const [mode, setMode] = useState<"단어" | "세트">(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<FilterKey>("전체");
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort);
  const [setFolder, setSetFolder] = useState<SetFolderKey>("전체 세트");
  const [filterModal, setFilterModal] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [expandedSetGroups, setExpandedSetGroups] = useState<Record<string, boolean>>({});

  const filteredWords = useMemo(() => {
    const q = query.trim();
    const setWordIdSet = setWordFilter ? new Set(setWordFilter.wordIds) : null;
    const bySet = setWordIdSet ? vocab.filter((v) => setWordIdSet.has(v.id)) : vocab;
    const byFilter = bySet.filter((v) => applyFilter(v, filter, wrongWordStats));
    const byWrongSort =
      sortKey === "오답 많은 순"
        ? byFilter.filter((v) => (wrongWordStats[v.id]?.wrong || 0) > 0)
        : byFilter;
    const byQuery = !q
      ? byWrongSort
      : byWrongSort.filter((v) => {
          if (v.word.includes(q)) return true;
          if (v.reading.toLowerCase().includes(q.toLowerCase())) return true;
          if (v.meaningKo.includes(q)) return true;
          if (/^\d{4}$/.test(q)) {
            const year = Number(q);
            return v.appearedIn.some((o) => o.year === year);
          }
          if (v.questionTypes.some((t) => t.includes(q))) return true;
          if (v.subject.includes(q as any)) return true;
          if (v.part.includes(q)) return true;
          if (v.synonyms.some((word) => word.includes(q))) return true;
          if (v.relatedWords.some((word) => word.includes(q))) return true;
          if (v.exampleJa.includes(q) || v.exampleKo.includes(q)) return true;
          return false;
        });
    return sortItems(byQuery, sortKey, wrongWordStats);
  }, [vocab, query, filter, sortKey, setWordFilter, wrongWordStats]);

  const dictionaryResult = useMemo(() => {
    if (filteredWords.length || !query.trim() || setWordFilter) return null;
    return onLookupDictionary?.(query) || null;
  }, [filteredWords.length, onLookupDictionary, query, setWordFilter]);

  const setGroups = useMemo(
    () => groupedStudySets(studySets, setFolder),
    [studySets, setFolder]
  );
  const continueSet = useMemo(
    () =>
      studySets
        .filter((set) => set.wordCount > 0)
        .slice()
        .sort((a, b) => b.progress - a.progress || b.createdAt - a.createdAt)[0] || null,
    [studySets]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{t(title)}</Text>
          <Text style={styles.muted}>{t(subtitle)}</Text>
        </View>
        {!lockMode ? (
          <Pressable onPress={() => setGuideOpen(true)} style={({ pressed }) => [styles.guideBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.guideText}>{t("레벨 가이드")}</Text>
          </Pressable>
        ) : null}
      </Row>

      <Row style={{ marginTop: 14, alignItems: "center" }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("단어, 뜻, 독음, 2015, 근거 찾기…")}
            placeholderTextColor="#7B82A6"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
      </Row>

      {!lockMode ? (
        <Row style={{ marginTop: 10, justifyContent: "space-between", alignItems: "center" }}>
          <Row>
            <Pressable style={({ pressed }) => [styles.tabChip, mode === "단어" && styles.tabChipActive, pressed && { opacity: 0.9 }]} onPress={() => setMode("단어")}>
              <Text style={[styles.tabChipText, mode === "단어" && styles.tabChipTextActive]}>{t("단어")}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.tabChip, mode === "세트" && styles.tabChipActive, pressed && { opacity: 0.9 }]} onPress={() => setMode("세트")}>
              <Text style={[styles.tabChipText, mode === "세트" && styles.tabChipTextActive]}>{t("세트")}</Text>
            </Pressable>
          </Row>
          <Pressable style={({ pressed }) => [styles.sortBtn, pressed && { opacity: 0.9 }]} onPress={() => setFilterModal(true)}>
            <Text style={styles.sortText}>{t(filter)} · {t(sortKey)}</Text>
          </Pressable>
        </Row>
      ) : null}

      {mode === "세트" ? (
        <View style={{ marginTop: 14 }}>
          {continueSet ? (
            <Card style={styles.continueCard}>
              <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.continueKicker}>{t("멈춘 지점에서 계속하기")}</Text>
                  <Text style={styles.continueTitle}>{t(continueSet.title)}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {t("단어")} {continueSet.wordCount}{t("개")} · {t("진행")} {continueSet.progress}%
                  </Text>
                </View>
                <Pressable
                  onPress={() => onOpenSet(continueSet.id)}
                  style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.continueButtonText}>{t("계속하기")}</Text>
                </Pressable>
              </Row>
              <View style={{ marginTop: 12 }}>
                <ProgressBar value={continueSet.progress || 4} />
              </View>
            </Card>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderTabs}>
            {SET_FOLDER_FILTERS.map((folder) => (
              <PillButton
                key={folder}
                label={folder}
                selected={setFolder === folder}
                onPress={() => setSetFolder(folder)}
              />
            ))}
          </ScrollView>

          {userFolders.length && (setFolder === "전체 세트" || setFolder === "개인·과제") ? (
            <View style={styles.setGroup}>
              <SectionHeader title={`${t("내 폴더")} · ${userFolders.length}${t("개")}`} />
              {userFolders.map((folder) => (
                <Pressable
                  key={folder.id}
                  onPress={() => onOpenUserFolder(folder.id)}
                  style={({ pressed }) => [styles.setCard, pressed && { opacity: 0.9 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.setTitle}>{t(folder.title)}</Text>
                    <Text style={styles.muted} numberOfLines={2}>{t(folder.description)}</Text>
                    <Row style={styles.setBadgeRow}>
                      <Badge label="폴더" tone="blue" />
                      <Badge label={folder.setIds.length ? `${folder.setIds.length}${t("개 세트")}` : "빈 폴더"} tone="violet" />
                    </Row>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {setGroups.length ? (
            setGroups.map((group) => {
              const expanded = setFolder !== "전체 세트" || expandedSetGroups[group.key];
              const visibleSets = expanded ? group.sets : group.sets.slice(0, 3);
              return (
              <View key={group.key} style={styles.setGroup}>
                <SectionHeader
                  title={`${t(group.title)} · ${group.sets.length}${t("개")}`}
                  right={
                    group.sets.length > 3 && setFolder === "전체 세트" ? (
                      <Pressable
                        onPress={() => setExpandedSetGroups((prev) => ({ ...prev, [group.key]: !expanded }))}
                        hitSlop={8}
                      >
                        <Text style={styles.rightHint}>{t(expanded ? "접기" : "전체보기")}</Text>
                      </Pressable>
                    ) : undefined
                  }
                />
                <Text style={styles.folderSubtitle}>{t(group.subtitle)}</Text>
                {visibleSets.map((s) => {
                  const sourceLabel =
                    s.id === "set_favorites" || s.id === "set_curiosity"
                      ? "개인 세트"
                      : s.createdFrom === "diagnostic"
                      ? "진단 세트"
                      : s.createdFrom === "teacher"
                      ? "선생님 과제"
                      : s.createdFrom === "wrong" || s.createdFrom === "highlight"
                      ? "개인 세트"
                      : s.createdFrom === "custom"
                      ? "직접 만든 세트"
                      : "기본 세트";

                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => onOpenSet(s.id)}
                      style={({ pressed }) => [styles.setCard, pressed && { opacity: 0.9 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.setTitle}>{t(s.title)}</Text>
                        <Text style={styles.muted} numberOfLines={2}>
                          {t(s.description)}
                        </Text>
                        <Row style={styles.setBadgeRow}>
                          <Badge label={setFolderKey(s)} tone="blue" />
                          <Badge label={sourceLabel} tone="violet" />
                        </Row>
                        <Text style={styles.muted}>
                          {t("단어")} {s.wordCount}{t("개")} · {t("진행")} {s.progress}% · {t("대표 유형")} {t(s.weakTypes[0] || "기출 빈도")}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
                    </Pressable>
                  );
                })}
              </View>
            );
            })
          ) : (
            <Card>
              <Text style={styles.setTitle}>{t("관련 세트가 없습니다.")}</Text>
              <Text style={styles.muted}>{t("다른 폴더를 선택하거나 진단/오답으로 새 세트를 만들어보세요.")}</Text>
            </Card>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 14 }}>
          {setWordFilter ? (
            <Card style={styles.activeSetFilter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeSetTitle}>{t("세트 단어 보기")}</Text>
                <Text style={styles.muted}>{t(setWordFilter.title)} · {setWordFilter.wordIds.length}{t("개")}</Text>
              </View>
              {onClearSetWordFilter ? (
                <Pressable onPress={onClearSetWordFilter} style={({ pressed }) => [styles.clearSetFilter, pressed && { opacity: 0.9 }]}>
                  <Text style={styles.clearSetFilterText}>{t("해제")}</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {filteredWords.length ? filteredWords.map((w) => {
            const reasons = matchReasons(w, query);
            const badge1 = difficultyLabel(w.difficulty).label;
            const badge2 = w.targetScore === "350+" ? "350+ 목표" : `${w.targetScore} 목표`;
            const badge3 = w.questionTypes[0] || "문맥 이해";
            const curiosity = isCuriosityWord(w);
            const showSearchContext =
              curiosity || reasons.some((reason) => ["단어", "독음", "뜻", "동의어"].includes(reason));
            return (
              <View key={w.id} style={styles.wordCard}>
                <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Pressable
                    onPress={() => onOpenWord(w.id)}
                    style={({ pressed }) => [styles.wordContent, pressed && { opacity: 0.88 }]}
                  >
                    <Text style={styles.word}>{w.word}</Text>
                    <Text style={styles.reading}>{w.reading}</Text>
                    <Text style={styles.meaning}>{tm(w.meaningKo)}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onToggleFavorite(w.id)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={w.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    style={({ pressed }) => [
                      styles.iconCircle,
                      w.isFavorite && styles.iconCircleActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons
                      name={w.isFavorite ? "star" : "star-outline"}
                      size={21}
                      color={w.isFavorite ? COLORS.gold : COLORS.muted}
                    />
                  </Pressable>
                </Row>

                <Pressable onPress={() => onOpenWord(w.id)} style={({ pressed }) => [pressed && { opacity: 0.88 }]}>
                  <Row style={{ marginTop: 10, flexWrap: "wrap" }}>
                    <Badge label={badge1} tone="violet" />
                    <Badge label={badge2} tone="default" />
                    <Badge label={badge3} tone="blue" />
                  </Row>

                  <Row style={{ marginTop: 10, justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.metaText}>{t("기출")} {w.occurrenceCount}{t("회")} · {t(w.subject)} {t(w.part)}</Text>
                    <Text style={styles.metaText}>{t("레벨")}: {t(DIFFICULTY_LABELS[difficultyKey(w)].shortBadge)}</Text>
                  </Row>

                  {reasons.length ? (
                    <Text style={styles.matchText}>{t("검색 일치")}: {reasons.map((r) => t(r)).join(" / ")}</Text>
                  ) : null}

                  {showSearchContext ? (
                    <View style={styles.curiosityPanel}>
                      <Text style={styles.curiosityLabel}>{t(curiosity ? "개인 검색 단어" : "검색 참고")}</Text>
                      <Text style={styles.curiosityExample} numberOfLines={2}>{w.exampleJa}</Text>
                      <Text style={styles.curiosityMeta} numberOfLines={1}>
                        {t("동의어")}: {w.synonyms.join(", ")} · {t("관련어")}: {w.relatedWords.slice(0, 3).join(", ")}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          }) : dictionaryResult ? (
            <Card style={styles.dictionaryCard}>
              <Text style={styles.dictionaryKicker}>{t("사전 검색 결과")}</Text>
              <Text style={styles.word}>{dictionaryResult.word}</Text>
              <Text style={styles.reading}>{dictionaryResult.reading}</Text>
              <Text style={styles.meaning}>{dictionaryResult.meaningKo}</Text>
              <Text style={styles.muted}>
                {t("EJU 기출 DB에는 없지만, 사전처럼 뜻과 예문을 먼저 보여줍니다.")}
              </Text>
              <View style={styles.curiosityPanel}>
                <Text style={styles.curiosityLabel}>{t("예문")}</Text>
                <Text style={styles.curiosityExample}>{dictionaryResult.exampleJa}</Text>
                <Text style={styles.curiosityMeta}>{dictionaryResult.exampleKo}</Text>
                <Text style={styles.curiosityMeta} numberOfLines={1}>
                  {t("동의어")}: {dictionaryResult.synonyms.join(", ")} · {t("관련어")}: {dictionaryResult.relatedWords.slice(0, 4).join(", ")}
                </Text>
              </View>
              {onSaveCuriosityWord ? (
                <Pressable
                  onPress={() => onSaveCuriosityWord(dictionaryResult.word)}
                  style={({ pressed }) => [styles.curiositySaveBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.curiositySaveText}>{t("내 단어장에 저장")}</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : query.trim() ? (
            <EmptyState
              title="사전 결과가 없습니다"
              body="한국어 뜻, 일본어 단어, 독음을 조금 더 짧게 입력해보세요. 실제 외부 사전/AI 검색은 백엔드 연결 후 확장할 수 있습니다."
            />
          ) : (
            sortKey === "오답 많은 순" || filter === "오답 단어" ? (
              <EmptyState
                title="아직 실제 오답 기록이 없습니다"
                body="퀴즈나 진단에서 틀린 단어가 생기면 여기에서 오답 많은 순으로 정리됩니다."
              />
            ) : (
              <EmptyState
                title="검색 결과가 없습니다"
                body="필터를 줄이거나 단어, 뜻, 독음, 연도, 유형으로 다시 검색해보세요."
              />
            )
          )}
        </View>
      )}

      <FilterSortModal
        visible={filterModal}
        close={() => setFilterModal(false)}
        filter={filter}
        setFilter={setFilter}
        sortKey={sortKey}
        setSortKey={setSortKey}
      />

      <LevelGuideModal visible={guideOpen} close={() => setGuideOpen(false)} />

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

function FilterSortModal({
  visible,
  close,
  filter,
  setFilter,
  sortKey,
  setSortKey,
}: {
  visible: boolean;
  close: () => void;
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
  sortKey: SortKey;
  setSortKey: (s: SortKey) => void;
}) {
  const { t } = useI18n();
  const activeGroup = FILTER_GROUPS.find((group) => group.filters.includes(filter));
  const [detailGroupKey, setDetailGroupKey] = useState<FilterGroupKey>(activeGroup?.key || "level");
  const detailGroup = FILTER_GROUPS.find((group) => group.key === detailGroupKey) || FILTER_GROUPS[0];

  function resetAll() {
    setFilter("전체");
    setSortKey("쉬운 단어부터");
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalSafe}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.modalScroll}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t("정렬 · 필터")}</Text>
              <Text style={styles.filterSummaryHint}>{t("자주 쓰는 것만 먼저 보여줍니다.")}</Text>
            </View>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>

          <Card style={styles.filterSummaryCard}>
            <Row style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterSummaryLabel}>{t("현재 보기")}</Text>
                <Text style={styles.filterSummaryValue}>{t(sortKey)} · {t(filter)}</Text>
                <Text style={styles.filterSummaryHint}>{filter === "전체" ? t("전체 단어") : t(activeGroup?.title || "빠른 필터")}</Text>
              </View>
              <Pressable onPress={resetAll} style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.resetText}>{t("초기화")}</Text>
              </Pressable>
            </Row>
          </Card>

          <SectionHeader title="정렬" />
          <Card style={styles.sortCard}>
            <View style={styles.chipWrap}>
              {SORTS.map((s) => (
                <PillButton key={s} label={s} selected={sortKey === s} onPress={() => setSortKey(s)} />
              ))}
            </View>
          </Card>

          <SectionHeader title="필터" />
          <Card style={styles.filterSummaryCard}>
            <Text style={styles.quickFilterTitleNoMargin}>{t("빠른 필터")}</Text>
            <View style={styles.chipWrap}>
              {QUICK_FILTERS.map((f) => (
                <PillButton key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </Card>

          <Card style={styles.detailFilterCard}>
            <Row style={{ alignItems: "center", gap: 8 }}>
              <Text style={styles.filterGroupTitle}>{t("상세 필터")}</Text>
              {activeGroup ? <View style={styles.activeDot} /> : null}
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailTabRow}>
              {FILTER_GROUPS.map((group) => (
                <Pressable
                  key={group.key}
                  onPress={() => setDetailGroupKey(group.key)}
                  style={({ pressed }) => [
                    styles.detailTab,
                    detailGroupKey === group.key && styles.detailTabActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.detailTabText, detailGroupKey === group.key && styles.detailTabTextActive]}>
                    {t(group.title)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.filterGroupDesc}>{t(detailGroup.description)}</Text>
            <View style={styles.chipWrap}>
              {detailGroup.filters.map((f) => (
                <PillButton key={`${detailGroup.key}-${f}`} label={f} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </Card>

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={close}>
            <Text style={styles.primaryBtnText}>{t("적용")}</Text>
          </Pressable>
          <View style={{ height: 110 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function LevelGuideModal({ visible, close }: { visible: boolean; close: () => void }) {
  const { t } = useI18n();
  const rows: Array<{ key: VocabDifficulty; title: string; body: string }> = [
    { key: 1, title: "필수 기초", body: DIFFICULTY_LABELS[1].description },
    { key: 2, title: "빈출 핵심", body: DIFFICULTY_LABELS[2].description },
    { key: 3, title: "점수 상승", body: DIFFICULTY_LABELS[3].description },
    { key: 4, title: "고득점 어휘", body: DIFFICULTY_LABELS[4].description },
    { key: 5, title: "최상위 표현", body: DIFFICULTY_LABELS[5].description },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.dim}>
        <View style={styles.guideCard}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.guideTitle}>{t("단어 레벨 가이드")}</Text>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingTop: 12 }}>
            {rows.map((r) => (
              <View key={r.key} style={{ marginBottom: 12 }}>
                <Row style={{ alignItems: "center" }}>
                  <Badge label={DIFFICULTY_LABELS[r.key].shortBadge} tone="violet" />
                  <Text style={styles.guideRowTitle}>{t(r.title)}</Text>
                </Row>
                <Text style={styles.guideRowBody}>{t(r.body)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreateStudySetModal({
  visible,
  close,
  onCreate,
}: {
  visible: boolean;
  close: () => void;
  onCreate: (input: { title: string; rows: Array<{ word: string; reading: string; meaningKo: string }> }) => void;
}) {
  const { t, tm } = useI18n();
  const [title, setTitle] = useState("내 단어장");
  const [rawText, setRawText] = useState("");
  const rows = useMemo(() => parseSetRows(rawText), [rawText]);

  const exampleText = [
    "少子化\tしょうしか\t저출산",
    "高齢化\tこうれいか\t고령화",
    "景気\tけいき\t경기",
    "市場\tしじょう\t시장",
  ].join("\n");

  function create() {
    if (!rows.length) {
      Alert.alert(t("세트 만들기"), t("Quizlet처럼 한 줄에 단어, 독음, 뜻을 입력해주세요."));
      return;
    }
    onCreate({ title, rows });
    setTitle("내 단어장");
    setRawText("");
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalSafe}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.modalScroll}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t("새 단어장 만들기")}</Text>
              <Text style={styles.muted}>{t("Quizlet처럼 줄 단위로 단어를 붙여넣어 세트를 만듭니다.")}</Text>
            </View>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>

          <Text style={styles.inputLabel}>{t("세트 이름")}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("예: 종과 경제 시험 전 암기")}
            placeholderTextColor="#7B82A6"
            style={styles.textInput}
          />

          <Row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <Text style={styles.inputLabelNoMargin}>{t("단어 붙여넣기")}</Text>
            <Pressable style={({ pressed }) => [styles.exampleBtn, pressed && { opacity: 0.9 }]} onPress={() => setRawText(exampleText)}>
              <Text style={styles.exampleBtnText}>{t("예시 넣기")}</Text>
            </Pressable>
          </Row>
          <Text style={styles.helperText}>{t("형식: 일본어 단어 [탭/쉼표] 독음 [탭/쉼표] 뜻")}</Text>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            placeholder={"少子化\tしょうしか\t저출산\n景気\tけいき\t경기"}
            placeholderTextColor="#6F769B"
            multiline
            textAlignVertical="top"
            style={styles.bulkInput}
          />

          <Card style={{ marginTop: 14 }}>
            <Text style={styles.setTitle}>{t("미리보기")} · {rows.length}{t("개")}</Text>
            {rows.slice(0, 5).map((row, idx) => (
              <View key={`${row.word}_${idx}`} style={styles.previewRow}>
                <Text style={styles.previewWord}>{row.word}</Text>
                <Text style={styles.previewMeta}>{row.reading} · {tm(row.meaningKo)}</Text>
              </View>
            ))}
            {!rows.length ? <Text style={styles.muted}>{t("아직 인식된 단어가 없습니다.")}</Text> : null}
          </Card>

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={create}>
            <Text style={styles.primaryBtnText}>{t("세트 만들기")}</Text>
          </Pressable>
          <View style={{ height: 110 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.pageX },
  scroll: { paddingTop: 20, paddingBottom: 118 },
  pageTitle: { color: COLORS.text, fontSize: TYPO.h1, fontWeight: "800" },
  muted: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
  guideBtn: { backgroundColor: "#2A245B", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.line },
  guideText: { color: "#C7B8FF", fontWeight: "800", fontSize: TYPO.small },
  rightHint: { color: "#BCA8FF", fontWeight: "800", fontSize: TYPO.small },
  searchWrap: {
    flex: 1,
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
  searchInput: { flex: 1, color: COLORS.text, fontWeight: "700" },
  continueCard: { marginBottom: 14, borderColor: "#4E56B8" },
  continueKicker: { color: "#BCA8FF", fontWeight: "900", fontSize: TYPO.small },
  continueTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h2, marginTop: 5 },
  continueButton: { minHeight: 44, borderRadius: 999, backgroundColor: COLORS.blue, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  continueButtonText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  activeSetFilter: { marginBottom: 12, borderColor: "#4E56B8", flexDirection: "row", alignItems: "center", gap: 12 },
  activeSetTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  clearSetFilter: { minHeight: 40, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  clearSetFilterText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  tabChip: { backgroundColor: COLORS.card2, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.lineSoft },
  tabChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  tabChipText: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  tabChipTextActive: { color: COLORS.text },
  sortBtn: { backgroundColor: COLORS.card2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.lineSoft },
  sortText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  wordCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  wordContent: { flex: 1, minHeight: 62, justifyContent: "center" },
  word: { color: COLORS.text, fontSize: TYPO.h2, fontWeight: "800" },
  reading: { color: COLORS.muted, marginTop: 4, fontWeight: "700" },
  meaning: { color: COLORS.text, marginTop: 4, fontWeight: "800" },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft, justifyContent: "center", alignItems: "center" },
  iconCircleActive: { backgroundColor: "rgba(255, 209, 102, 0.14)", borderColor: "rgba(255, 209, 102, 0.42)" },
  iconCircleText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  metaText: { color: COLORS.muted, fontWeight: "700", fontSize: TYPO.small },
  matchText: { color: "#C7B8FF", fontWeight: "700", marginTop: 10, fontSize: TYPO.small },
  curiosityPanel: {
    marginTop: 12,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: "rgba(103,217,255,0.26)",
    backgroundColor: "rgba(103,217,255,0.08)",
    padding: 12,
  },
  curiosityLabel: { color: COLORS.cyan, fontWeight: "900", fontSize: TYPO.small, marginBottom: 6 },
  curiosityExample: { color: COLORS.text, fontWeight: "700", lineHeight: TYPO.bodyLine, fontSize: TYPO.small },
  curiosityMeta: { color: COLORS.muted, fontWeight: "700", marginTop: 6, fontSize: TYPO.small },
  dictionaryCard: { borderColor: "rgba(103,217,255,0.34)" },
  dictionaryKicker: { color: COLORS.cyan, fontWeight: "900", fontSize: TYPO.small, marginBottom: 8 },
  curiositySaveCard: { borderColor: "rgba(103,217,255,0.34)" },
  curiositySaveBtn: { minHeight: 48, borderRadius: 16, backgroundColor: COLORS.blue, justifyContent: "center", alignItems: "center", paddingHorizontal: 14, marginTop: 14 },
  curiositySaveText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  folderGuide: { marginBottom: 12, borderColor: "#4E56B8" },
  folderGuideTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  folderGuideText: { color: COLORS.muted, lineHeight: TYPO.bodyLine, fontSize: TYPO.small, marginTop: 6 },
  createSetBtn: { minHeight: 46, borderRadius: 16, backgroundColor: COLORS.blue, justifyContent: "center", alignItems: "center", paddingHorizontal: 14 },
  createSetBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  folderTabs: { gap: 8, paddingBottom: 8 },
  setGroup: { marginBottom: 14 },
  folderSubtitle: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginBottom: 10 },
  setBadgeRow: { marginTop: 10, marginBottom: 2, flexWrap: "wrap" },
  setCard: { backgroundColor: COLORS.card, borderRadius: RADII.cardLg, borderWidth: 1, borderColor: COLORS.lineSoft, padding: SPACING.lg, flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.md },
  setTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3, marginBottom: 2 },
  chevron: { color: COLORS.muted, fontSize: TYPO.h2, fontWeight: "800" },
  modalSafe: { flex: 1, backgroundColor: COLORS.bg },
  modalScroll: { paddingTop: 18, paddingBottom: 115 },
  modalTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h2 },
  closeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lineSoft, justifyContent: "center", alignItems: "center" },
  closeText: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  filterSummaryCard: { borderColor: "#4E56B8" },
  filterSummaryLabel: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  filterSummaryValue: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3, marginTop: 4 },
  filterSummaryHint: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 6 },
  resetBtn: { minHeight: 40, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  resetText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  sortCard: { borderColor: "rgba(80,98,255,0.42)" },
  detailFilterCard: { marginTop: 12, borderColor: COLORS.lineSoft },
  detailTabRow: { gap: 8, paddingTop: 12, paddingBottom: 4 },
  detailTab: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 13,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  detailTabActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  detailTabText: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small },
  detailTabTextActive: { color: COLORS.text },
  filterGroupCard: { paddingVertical: 14, marginTop: 10 },
  filterGroupHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  quickFilterTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body, marginTop: 14 },
  quickFilterTitleNoMargin: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  filterGroupTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  filterGroupDesc: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  advancedToggle: {
    marginTop: 12,
    borderRadius: RADII.card,
    padding: SPACING.lg,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  advancedToggleText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  advancedWrap: { marginTop: 2 },
  sectionToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionToggleTitle: { color: COLORS.text, fontWeight: "800" },
  sectionToggleRight: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.h3 },
  primaryBtn: { backgroundColor: COLORS.blue, borderRadius: 16, minHeight: 54, justifyContent: "center", alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  inputLabel: { color: COLORS.muted, fontWeight: "800", marginTop: 18, marginBottom: 8 },
  inputLabelNoMargin: { color: COLORS.muted, fontWeight: "800" },
  textInput: { backgroundColor: COLORS.field, borderRadius: 16, borderWidth: 1, borderColor: COLORS.lineSoft, minHeight: 54, paddingHorizontal: 14, color: COLORS.text, fontWeight: "700" },
  bulkInput: { backgroundColor: COLORS.field, borderRadius: 18, borderWidth: 1, borderColor: COLORS.lineSoft, minHeight: 210, padding: 14, color: COLORS.text, fontWeight: "700", lineHeight: TYPO.h3Line, marginTop: 8 },
  helperText: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 6 },
  exampleBtn: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, paddingHorizontal: 12, paddingVertical: 8 },
  exampleBtnText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  previewRow: { borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 10, marginTop: 10 },
  previewWord: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  previewMeta: { color: COLORS.muted, fontWeight: "700", marginTop: 3 },
  dim: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "center", padding: 22 },
  guideCard: { backgroundColor: "#0A0D35", borderRadius: 22, borderWidth: 1, borderColor: "#4E56B8", padding: 16 },
  guideTitle: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  guideRowTitle: { color: COLORS.text, fontWeight: "800" },
  guideRowBody: { color: COLORS.muted, lineHeight: TYPO.smallLine, fontSize: TYPO.small, marginTop: 6 },
});
