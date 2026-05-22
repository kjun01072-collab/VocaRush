export type UserRole = "student" | "teacher";

export type UserGoal = "EJU" | "JLPT" | "TOEIC" | "other";

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
};

// Bottom tabs
export type StudentTab = "home" | "vocab" | "library" | "my";
export type TeacherTab = "home" | "classes" | "distribute" | "status" | "my";

export type Occurrence = {
  year: number;
  session: "제1회" | "제2회";
  subject: "일본어" | "종합과목" | "기술문" | "청독해" | "한자" | "문법";
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

export type SourceType = "기출분석" | "형광펜" | "선생님세트" | "직접추가";

export type VocabItem = {
  id: string;
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
  title: string;
  description: string;
  createdFrom: "builtin" | "highlight" | "wrong" | "diagnostic" | "teacher" | "custom";
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

export type StudentSettings = {
  role: UserRole;
  targetScore: TargetScore;
  examDate: string; // free-form (e.g. 2026.06 EJU)
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
  weakSubjects: Array<{ key: VocabSubject; wrong: number }>;
  weakQuestionTypes: Array<{ key: string; wrong: number }>;
  weakLevels: Array<{ key: VocabLevel; wrong: number }>;
  mostMissedWordIds: string[];
  recommendedActions: string[];
  weakTypes: string[];
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
  title: string;
  classId: string;
  wordIds: string[];
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
