import React, { useEffect, useMemo, useState } from "react";
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
import { DifficultyBadge } from "../components/DifficultyBadge";
import { Badge, Card, EmptyState, PillButton, ProgressBar, Row, SectionHeader } from "../components/common";
import { useI18n } from "../i18n";
import { COLORS, RADII, SPACING, TYPO } from "../theme";
import { getLearningCourseMeta, LEARNING_COURSES, wordMatchesLearningCourse } from "../data/learningCatalog";
import { LearningCourse, StudySet, UserStudyFolder, VocabDifficulty, VocabItem } from "../types";
import { validateBulkScheduleImportText, validateRequiredText } from "../utils/validation";
import { parseStudySetRows } from "../utils/studySetRows";

type WrongWordStat = {
  wrong: number;
  recent: number;
};

type WrongWordStats = Record<string, WrongWordStat>;

type SortKey =
  | "중요도순"
  | "기출 빈도순"
  | "최근 출현순"
  | "쉬운 단어부터"
  | "고득점 단어부터"
  | "오답 많은 순"
  | "내가 모르는 단어순";

const SORTS: SortKey[] = [
  "중요도순",
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
  "영어",
  "TOEIC",
  "실용일본어",
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
  "수학",
  "생물",
  "이과",
  "출원 영어",
  "TOEIC RC",
  "TOEIC LC",
  "비즈니스 영어",
  "스타트업 영어",
  "비즈니스 일본어",
  "대학생 표현",
  "별표 단어",
  "형광펜 단어",
  "오답 단어",
] as const;

type FilterKey = (typeof FILTERS)[number];

const QUICK_FILTERS: FilterKey[] = [
  "전체",
  "빈출 핵심",
  "300점 목표",
  "영어",
  "TOEIC",
  "청독해",
  "별표 단어",
  "오답 단어",
];

const WORD_RENDER_BATCH = 72;
const WORD_RENDER_STEP = 72;

type FilterGroupKey = "level" | "target" | "subject" | "type" | "sougou" | "personal";

type FilterGroupConfig = {
  key: FilterGroupKey;
  title: string;
  description: string;
  filters: FilterKey[];
};

const FILTER_GROUPS: FilterGroupConfig[] = [
  {
    key: "level",
    title: "난이도",
    description: "빈도와 난이도를 섞지 않고 쉬운 단어와 심화어를 분리해서 보기",
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
    description: "일본어, 영어, 실용일본어, 청독해, 기술문, EJU 문과/이과",
    filters: ["일본어", "영어", "TOEIC", "실용일본어", "청독해", "기술문", "종합과목", "이과"],
  },
  {
    key: "type",
    title: "문제 유형",
    description: "독해와 청독해에서 자주 쓰는 유형",
    filters: ["어휘 추론", "주장 파악", "근거 찾기", "문맥 이해", "자료형"],
  },
  {
    key: "sougou",
    title: "주제",
    description: "문과 종합과목, 이과, 영어, 실전 일본어 주제",
    filters: ["사회", "경제", "정치", "세계사", "환경", "수학", "생물", "이과", "출원 영어", "TOEIC RC", "TOEIC LC", "비즈니스 영어", "스타트업 영어", "비즈니스 일본어", "대학생 표현"],
  },
  {
    key: "personal",
    title: "내 단어",
    description: "별표, 형광펜, 오답 단어만 보기",
    filters: ["별표 단어", "형광펜 단어", "오답 단어"],
  },
];

function scopedSorts(course?: LearningCourse): SortKey[] {
  if (course === "EJU_JAPANESE" || course === "EJU_SOGO") {
    return ["중요도순", "기출 빈도순", "쉬운 단어부터", "오답 많은 순"];
  }
  if (course === "EJU_SCIENCE") {
    return ["중요도순", "쉬운 단어부터", "고득점 단어부터", "오답 많은 순"];
  }
  return ["중요도순", "쉬운 단어부터", "고득점 단어부터", "오답 많은 순"];
}

function scopedQuickFilters(course?: LearningCourse): FilterKey[] {
  if (course === "EJU_JAPANESE") {
    return ["전체", "빈출 핵심", "300점 목표", "350+", "청독해", "기술문", "오답 단어"];
  }
  if (course === "EJU_SOGO") {
    return ["전체", "빈출 핵심", "300점 목표", "사회", "경제", "오답 단어"];
  }
  if (course === "EJU_SCIENCE") {
    return ["전체", "이과", "수학", "생물", "오답 단어"];
  }
  if (course === "ADMISSION_ENGLISH") {
    return ["전체", "출원 영어", "300점 목표", "350+", "오답 단어"];
  }
  if (course === "TOEIC_BUSINESS") {
    return ["전체", "TOEIC", "TOEIC RC", "TOEIC LC", "비즈니스 영어", "오답 단어"];
  }
  if (course === "STARTUP_BUSINESS_ENGLISH") {
    return ["전체", "스타트업 영어", "비즈니스 영어", "350+", "오답 단어"];
  }
  if (course === "BUSINESS_JAPANESE") {
    return ["전체", "비즈니스 일본어", "300점 목표", "오답 단어"];
  }
  if (course === "CAMPUS_JAPANESE") {
    return ["전체", "대학생 표현", "실용일본어", "오답 단어"];
  }
  return QUICK_FILTERS;
}

function groupByKey(key: FilterGroupKey) {
  return FILTER_GROUPS.find((group) => group.key === key) || FILTER_GROUPS[0];
}

