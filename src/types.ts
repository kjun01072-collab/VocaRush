export type UserRole = "student" | "teacher";

export type UserGoal =
  | "EJU"
  | "JLPT"
  | "TOEIC"
  | "TOEFL"
  | "IELTS"
  | "BusinessEnglish"
  | "BusinessJapanese"
  | "CampusJapanese"
  | "other";

export type LearningCourse =
  | "EJU_JAPANESE"
  | "EJU_SOGO"
  | "EJU_SCIENCE"
  | "TOEIC_BUSINESS"
  | "ADMISSION_ENGLISH"
  | "STARTUP_BUSINESS_ENGLISH"
  | "BUSINESS_JAPANESE"
  | "CAMPUS_JAPANESE";

export type SupabaseProfile = {
  id?: string;
  user_id: string;
  name: string;
  role: UserRole;
  goal: UserGoal;
  current_level: string;
  created_at?: string;
  updated_at?: string;
};

export type LearningRecord = {
  id?: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  subject: string;
  topic: string;
  error_type: string;
  created_at: string;
  source_set_id?: string;
  source_set_title?: string;
};

// Bottom tabs
export type StudentTab = "home" | "vocab" | "library" | "my";
export type TeacherTab = "home" | "classes" | "distribute" | "status" | "my";

export type AppOverlayScreen =
  | { kind: "none" }
  | { kind: "word"; wordId: string }
  | { kind: "set"; setId: string }
  | { kind: "folder"; folderId: string }
  | { kind: "learn"; title: string; mode: LearnMode; wordIds: string[]; sourceSetId?: string }
  | { kind: "diagnostic" }
  | { kind: "report" }
  | { kind: "class" }
  | { kind: "homework"; assignmentId: string }
  | { kind: "t_class"; classId: string }
  | { kind: "t_student"; studentId: string }
  | { kind: "t_distribute"; classId: string | null }
  | { kind: "t_assignment"; assignmentId: string };

export type AppNavigationState = {
  studentTab?: StudentTab;
  teacherTab?: TeacherTab;
  overlay?: AppOverlayScreen;
  searchQuery?: string;
  setWordFilter?: { title: string; wordIds: string[] } | null;
};

export type LearnSessionProgress = {
  activeMode: LearnMode;
  index: number;
  totalCount?: number;
  showMeaning: boolean;
  updatedAt: number;
};

export type Occurrence = {
  year: number;
  session: "제1회" | "제2회";
  subject: "일본어" | "영어" | "실용일본어" | "종합과목" | "EJU 이과" | "기술문" | "청독해" | "한자" | "문법";
  part: string;
  questionType: string;
  questionNumber?: number;
};

export type VocabLevel =
  | "필수 기초"
  | "200점 목표"
  | "300점 목표"
  | "350+ 목표"
  | "기술문 표현"
  | "종합과목 연결"
  | "청독해·자료형";

export type VocabSubject = Occurrence["subject"];

export type VocabDifficulty = 1 | 2 | 3 | 4 | 5;

export type Importance = "기초" | "중요" | "매우 중요" | "최우선";
export type TargetScore = "200점" | "300점" | "350+";

export type ReviewStatus = "New" | "Learning" | "Review" | "Mastered";

export type SourceType = "기출분석" | "큐레이션" | "형광펜" | "선생님세트" | "직접추가";

export type VocabItem = {
  id: string;
  userId?: string;
  ownerId?: string;
  word: string;
  reading: string;
  meaningKo: string;
  level: VocabLevel;
  subject: VocabSubject;
  part: string;
  questionTypes: string[];
  occurrenceCount: number;
  frequencyScore: number;
  difficulty: VocabDifficulty;
  importance: Importance;
  targetScore: TargetScore;
  appearedIn: Occurrence[];
  synonyms: string[];
  antonyms?: string[];
  relatedWords: string[];
  exampleJa: string;
  exampleKo: string;
  explanationKo: string;
  commonMistake?: string;
  sourceType: SourceType;
  reviewStatus: ReviewStatus;
  wrongCount: number; // convenience bucket count (0..)
  cumulativeWrongAttempts: number;
  recentWrongAttempts7d: number;
  masteryLevel: number; // 0-100
  isFavorite: boolean;
};

export type StudySet = {
  id: string;
  userId?: string;
  ownerId?: string;
  title: string;
  description: string;
  createdFrom: "builtin" | "highlight" | "wrong" | "learning" | "diagnostic" | "teacher" | "custom";
  weakTypes: string[];
  wordIds: string[];
  wordCount: number;
  createdAt: number; // epoch ms
  progress: number; // 0-100
};

export type RewardItem = {
  id: string;
  title: string;
  brand: string;
  description: string;
  requiredXP: number;
  category: "할인권" | "기프트";
};

export type UserStudyFolder = {
  id: string;
  userId?: string;
  ownerId?: string;
  title: string;
  description: string;
  setIds: string[];
  createdAt: number;
};

export type StudyStyle =
  | "균형형"
  | "빠른 암기형"
  | "문제풀이형"
  | "예문중심형"
  | "오답집중형"
  | "기출빈도형";

export type AppLanguage = "한국어" | "日本語" | "中文" | "English";

export type EjuExamPlan = {
  examDate: string;
  targetScore: TargetScore;
  targetScoreValue?: number;
};

