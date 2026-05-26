import { LearningCourse, StudySet, SupabaseProfile, UserGoal, VocabItem } from "../types";

export type LearningCourseMeta = {
  id: LearningCourse;
  title: string;
  subtitle: string;
  description: string;
  diagnosticType: string;
  primarySetIds: string[];
};

export const LEARNING_COURSES: LearningCourseMeta[] = [
  {
    id: "EJU_JAPANESE",
    title: "EJU 일본어",
    subtitle: "독해·청독해·기술문 중심",
    description: "EJU 일본어 단어와 표현만 분리해서 진단하고 학습합니다.",
    diagnosticType: "EJU 일본어 진단",
    primarySetIds: ["set_recent_eju_2016_2025", "set_top100", "set_300", "set_reading_context", "set_table"],
  },
  {
    id: "EJU_SOGO",
    title: "EJU 문과",
    subtitle: "경제·정치·사회·세계사·지리",
    description: "문과 출원에 필요한 종합과목 개념어만 따로 학습합니다.",
    diagnosticType: "EJU 문과 진단",
    primarySetIds: ["set_economy", "set_society", "set_civics", "set_geography", "set_history"],
  },
  {
    id: "EJU_SCIENCE",
    title: "EJU 이과",
    subtitle: "수학 코스1·하이레벨 수학·생물",
    description: "이과 출원 준비에 필요한 수학 지시어와 생물 생태·환경 개념어를 분리해서 학습합니다.",
    diagnosticType: "EJU 이과 진단",
    primarySetIds: ["set_science_math_course1", "set_science_math_advanced", "set_science_biology_ecology"],
  },
  {
    id: "ADMISSION_ENGLISH",
    title: "입시 영어",
    subtitle: "TOEFL·IELTS·지원 서류",
    description: "일본 대학 지원 조건에 자주 붙는 영어 시험과 서류 표현을 학습합니다.",
    diagnosticType: "입시 영어 진단",
    primarySetIds: ["set_english_admission", "set_business_english_sentences", "set_academic_abstract"],
  },
  {
    id: "TOEIC_BUSINESS",
    title: "TOEIC·비즈니스 영어",
    subtitle: "RC·LC 빈출어와 실무 표현",
    description: "TOEIC Listening/Reading에 자주 나오는 업무 상황 어휘와 실제 비즈니스 문장을 집중 학습합니다.",
    diagnosticType: "TOEIC 어휘 진단",
    primarySetIds: ["set_toeic_top_frequency", "set_toeic_rc_vocabulary", "set_toeic_lc_workplace", "set_toeic_business_phrases"],
  },
  {
    id: "STARTUP_BUSINESS_ENGLISH",
    title: "스타트업 영어",
    subtitle: "투자·SaaS·PMF·피치 문장",
    description: "창업과 비즈니스 현장에서 바로 쓰는 영어 용어와 문장을 모았습니다.",
    diagnosticType: "스타트업 영어 진단",
    primarySetIds: ["set_startup_business_english", "set_business_english_sentences", "set_english_admission"],
  },
  {
    id: "BUSINESS_JAPANESE",
    title: "비즈니스 일본어",
    subtitle: "메일·회의·일정 조율",
    description: "JLPT식 표현만이 아니라 회사에서 바로 쓰는 정중한 표현을 학습합니다.",
    diagnosticType: "비즈니스 일본어 진단",
    primarySetIds: ["set_business_japanese", "set_campus_japanese", "set_writing"],
  },
  {
    id: "CAMPUS_JAPANESE",
    title: "대학생 일본어",
    subtitle: "신조어·SNS·캠퍼스 표현",
    description: "EJU/JLPT에서 잘 다루지 않는 대학 생활 말투와 신조어를 분리했습니다.",
    diagnosticType: "대학생 일본어 진단",
    primarySetIds: ["set_campus_japanese", "set_business_japanese", "set_reading_context"],
  },
];

const EJU_SCIENCE_TYPES = [
  "EJU 이과",
  "이과 과목",
  "이과 수학",
  "수학 코스1",
  "하이레벨 수학",
  "생물",
  "생태와 환경",
  "해양 생태계",
  "물질 생산",
];

export function getLearningCourseMeta(course: LearningCourse) {
  return LEARNING_COURSES.find((item) => item.id === course) || LEARNING_COURSES[0];
}

export function courseFromGoal(goal?: UserGoal): LearningCourse {
  if (goal === "TOEIC") return "TOEIC_BUSINESS";
  if (goal === "TOEFL" || goal === "IELTS") return "ADMISSION_ENGLISH";
  if (goal === "BusinessEnglish") return "STARTUP_BUSINESS_ENGLISH";
  if (goal === "BusinessJapanese") return "BUSINESS_JAPANESE";
  if (goal === "CampusJapanese") return "CAMPUS_JAPANESE";
  return "EJU_JAPANESE";
}

export function courseFromProfile(profile: SupabaseProfile | null): LearningCourse {
  return courseFromGoal(profile?.goal);
}

export function wordMatchesLearningCourse(word: VocabItem, course: LearningCourse) {
  if (course === "EJU_JAPANESE") {
    return ["일본어", "기술문", "청독해", "한자", "문법"].includes(word.subject);
  }
  if (course === "EJU_SOGO") {
    return word.subject === "종합과목" && !word.questionTypes.some((type) => EJU_SCIENCE_TYPES.includes(type));
  }
  if (course === "EJU_SCIENCE") {
    return word.subject === "EJU 이과" || word.questionTypes.some((type) => EJU_SCIENCE_TYPES.includes(type));
  }
  if (course === "ADMISSION_ENGLISH") {
    return word.subject === "영어" && word.questionTypes.some((type) => ["출원 영어", "TOEFL", "IELTS", "아카데믹 영어"].includes(type));
  }
  if (course === "TOEIC_BUSINESS") {
    return word.subject === "영어" && word.questionTypes.some((type) => ["TOEIC", "TOEIC RC", "TOEIC LC", "비즈니스 영어", "실무 문장", "고객응대"].includes(type));
  }
  if (course === "STARTUP_BUSINESS_ENGLISH") {
    return word.subject === "영어" && word.questionTypes.some((type) => ["스타트업 영어", "투자 영어", "SaaS 지표", "비즈니스 영어", "전문 용어"].includes(type));
  }
  if (course === "BUSINESS_JAPANESE") {
    return word.subject === "실용일본어" && word.questionTypes.some((type) => ["비즈니스 일본어", "메일 표현", "회의 표현", "회사 실무"].includes(type));
  }
  return word.subject === "실용일본어" && word.questionTypes.some((type) => ["대학생 표현", "신조어", "SNS 표현", "캠퍼스 일본어", "실사용 일본어"].includes(type));
}

export function setMatchesLearningCourse(set: StudySet, course: LearningCourse) {
  const meta = getLearningCourseMeta(course);
  return meta.primarySetIds.includes(set.id);
}