function scopedFilterGroups(course?: LearningCourse): FilterGroupConfig[] {
  if (course === "EJU_JAPANESE") {
    return [
      groupByKey("level"),
      groupByKey("target"),
      { key: "subject", title: "영역", description: "EJU 일본어에 필요한 영역만 보기", filters: ["일본어", "청독해", "기술문"] },
      groupByKey("type"),
      groupByKey("personal"),
    ];
  }
  if (course === "EJU_SOGO") {
    return [
      groupByKey("level"),
      groupByKey("target"),
      { key: "sougou", title: "주제", description: "문과 종합과목 주제별 단어", filters: ["사회", "경제", "정치", "세계사", "환경"] },
      groupByKey("personal"),
    ];
  }
  if (course === "EJU_SCIENCE") {
    return [
      groupByKey("level"),
      { key: "subject", title: "영역", description: "이과 수학·생물 단어만 보기", filters: ["이과", "수학", "생물"] },
      groupByKey("personal"),
    ];
  }
  if (course === "ADMISSION_ENGLISH") {
    return [
      groupByKey("target"),
      { key: "subject", title: "영역", description: "입시 영어와 영어 시험 표현", filters: ["출원 영어"] },
      groupByKey("personal"),
    ];
  }
  if (course === "TOEIC_BUSINESS") {
    return [
      groupByKey("level"),
      { key: "subject", title: "영역", description: "TOEIC와 비즈니스 영어만 보기", filters: ["TOEIC", "TOEIC RC", "TOEIC LC", "비즈니스 영어"] },
      groupByKey("personal"),
    ];
  }
  if (course === "STARTUP_BUSINESS_ENGLISH") {
    return [
      { key: "subject", title: "영역", description: "스타트업과 실무 영어 표현", filters: ["스타트업 영어", "비즈니스 영어"] },
      groupByKey("target"),
      groupByKey("personal"),
    ];
  }
  if (course === "BUSINESS_JAPANESE") {
    return [
      { key: "subject", title: "영역", description: "회사 실무 일본어 표현", filters: ["비즈니스 일본어"] },
      groupByKey("target"),
      groupByKey("personal"),
    ];
  }
  if (course === "CAMPUS_JAPANESE") {
    return [
      { key: "subject", title: "영역", description: "대학생 말투와 실사용 일본어", filters: ["대학생 표현", "실용일본어"] },
      groupByKey("target"),
      groupByKey("personal"),
    ];
  }
  return FILTER_GROUPS;
}

function scopedAvailableFilters(course?: LearningCourse): FilterKey[] {
  const filters = ["전체", ...scopedQuickFilters(course), ...scopedFilterGroups(course).flatMap((group) => group.filters)];
  return Array.from(new Set(filters)) as FilterKey[];
}

type SetFolderKey =
  | "전체 세트"
  | "EJU 단어"
  | "EJU 문과"
  | "EJU 이과"
  | "TOEIC 영어"
  | "TOEFL·IELTS"
  | "비즈니스"
  | "실사용 일본어"
  | "개인·과제";

type SetFolder = {
  key: SetFolderKey;
  title: string;
  subtitle: string;
};

function displayLibraryLabel(label: string) {
  if (label === "영어·출원") return "TOEFL·IELTS";
  if (label === "출원 영어") return "TOEFL·IELTS";
  if (label === "개인·과제") return "내가 추가한 세트";
  if (label === "종합과목") return "EJU 문과";
  return label;
}

function difficultyDisplayLabel(difficulty: VocabDifficulty) {
  if (difficulty === 1) return "기초";
  if (difficulty === 2) return "쉬움";
  if (difficulty === 3) return "보통";
  if (difficulty === 4) return "어려움";
  return "심화";
}

const SET_FOLDERS: SetFolder[] = [
  {
    key: "개인·과제",
    title: "내가 추가한 세트",
    subtitle: "직접 만든 세트, 사본, 형광펜, 진단 기반 세트",
  },
  {
    key: "EJU 단어",
    title: "EJU 단어",
    subtitle: "최빈출, 목표 점수, 독해·청독해·기술문 세트",
  },
  {
    key: "TOEIC 영어",
    title: "TOEIC 영어",
    subtitle: "RC·LC 빈출 어휘와 업무 상황 표현",
  },
  {
    key: "TOEFL·IELTS",
    title: "TOEFL·IELTS",
    subtitle: "일본 대학 지원에 필요한 영어 시험 표현",
  },
  {
    key: "비즈니스",
    title: "비즈니스",
    subtitle: "스타트업 영어, 실무 문장, 비즈니스 일본어",
  },
  {
    key: "실사용 일본어",
    title: "실사용 일본어",
    subtitle: "JLPT 밖의 대학생 표현, SNS 말투, 캠퍼스 일본어",
  },
  {
    key: "EJU 문과",
    title: "EJU 문과",
    subtitle: "종합과목: 지리·세계사·경제·정치·사회",
  },
  {
    key: "EJU 이과",
    title: "EJU 이과",
    subtitle: "수학 코스1·하이레벨 수학·생물",
  },
];

const FOLDER_PRIORITY_BY_COURSE: Record<LearningCourse, SetFolderKey[]> = {
  EJU_JAPANESE: ["개인·과제", "EJU 단어", "EJU 문과", "EJU 이과", "실사용 일본어", "TOEIC 영어", "TOEFL·IELTS", "비즈니스"],
  EJU_SOGO: ["개인·과제", "EJU 문과", "EJU 단어", "EJU 이과", "실사용 일본어", "TOEIC 영어", "TOEFL·IELTS", "비즈니스"],
  EJU_SCIENCE: ["개인·과제", "EJU 이과", "EJU 단어", "EJU 문과", "실사용 일본어", "TOEIC 영어", "TOEFL·IELTS", "비즈니스"],
  TOEIC_BUSINESS: ["개인·과제", "TOEIC 영어", "비즈니스", "TOEFL·IELTS", "EJU 단어", "EJU 문과", "EJU 이과", "실사용 일본어"],
  ADMISSION_ENGLISH: ["개인·과제", "TOEFL·IELTS", "TOEIC 영어", "비즈니스", "EJU 단어", "EJU 문과", "EJU 이과", "실사용 일본어"],
  STARTUP_BUSINESS_ENGLISH: ["개인·과제", "비즈니스", "TOEIC 영어", "TOEFL·IELTS", "EJU 단어", "EJU 문과", "EJU 이과", "실사용 일본어"],
  BUSINESS_JAPANESE: ["개인·과제", "비즈니스", "실사용 일본어", "EJU 단어", "EJU 문과", "EJU 이과", "TOEIC 영어", "TOEFL·IELTS"],
  CAMPUS_JAPANESE: ["개인·과제", "실사용 일본어", "비즈니스", "EJU 단어", "EJU 문과", "EJU 이과", "TOEIC 영어", "TOEFL·IELTS"],
};

