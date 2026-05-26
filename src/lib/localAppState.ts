import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppNavigationState,
  AttendanceState,
  DiagnosticResult,
  LearningRecord,
  LearnSessionProgress,
  StudentSettings,
  StudySessionLog,
  StudySet,
  UserStudyFolder,
  VocabItem,
  VocabularyAssignment,
} from "../types";
import { logInternalError } from "../utils/errors";

export type LocalAppStateSnapshot = {
  settings?: StudentSettings;
  vocab?: VocabItem[];
  studySets?: StudySet[];
  assignments?: VocabularyAssignment[];
  reviewQueueIds?: string[];
  studiedLog?: Array<{ id: string; dayKey: string; ts: number }>;
  learningRecords?: LearningRecord[];
  studySessions?: StudySessionLog[];
  learningCardBuckets?: Record<string, { title: string; wordIds: string[]; updatedAt: number }>;
  totalXP?: number;
  storeXP?: number;
  redeemedRewardIds?: string[];
  streakDays?: number;
  attendance?: AttendanceState;
  generatedSets?: StudySet[];
  userFolders?: UserStudyFolder[];
  latestDiagnostic?: DiagnosticResult | null;
  navigation?: AppNavigationState;
  learnProgressBySession?: Record<string, LearnSessionProgress>;
  favoriteDefaultsReset?: boolean;
};

const STATE_VERSION = 1;

function storageKey(ownerId: string) {
  return `vocarush.localAppState.v${STATE_VERSION}.${ownerId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function arrayOrUndefined<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

export async function loadLocalAppState(ownerId: string): Promise<LocalAppStateSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(ownerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    return {
      settings: isObject(parsed.settings) ? (parsed.settings as StudentSettings) : undefined,
      vocab: arrayOrUndefined<VocabItem>(parsed.vocab),
      studySets: arrayOrUndefined<StudySet>(parsed.studySets),
      assignments: arrayOrUndefined<VocabularyAssignment>(parsed.assignments),
      reviewQueueIds: arrayOrUndefined<string>(parsed.reviewQueueIds),
      studiedLog: arrayOrUndefined<{ id: string; dayKey: string; ts: number }>(parsed.studiedLog),
      learningRecords: arrayOrUndefined<LearningRecord>(parsed.learningRecords),
      studySessions: arrayOrUndefined<StudySessionLog>(parsed.studySessions),
      learningCardBuckets: isObject(parsed.learningCardBuckets)
        ? (parsed.learningCardBuckets as Record<string, { title: string; wordIds: string[]; updatedAt: number }>)
        : undefined,
      totalXP: typeof parsed.totalXP === "number" ? parsed.totalXP : undefined,
      storeXP: typeof parsed.storeXP === "number" ? parsed.storeXP : undefined,
      redeemedRewardIds: arrayOrUndefined<string>(parsed.redeemedRewardIds),
      streakDays: typeof parsed.streakDays === "number" ? parsed.streakDays : undefined,
      attendance: isObject(parsed.attendance) ? (parsed.attendance as AttendanceState) : undefined,
      generatedSets: arrayOrUndefined<StudySet>(parsed.generatedSets),
      userFolders: arrayOrUndefined<UserStudyFolder>(parsed.userFolders),
      latestDiagnostic: isObject(parsed.latestDiagnostic) ? (parsed.latestDiagnostic as DiagnosticResult) : null,
      navigation: isObject(parsed.navigation) ? (parsed.navigation as AppNavigationState) : undefined,
      learnProgressBySession: isObject(parsed.learnProgressBySession) ? (parsed.learnProgressBySession as Record<string, LearnSessionProgress>) : undefined,
      favoriteDefaultsReset: parsed.favoriteDefaultsReset === true,
    };
  } catch (error) {
    logInternalError(error, "loadLocalAppState");
    return null;
  }
}

export async function saveLocalAppState(ownerId: string, snapshot: LocalAppStateSnapshot) {
  try {
    await AsyncStorage.setItem(storageKey(ownerId), JSON.stringify(snapshot));
  } catch (error) {
    logInternalError(error, "saveLocalAppState");
  }
}