export type StudentSettings = {
  role: UserRole;
  learningCourse: LearningCourse;
  targetScore: TargetScore;
  examDate: string; // free-form (e.g. 2026.06 EJU)
  ejuExamPlans: EjuExamPlan[];
  dailyWordGoal: number;
  notificationOn: boolean;
  studyStyle: StudyStyle;
  appLanguage: AppLanguage;
  connectedClassId: string | null;
};

export type LearnMode =
  | "낱말카드"
  | "한자→한국어"
  | "뜻→한자"
  | "뜻→독음"
  | "뜻 맞히기"
  | "독음 맞히기"
  | "예문 빈칸"
  | "동의어 연결"
  | "관련어 묶음 퀴즈"
  | "유형별 퀴즈"
  | "빠른 OX"
  | "쓰기 연습"
  | "카드 분류"
  | "오답 복습";

export type StudySessionLog = {
  id: string;
  dayKey: string;
  course: LearningCourse;
  courseTitle: string;
  mode: LearnMode;
  title: string;
  seconds: number;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  knownCount: number;
  learningCount: number;
  bonusXP: number;
  completedAt: number;
};

export type LearnQuestionKind =
  | "meaning"
  | "reading"
  | "blank"
  | "synonym"
  | "relatedPick"
  | "typeMatch";

export type QuizQuestion =
  | {
      id: string;
      kind: "meaning" | "reading" | "synonym" | "typeMatch";
      promptWordId: string;
      prompt: string;
      subPrompt?: string;
      choices: string[];
      answer: string;
      userAnswer?: string;
      isCorrect?: boolean;
    }
  | {
      id: string;
      kind: "blank";
      promptWordId: string;
      prompt: string; // sentenceWithBlank
      subPrompt?: string;
      choices: string[]; // word strings
      answer: string;
      userAnswer?: string;
      isCorrect?: boolean;
    }
  | {
      id: string;
      kind: "relatedPick";
      promptWordId: string;
      prompt: string; // theme
      subPrompt?: string;
      choices: string[]; // word strings
      answers: string[]; // multi correct
      pickCount: number;
      picked: string[];
      done?: boolean;
      isCorrect?: boolean;
    };

export type DiagnosticTestType =
  | "전체 진단"
  | "EJU 일본어 진단"
  | "EJU 문과 진단"
  | "EJU 종합과목 진단"
  | "EJU 이과 진단"
  | "TOEIC 어휘 진단"
  | "입시 영어 진단"
  | "스타트업 영어 진단"
  | "비즈니스 일본어 진단"
  | "대학생 일본어 진단"
  | "목표 점수별 진단"
  | "독해 유형 진단"
  | "청독해 자료형 진단"
  | "기술문 표현 진단"
  | "종합과목 단어 진단"
  | "오답 재진단";

export type DiagnosticQuestion = QuizQuestion;

export type DiagnosticResult = {
  id: string;
  createdAt: number;
  testType: DiagnosticTestType;
  questionCount: number;
  correctCount: number;
  accuracy: number; // 0-100
  comment: string;
  learningCourse?: LearningCourse;
  weakSubjects: Array<{ key: VocabSubject; wrong: number }>;
  weakQuestionTypes: Array<{ key: string; wrong: number }>;
  weakLevels: Array<{ key: VocabLevel; wrong: number }>;
  mostMissedWordIds: string[];
  recommendedActions: string[];
  weakTypes: string[];
};

export type AttendanceState = {
  checkedDates: string[];
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
};

export type WeakTypeStat = {
  typeName: string;
  subject: string;
  accuracy: number; // 0-100
  attempts: number;
  wrongAttempts: number;
  recentAccuracy7d: number; // 0-100
  trend: "up" | "down" | "same";
  recommendation: string;
};

// EJUEDU light class feature (local dummy)
export type AcademyClass = {
  id: string;
  academyName: "EJUEDU";
  name: "EJUEDU A반" | "EJUEDU B반" | "EJUEDU C반";
  inviteCode: string;
  targetScore: string;
  level: string;
  focus: string[];
  lessonDays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  lessonTime: string;
  lessonDurationMinutes: number;
  studentIds: string[];
};

export type StudentProfile = {
  id: string;
  name: string;
  classId: string;
  targetScore: string;
  currentLevel: string;
  studyStyle: StudyStyle;
  homeworkCompletion: number;
  recentAccuracy: number;
  weakTypes: string[];
  wrongWordIds: string[];
};

export type VocabularyAssignment = {
  id: string;
  userId?: string;
  ownerId?: string;
  title: string;
  classId: string;
  wordIds: string[];
  assignmentKind?: "단어 과제" | "수업 전 단어 테스트";
  releaseMode?: "즉시 공개" | "수업 30분 전 공개";
  availableAt?: string;
  classStartsAt?: string;
  unlockMinutesBeforeClass?: number;
  learnMode?: LearnMode;
  dueDate: string;
  requiredAccuracy: number;
  teacherMemo: string;
  createdBy: string; // teacher name
  statusByStudent: Record<string, "미시작" | "진행 중" | "완료" | "마감 지남">;
  progressByStudent: Record<string, number>;
  accuracyByStudent: Record<string, number>;
};

export type TeacherCustomWord = {
  id: string;
  word: string;
  reading: string;
  meaningKo: string;
  exampleJa?: string;
  category: string;
  level: string;
  questionType: string;
};

export type DifficultyLabel = {
  label: string;
  shortBadge: string;
  description: string;
};