const SET_ORDER = [
  "set_curiosity",
  "set_favorites",
  "set_highlight",
  "set_wrong",
  "set_recent_eju_2016_2025",
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
  "set_science_math_course1",
  "set_science_math_advanced",
  "set_science_biology_ecology",
  "set_toeic_top_frequency",
  "set_toeic5_hard_first",
  "set_toeic5_hard_only",
  "set_toeic5_core_frequency",
  "set_toeic_rc_vocabulary",
  "set_toeic_lc_workplace",
  "set_toeic_business_phrases",
  "set_english_admission",
  "set_startup_business_english",
  "set_business_english_sentences",
  "set_business_japanese",
  "set_campus_japanese",
];

function setOrderIndex(set: StudySet, learningCourse: LearningCourse) {
  const prioritySetIds =
    learningCourse === "EJU_JAPANESE"
      ? ["set_recent_eju_2016_2025", "set_top100", "set_300", "set_table", "set_geography", "set_economy", "set_civics", "set_history"]
      : learningCourse === "EJU_SOGO"
      ? ["set_economy", "set_society", "set_civics", "set_geography", "set_history", "set_recent_eju_2016_2025", "set_top100"]
      : learningCourse === "EJU_SCIENCE"
      ? ["set_science_math_course1", "set_science_math_advanced", "set_science_biology_ecology", "set_environment_global", "set_recent_eju_2016_2025", "set_top100"]
      : learningCourse === "TOEIC_BUSINESS"
      ? ["set_toeic_top_frequency", "set_toeic5_hard_first", "set_toeic5_hard_only", "set_toeic5_core_frequency", "set_toeic_rc_vocabulary", "set_toeic_lc_workplace", "set_toeic_business_phrases", "set_business_english_sentences", "set_english_admission"]
      : [];
  const priorityIdx = prioritySetIds.indexOf(set.id);
  if (priorityIdx >= 0) return priorityIdx;
  const idx = SET_ORDER.indexOf(set.id);
  return idx >= 0 ? idx : 100 + set.createdAt;
}

function setFolderKey(set: StudySet): SetFolderKey {
  if (set.createdFrom === "diagnostic" || set.createdFrom === "highlight" || set.createdFrom === "wrong" || set.createdFrom === "learning" || set.createdFrom === "teacher" || set.createdFrom === "custom") {
    return "개인·과제";
  }

  if (["set_toeic_top_frequency", "set_toeic5_hard_first", "set_toeic5_hard_only", "set_toeic5_core_frequency", "set_toeic_rc_vocabulary", "set_toeic_lc_workplace"].includes(set.id)) return "TOEIC 영어";
  if (["set_english_admission"].includes(set.id)) return "TOEFL·IELTS";
  if (["set_startup_business_english", "set_business_english_sentences", "set_toeic_business_phrases", "set_business_japanese"].includes(set.id)) return "비즈니스";
  if (["set_campus_japanese"].includes(set.id)) return "실사용 일본어";
  if (["set_science_math_course1", "set_science_math_advanced", "set_science_biology_ecology"].includes(set.id)) return "EJU 이과";
  if (["set_recent_eju_2016_2025", "set_top100", "set_200", "set_300", "set_350"].includes(set.id)) return "EJU 단어";
  if (["set_reason", "set_claim", "set_reading_context", "set_reading_relation", "set_academic_abstract", "set_table", "set_listening_notice", "set_writing"].includes(set.id)) return "EJU 단어";
  if (["set_geography", "set_geo_skills", "set_geo_climate_resources", "set_geo_population_city", "set_world_history_textbook", "set_modern_world_history", "set_contemporary_history", "set_history"].includes(set.id)) return "EJU 문과";
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
  ].includes(set.id)) return "EJU 문과";
  if (["set_society", "set_civics", "set_politics_textbook", "set_democracy_rights", "set_local_autonomy", "set_international_society", "set_un_peace", "set_modern_society", "set_environment_global"].includes(set.id)) return "EJU 문과";

  if (set.weakTypes.some((type) => ["근거 찾기", "주장 파악", "자료형", "기술문 표현"].includes(type))) return "EJU 단어";
  if (set.weakTypes.some((type) => ["TOEIC", "TOEIC RC", "TOEIC LC"].includes(type))) return "TOEIC 영어";
  if (set.weakTypes.some((type) => ["출원 영어", "TOEFL", "IELTS"].includes(type))) return "TOEFL·IELTS";
  if (set.weakTypes.some((type) => ["스타트업 영어", "비즈니스 영어", "실무 문장", "비즈니스 일본어"].includes(type))) return "비즈니스";
  if (set.weakTypes.some((type) => ["대학생 표현", "신조어", "실사용 일본어"].includes(type))) return "실사용 일본어";
  if (set.weakTypes.some((type) => ["EJU 이과", "이과 수학", "하이레벨 수학", "생물", "생태와 환경"].includes(type))) return "EJU 이과";
  if (set.weakTypes.some((type) => ["세계사", "지리", "경제", "경제 정책", "사회 문제", "정치 제도", "국제사회", "환경"].includes(type))) return "EJU 문과";
  return "EJU 단어";
}

function orderedSetFolders(learningCourse: LearningCourse) {
  const priority = FOLDER_PRIORITY_BY_COURSE[learningCourse] || FOLDER_PRIORITY_BY_COURSE.EJU_JAPANESE;
  return priority
    .map((key) => SET_FOLDERS.find((folder) => folder.key === key))
    .filter((folder): folder is SetFolder => Boolean(folder));
}

function shouldShowSetInLibrary(set: StudySet) {
  if (setFolderKey(set) !== "개인·과제") return true;
  return set.wordCount > 0;
}

function setFolderFilters(learningCourse: LearningCourse, studySets: StudySet[]): SetFolderKey[] {
  const hasPersonalSets = studySets.some((set) => setFolderKey(set) === "개인·과제" && set.wordCount > 0);
  return [
    "전체 세트",
    ...orderedSetFolders(learningCourse)
      .filter((folder) => folder.key !== "개인·과제" || hasPersonalSets)
      .map((folder) => folder.key),
  ];
}

function groupedStudySets(studySets: StudySet[], folderFilter: SetFolderKey, learningCourse: LearningCourse) {
  const sorted = studySets
    .filter(shouldShowSetInLibrary)
    .slice()
    .sort((a, b) => setOrderIndex(a, learningCourse) - setOrderIndex(b, learningCourse));
  return orderedSetFolders(learningCourse).map((folder) => ({
    ...folder,
    sets: sorted.filter((set) => setFolderKey(set) === folder.key),
  })).filter((folder) => folder.sets.length > 0 && (folderFilter === "전체 세트" || folder.key === folderFilter));
}

function mostRecentYear(item: VocabItem) {
  return item.appearedIn.length ? item.appearedIn[0].year : 0;
}

function importanceRank(item: VocabItem) {
  if (item.importance === "최우선") return 4;
  if (item.importance === "매우 중요") return 3;
  if (item.importance === "중요") return 2;
  return 1;
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
  return item.part === "궁금한 일본어" || item.part === "궁금한 표현" || item.part === "궁금한 전문 영어" || item.questionTypes.includes("개인 검색");
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
  if (filter === "영어") return item.subject === "영어";
  if (filter === "TOEIC") return item.subject === "영어" && item.questionTypes.includes("TOEIC");
  if (filter === "실용일본어") return item.subject === "실용일본어";
  if (filter === "청독해") return item.subject === "청독해";
  if (filter === "기술문") return item.subject === "기술문";
  if (filter === "종합과목") return item.subject === "종합과목";

  if (filter === "사회" || filter === "경제" || filter === "정치" || filter === "세계사" || filter === "환경") {
    return item.part === filter;
  }
  if (filter === "수학") return item.part.includes("수학") || item.questionTypes.some((type) => type.includes("수학"));
  if (filter === "생물") return item.part.includes("생물") || item.questionTypes.some((type) => type.includes("생물") || type.includes("생태"));
  if (filter === "이과") return item.subject === "EJU 이과" || item.questionTypes.some((type) => type.includes("이과")) || item.part.includes("수학") || item.part.includes("생물");

  if (filter === "출원 영어") return item.part === "출원 영어" || item.questionTypes.includes("출원 영어");
  if (filter === "TOEIC RC") return item.questionTypes.includes("TOEIC RC");
  if (filter === "TOEIC LC") return item.questionTypes.includes("TOEIC LC");
  if (filter === "비즈니스 영어") return item.questionTypes.includes("비즈니스 영어");
  if (filter === "스타트업 영어") return item.questionTypes.includes("스타트업 영어");
  if (filter === "비즈니스 일본어") return item.questionTypes.includes("비즈니스 일본어");
  if (filter === "대학생 표현") return item.questionTypes.includes("대학생 표현");

  if (filter === "형광펜 단어") return item.sourceType === "형광펜";
  if (filter === "별표 단어") return item.isFavorite;
  if (filter === "오답 단어") return (wrongWordStats[item.id]?.wrong || 0) > 0;

  return item.questionTypes.includes(filter);
}

function filterGroupKeyFor(filter: FilterKey, filterGroups: FilterGroupConfig[]) {
  return filterGroups.find((group) => group.filters.includes(filter))?.key || "misc";
}

function applyFilterCombination(
  item: VocabItem,
  filters: FilterKey[],
  filterGroups: FilterGroupConfig[],
  wrongWordStats: WrongWordStats
) {
  const activeFilters = filters.filter((filter) => filter !== "전체");
  if (!activeFilters.length) return true;

  const grouped = new Map<string, FilterKey[]>();
  activeFilters.forEach((filter) => {
    const key = filterGroupKeyFor(filter, filterGroups);
    grouped.set(key, (grouped.get(key) || []).concat(filter));
  });

  for (const groupFilters of grouped.values()) {
    if (!groupFilters.some((filter) => applyFilter(item, filter, wrongWordStats))) return false;
  }
  return true;
}

function sortItems(items: VocabItem[], sortKey: SortKey, wrongWordStats: WrongWordStats) {
  const arr = items.slice();
  arr.sort((a, b) => {
    if (sortKey === "중요도순") return importanceRank(b) - importanceRank(a) || b.difficulty - a.difficulty || b.frequencyScore - a.frequencyScore;
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
  learningCourse = "EJU_JAPANESE",
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
  onChangeLearningCourse,
}: {
  vocab: VocabItem[];
  studySets: StudySet[];
  userFolders: UserStudyFolder[];
  initialQuery: string;
  defaultSort: SortKey;
  learningCourse?: LearningCourse;
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
  onChangeLearningCourse?: (course: LearningCourse) => void;
}) {
  const { t, tm, language } = useI18n();
  const [mode, setMode] = useState<"단어" | "세트">(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort);
  const [setFolder, setSetFolder] = useState<SetFolderKey>("전체 세트");
  const [filterModal, setFilterModal] = useState(false);
  const [courseModal, setCourseModal] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [expandedSetGroups, setExpandedSetGroups] = useState<Record<string, boolean>>({});
  const [visibleWordCount, setVisibleWordCount] = useState(WORD_RENDER_BATCH);
  const courseSorts = useMemo(() => scopedSorts(learningCourse), [learningCourse]);
  const courseFilters = useMemo(() => scopedAvailableFilters(learningCourse), [learningCourse]);
  const filterGroups = useMemo(() => scopedFilterGroups(learningCourse), [learningCourse]);
  const activeFilterLabel = useMemo(() => {
    if (!filters.length) return t("전체");
    if (filters.length <= 2) return filters.map((item) => t(displayLibraryLabel(item))).join(" · ");
    return `${t(displayLibraryLabel(filters[0]))} +${filters.length - 1}`;
  }, [filters, t]);

  useEffect(() => {
    setVisibleWordCount(WORD_RENDER_BATCH);
  }, [filters, mode, query, setWordFilter, sortKey, learningCourse]);

  useEffect(() => {
    setFilters((prev) => prev.filter((filter) => courseFilters.includes(filter)));
    if (!courseSorts.includes(sortKey)) setSortKey(courseSorts[0] || "중요도순");
  }, [courseFilters, courseSorts, sortKey]);

  const courseMeta = useMemo(() => getLearningCourseMeta(learningCourse), [learningCourse]);
  const currentCourseWords = useMemo(
    () => vocab.filter((word) => wordMatchesLearningCourse(word, learningCourse)),
    [learningCourse, vocab]
  );

  const filteredWords = useMemo(() => {
    const q = query.trim();
    const setWordIdSet = setWordFilter ? new Set(setWordFilter.wordIds) : null;
    const personalFilter = filters.some((filter) => filter === "별표 단어" || filter === "형광펜 단어" || filter === "오답 단어");
    const baseVocab = setWordIdSet || personalFilter ? vocab : currentCourseWords;
    const bySet = setWordIdSet ? baseVocab.filter((v) => setWordIdSet.has(v.id)) : baseVocab;
    const byFilter = bySet.filter((v) => applyFilterCombination(v, filters, filterGroups, wrongWordStats));
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
  }, [currentCourseWords, vocab, query, filters, filterGroups, sortKey, setWordFilter, wrongWordStats]);

  const dictionaryResult = useMemo(() => {
    if (filteredWords.length || !query.trim() || setWordFilter) return null;
    return onLookupDictionary?.(query) || null;
  }, [filteredWords.length, onLookupDictionary, query, setWordFilter]);
  const visibleWords = useMemo(() => filteredWords.slice(0, visibleWordCount), [filteredWords, visibleWordCount]);
  const hiddenWordCount = Math.max(0, filteredWords.length - visibleWords.length);

  const setGroups = useMemo(
    () => groupedStudySets(studySets, setFolder, learningCourse),
    [learningCourse, studySets, setFolder]
  );
  const folderFilters = useMemo(() => setFolderFilters(learningCourse, studySets), [learningCourse, studySets]);
  useEffect(() => {
    if (!folderFilters.includes(setFolder)) setSetFolder("전체 세트");
  }, [folderFilters, setFolder]);
  const continueSet = useMemo(
    () =>
      studySets
        .filter((set) => set.wordCount > 0 && setFolderKey(set) !== "개인·과제")
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
          <Pressable onPress={() => setGuideOpen(true)} style={({ pressed }) => [styles.guideBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("난이도 가이드")}>
            <Text style={styles.guideText}>{t("난이도 가이드")}</Text>
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
            <Pressable style={({ pressed }) => [styles.tabChip, mode === "단어" && styles.tabChipActive, pressed && { opacity: 0.9 }]} onPress={() => setMode("단어")} accessibilityRole="tab" accessibilityLabel={t("단어")} accessibilityState={{ selected: mode === "단어" }}>
              <Text style={[styles.tabChipText, mode === "단어" && styles.tabChipTextActive]}>{t("단어")}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.tabChip, mode === "세트" && styles.tabChipActive, pressed && { opacity: 0.9 }]} onPress={() => setMode("세트")} accessibilityRole="tab" accessibilityLabel={t("세트")} accessibilityState={{ selected: mode === "세트" }}>
              <Text style={[styles.tabChipText, mode === "세트" && styles.tabChipTextActive]}>{t("세트")}</Text>
            </Pressable>
          </Row>
          <Pressable style={({ pressed }) => [styles.sortBtn, pressed && { opacity: 0.9 }]} onPress={() => setFilterModal(true)} accessibilityRole="button" accessibilityLabel={t("필터 · 정렬")}>
            <Text style={styles.sortText} numberOfLines={1}>{activeFilterLabel} · {t(sortKey)}</Text>
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
            {folderFilters.map((folder) => (
              <PillButton
                key={folder}
                label={displayLibraryLabel(folder)}
                selected={setFolder === folder}
                onPress={() => setSetFolder(folder)}
              />
            ))}
          </ScrollView>

          {setGroups.length ? (
            setGroups.map((group) => {
              const expanded = setFolder !== "전체 세트" || expandedSetGroups[group.key];
              const visibleSets = expanded ? group.sets : group.sets.slice(0, 3);
              return (
              <View key={group.key} style={styles.setGroup}>
                <SectionHeader
                  title={`${t(group.title)} · ${group.sets.length}${t("개 세트")}`}
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
                      : s.createdFrom === "learning"
                      ? "학습 중 세트"
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
                          <Badge label={displayLibraryLabel(setFolderKey(s))} tone="blue" />
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
          {!setWordFilter ? (
            <Card style={styles.courseScopeCard}>
              <Row style={{ alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLabel}>{t("학습 코스")}</Text>
                  <Text style={styles.courseScopeTitle}>{t(courseMeta.title)}</Text>
                  <Text style={styles.muted}>
                    {t("현재 코스 단어")} {currentCourseWords.length}{t("개")} · {t(courseMeta.subtitle)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setCourseModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t("학습 코스 변경")}
                  style={({ pressed }) => [styles.courseChangeBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.courseChangeText}>{t("변경")}</Text>
                </Pressable>
              </Row>
            </Card>
          ) : null}

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

          {filteredWords.length ? visibleWords.map((w) => {
            const reasons = matchReasons(w, query);
            const badge2 =
              w.subject === "EJU 이과"
                ? `${t("중요도")} ${t(w.importance)}`
                : `${t("기출")} ${w.occurrenceCount}${t("회")}`;
            const badge3 = displayLibraryLabel(w.questionTypes[0] || "문맥 이해");
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
                    <DifficultyBadge difficulty={difficultyKey(w)} />
                    <Badge label={badge2} tone="default" />
                    <Badge label={badge3} tone="blue" />
                  </Row>

                  <Row style={{ marginTop: 10, justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.metaText}>
                      {w.subject === "EJU 이과"
                        ? `${t("난이도")} ${w.difficulty} · ${t("중요도")} ${t(w.importance)} · ${t(displayLibraryLabel(w.subject))} ${t(displayLibraryLabel(w.part))}`
                        : `${t("빈출도")} ${w.frequencyScore} · ${t("중요도")} ${t(w.importance)} · ${t(displayLibraryLabel(w.subject))} ${t(displayLibraryLabel(w.part))}`}
                    </Text>
                    <Text style={styles.metaText}>
                      {t("난이도")} {difficultyKey(w)}/5 · {t(difficultyDisplayLabel(difficultyKey(w)))}
                    </Text>
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
                {t("기본 단어 DB에는 없지만, 사전처럼 뜻과 예문을 먼저 보여줍니다.")}
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
              body="한국어 뜻, 일본어·영어 단어, 읽는 법을 조금 더 짧게 입력해보세요. 실제 외부 사전/AI 검색은 백엔드 연결 후 확장할 수 있습니다."
            />
          ) : (
            sortKey === "오답 많은 순" || filters.includes("오답 단어") ? (
              <EmptyState
                title="아직 실제 오답 기록이 없습니다"
                body="퀴즈나 진단에서 틀린 단어가 생기면 여기에서 오답 많은 순으로 정리됩니다."
              />
            ) : (
              <EmptyState
                title={currentCourseWords.length ? "검색 결과가 없습니다" : "현재 코스에 단어가 없습니다"}
                body={
                  currentCourseWords.length
                    ? "필터를 줄이거나 단어, 뜻, 독음, 연도, 유형으로 다시 검색해보세요."
                    : "다른 학습코스를 선택해서 다시 확인해보세요."
                }
              />
            )
          )}
          {filteredWords.length && hiddenWordCount ? (
            <Pressable
              onPress={() => setVisibleWordCount((prev) => prev + WORD_RENDER_STEP)}
              style={({ pressed }) => [styles.loadMoreCard, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={t("단어 더 보기")}
            >
              <Text style={styles.loadMoreTitle}>{t("단어 더 보기")}</Text>
              <Text style={styles.loadMoreText}>
                {visibleWords.length}{t("개")} / {filteredWords.length}{t("개")} · {Math.min(hiddenWordCount, WORD_RENDER_STEP)}{t("개 더 보기")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <FilterSortModal
        visible={filterModal}
        close={() => setFilterModal(false)}
        filters={filters}
        setFilters={setFilters}
        sortKey={sortKey}
        setSortKey={setSortKey}
        learningCourse={learningCourse}
      />

      <CoursePickerModal
        visible={courseModal}
        close={() => setCourseModal(false)}
        learningCourse={learningCourse}
        onPick={(course) => {
          if (course === learningCourse) {
            setCourseModal(false);
            return;
          }
          setFilters([]);
          setSetFolder("전체 세트");
          onChangeLearningCourse?.(course);
          setCourseModal(false);
        }}
      />

      <LevelGuideModal visible={guideOpen} close={() => setGuideOpen(false)} />

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

function CoursePickerModal({
  visible,
  close,
  learningCourse,
  onPick,
}: {
  visible: boolean;
  close: () => void;
  learningCourse: LearningCourse;
  onPick: (course: LearningCourse) => void;
}) {
  const { t } = useI18n();

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalSafe}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.modalScroll}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t("학습 코스 선택")}</Text>
              <Text style={styles.filterSummaryHint}>{t("단어장에 표시할 학습 범위를 선택합니다.")}</Text>
            </View>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>

          <View style={{ marginTop: 14, gap: 10 }}>
            {LEARNING_COURSES.map((course) => {
              const selected = course.id === learningCourse;
              return (
                <Pressable
                  key={course.id}
                  onPress={() => onPick(course.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.courseOptionCard,
                    selected && styles.courseOptionCardActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseOptionTitle}>{t(course.title)}</Text>
                    <Text style={styles.courseOptionSubtitle}>{t(course.subtitle)}</Text>
                    <Text style={styles.muted}>{t(course.description)}</Text>
                  </View>
                  <View style={[styles.courseOptionDot, selected && styles.courseOptionDotActive]}>
                    {selected ? <Text style={styles.courseOptionCheck}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 110 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function FilterSortModal({
  visible,
  close,
  filters,
  setFilters,
  sortKey,
  setSortKey,
  learningCourse,
}: {
  visible: boolean;
  close: () => void;
  filters: FilterKey[];
  setFilters: React.Dispatch<React.SetStateAction<FilterKey[]>>;
  sortKey: SortKey;
  setSortKey: (s: SortKey) => void;
  learningCourse?: LearningCourse;
}) {
  const { t } = useI18n();
  const availableSorts = useMemo(() => scopedSorts(learningCourse), [learningCourse]);
  const quickFilters = useMemo(() => scopedQuickFilters(learningCourse), [learningCourse]);
  const filterGroups = useMemo(() => scopedFilterGroups(learningCourse), [learningCourse]);
  const activeFilters = filters.filter((filter) => filter !== "전체");
  const activeGroup = filterGroups.find((group) => activeFilters.some((filter) => group.filters.includes(filter)));
  const [detailGroupKey, setDetailGroupKey] = useState<FilterGroupKey>(activeGroup?.key || filterGroups[0]?.key || "level");
  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const detailGroup = filterGroups.find((group) => group.key === detailGroupKey) || filterGroups[0] || FILTER_GROUPS[0];

  useEffect(() => {
    if (!filterGroups.some((group) => group.key === detailGroupKey)) {
      setDetailGroupKey(activeGroup?.key || filterGroups[0]?.key || "level");
    }
  }, [activeGroup?.key, detailGroupKey, filterGroups]);

  function resetAll() {
    setFilters([]);
    setSortKey(availableSorts[0] || "중요도순");
  }

  function toggleFilter(filter: FilterKey) {
    if (filter === "전체") {
      setFilters([]);
      return;
    }
    setFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : prev.concat(filter)));
  }

  function toggleSort(nextSort: SortKey) {
    setSortKey(sortKey === nextSort ? availableSorts[0] || "중요도순" : nextSort);
  }

  const summaryText = activeFilters.length
    ? activeFilters.map((item) => t(displayLibraryLabel(item))).join(" · ")
    : t("현재 코스 전체");

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalSafe}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.modalScroll}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{t("정렬 · 필터")}</Text>
              <Text style={styles.filterSummaryHint}>{t("필요한 조건만 가볍게 조합하세요.")}</Text>
            </View>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>

          <Card style={styles.filterSummaryCard}>
            <Row style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterSummaryLabel}>{t("현재 보기")}</Text>
                <Text style={styles.filterSummaryValue}>{t(sortKey)} · {summaryText}</Text>
                <Text style={styles.filterSummaryHint}>
                  {activeFilters.length ? t("선택한 조건을 다시 누르면 해제됩니다.") : t("필터를 여러 개 조합할 수 있습니다.")}
                </Text>
                {activeFilters.length ? (
                  <View style={styles.selectedFilterWrap}>
                    {activeFilters.map((item) => (
                      <PillButton
                        key={`selected-${item}`}
                        label={`${displayLibraryLabel(item)} ×`}
                        selected
                        onPress={() => toggleFilter(item)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
              <Pressable onPress={resetAll} style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("초기화")}>
                <Text style={styles.resetText}>{t("초기화")}</Text>
              </Pressable>
            </Row>
          </Card>

          <SectionHeader title="정렬" />
          <Card style={styles.sortCard}>
            <View style={styles.compactChipWrap}>
              {availableSorts.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => toggleSort(s)}
                  style={({ pressed }) => [
                    styles.compactChip,
                    sortKey === s && styles.compactChipActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.compactChipText, sortKey === s && styles.compactChipTextActive]}>{t(s)}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <SectionHeader title="필터" />
          <Card style={styles.filterSummaryCard}>
            <Text style={styles.quickFilterTitleNoMargin}>{t("핵심 필터")}</Text>
            <View style={styles.compactChipWrap}>
              {quickFilters.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => toggleFilter(f)}
                  style={({ pressed }) => [
                    styles.compactChip,
                    (f === "전체" ? !activeFilters.length : activeFilters.includes(f)) && styles.compactChipActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.compactChipText,
                      (f === "전체" ? !activeFilters.length : activeFilters.includes(f)) && styles.compactChipTextActive,
                    ]}
                  >
                    {t(displayLibraryLabel(f))}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Pressable
            onPress={() => setShowDetailFilters((prev) => !prev)}
            style={({ pressed }) => [styles.advancedToggle, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel={t("세부 필터")}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.advancedToggleText}>{t("세부 필터")}</Text>
              <Text style={styles.filterGroupDesc}>
                {t(showDetailFilters ? "난이도, 목표 점수, 영역을 직접 고릅니다." : "필요할 때만 열어서 더 좁혀보세요.")}
              </Text>
            </View>
            <Ionicons name={showDetailFilters ? "chevron-up" : "chevron-down"} size={20} color={COLORS.muted} />
          </Pressable>

          {showDetailFilters ? (
            <Card style={styles.detailFilterCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detailTabRow}>
                {filterGroups.map((group) => (
                  <Pressable
                    key={group.key}
                    onPress={() => setDetailGroupKey(group.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: detailGroupKey === group.key }}
                    accessibilityLabel={t(group.title)}
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
              <View style={styles.compactChipWrap}>
                {detailGroup.filters.map((f) => (
                  <Pressable
                    key={`${detailGroup.key}-${f}`}
                    onPress={() => toggleFilter(f)}
                    style={({ pressed }) => [
                      styles.compactChip,
                      filters.includes(f) && styles.compactChipActive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={[styles.compactChipText, filters.includes(f) && styles.compactChipTextActive]}>
                      {t(displayLibraryLabel(f))}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={close} accessibilityRole="button" accessibilityLabel={t("적용")}>
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
    { key: 1, title: "필수 기초", body: "쉽고 자주 쓰이는 기본어입니다. 자주 나온다고 해서 자동으로 고난도에 올리지 않습니다." },
    { key: 2, title: "빈출 핵심", body: "기출·실전에서 자주 확인되는 핵심어입니다. 우선 암기용이지만 난이도는 중하로 봅니다." },
    { key: 3, title: "점수 상승", body: "문맥에서 헷갈리기 쉬운 단어입니다. 기본 단어를 넘어서 점수 차이를 만드는 구간입니다." },
    { key: 4, title: "고득점 어휘", body: "뜻이 추상적이거나 문제 안에서 응용되는 단어입니다. 고득점 목표 학습에 우선 배치됩니다." },
    { key: 5, title: "최상위 표현", body: "기술문·학술문·전문 분야에서 쓰이는 심화 표현입니다. 출현 빈도보다 난이도와 응용도를 더 봅니다." },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.dim}>
        <View style={styles.guideCard}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.guideTitle}>{t("단어 난이도 가이드")}</Text>
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>
          <Text style={styles.guideIntro}>
            {t("난이도는 1/5부터 5/5까지 표시합니다. 숫자와 색이 강할수록 문맥·전문성이 어려운 단어이며, 출현 빈도와는 별도 기준입니다.")}
          </Text>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingTop: 12 }}>
            {rows.map((r) => (
              <View key={r.key} style={{ marginBottom: 12 }}>
                <Row style={{ alignItems: "center" }}>
                  <DifficultyBadge difficulty={r.key} compact />
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
  const { t, tm, language } = useI18n();
  const [title, setTitle] = useState("내 단어장");
  const [rawText, setRawText] = useState("");
  const rows = useMemo(() => parseStudySetRows(rawText), [rawText]);

  const exampleText = [
    "product-market fit\tPMF\t제품-시장 적합성",
    "runway\trunway\t남은 운영 가능 기간",
    "お世話になっております\tおせわになっております\t비즈니스 메일 첫인사",
    "それな\tそれな\t완전 공감",
  ].join("\n");

  function create() {
    const bulkValidation = validateBulkScheduleImportText(rawText, language);
    if (!bulkValidation.ok) {
      Alert.alert(t("세트 만들기"), bulkValidation.message);
      return;
    }
    if (!rows.length) {
      Alert.alert(t("세트 만들기"), t("Quizlet처럼 한 줄에 단어/표현, 읽는 법, 뜻을 입력해주세요."));
      return;
    }
    const titleValidation = validateRequiredText(title || "내 단어장", 60, language);
    if (!titleValidation.ok) {
      Alert.alert(t("세트 만들기"), titleValidation.message);
      return;
    }
    onCreate({ title: titleValidation.value, rows });
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
            <Pressable onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={t("닫기")}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Row>

          <Text style={styles.inputLabel}>{t("세트 이름")}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            placeholder={t("예: 종과 경제 시험 전 암기")}
            placeholderTextColor="#7B82A6"
            style={styles.textInput}
          />

          <Row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <Text style={styles.inputLabelNoMargin}>{t("단어 붙여넣기")}</Text>
            <Pressable style={({ pressed }) => [styles.exampleBtn, pressed && { opacity: 0.9 }]} onPress={() => setRawText(exampleText)} accessibilityRole="button" accessibilityLabel={t("예시 넣기")}>
              <Text style={styles.exampleBtnText}>{t("예시 넣기")}</Text>
            </Pressable>
          </Row>
          <Text style={styles.helperText}>{t("형식: 단어/표현 [탭/쉼표] 읽는 법 [탭/쉼표] 뜻")}</Text>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            maxLength={12000}
            placeholder={"product-market fit\tPMF\t제품-시장 적합성\nそれな\tそれな\t완전 공감"}
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

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} onPress={create} accessibilityRole="button" accessibilityLabel={t("세트 만들기")}>
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
  guideBtn: { backgroundColor: "#2A245B", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: COLORS.line },
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
  clearSetFilter: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  clearSetFilterText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  tabChip: { backgroundColor: COLORS.card2, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: COLORS.lineSoft },
  tabChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  tabChipText: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  tabChipTextActive: { color: COLORS.text },
  sortBtn: { backgroundColor: COLORS.card2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: COLORS.lineSoft },
  sortText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  courseScopeCard: { marginBottom: 12, borderColor: "rgba(103,217,255,0.28)", overflow: "hidden" },
  selectedLabel: { color: COLORS.cyan, fontWeight: "900", fontSize: TYPO.small, marginBottom: 4 },
  courseScopeTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  courseChangeBtn: { minHeight: 42, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  courseChangeText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
  courseOptionCard: { minHeight: 112, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.lineSoft, backgroundColor: COLORS.card, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  courseOptionCardActive: { borderColor: COLORS.blue, backgroundColor: "#10143C" },
  courseOptionTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3, lineHeight: TYPO.h3Line },
  courseOptionSubtitle: { color: "#C7B8FF", fontWeight: "800", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 4 },
  courseOptionDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.lineSoft, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.card2 },
  courseOptionDotActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  courseOptionCheck: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.small },
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
  loadMoreCard: {
    minHeight: 72,
    borderRadius: RADII.cardLg,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  loadMoreTitle: { color: COLORS.text, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, fontWeight: "900" },
  loadMoreText: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "700", marginTop: 4 },
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
  selectedFilterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  resetBtn: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.lineSoft },
  resetText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.small },
  sortCard: { borderColor: "rgba(80,98,255,0.42)" },
  detailFilterCard: { marginTop: 12, borderColor: COLORS.lineSoft },
  detailTabRow: { gap: 8, paddingTop: 12, paddingBottom: 4 },
  detailTab: {
    minHeight: 44,
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
  compactChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  compactChip: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  compactChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  compactChipText: { color: COLORS.muted, fontWeight: "900", fontSize: TYPO.small },
  compactChipTextActive: { color: COLORS.text },
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
  guideIntro: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 10 },
  exampleBtn: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card2, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: "center" },
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
