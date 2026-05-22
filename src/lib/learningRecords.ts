import { LearningRecord } from "../types";
import { supabase } from "./supabase";

const RECORD_COLUMNS =
  "id,user_id,question_id,selected_answer,correct_answer,is_correct,subject,topic,error_type,created_at";
const RECORD_TABLES = ["vocarush_learning_records", "learning_records"] as const;

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase 연결 정보가 설정되지 않았습니다.");
  }
  return supabase;
}

function isMissingTableError(error: unknown) {
  const anyError = error as { code?: string; message?: string } | null;
  const message = String(anyError?.message ?? "").toLowerCase();
  return (
    anyError?.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

export function learningRecordErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("schema cache") || lower.includes("could not find the table")) {
    return "학습 기록 테이블을 찾을 수 없습니다. Supabase에서 vocarush_learning_records 테이블을 확인해 주세요.";
  }
  if (lower.includes("permission") || lower.includes("rls") || lower.includes("row-level")) {
    return "학습 기록 저장 권한이 없습니다. vocarush_learning_records RLS 정책을 확인해 주세요.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "네트워크 문제로 학습 기록을 저장하지 못했습니다.";
  }

  return "학습 기록 저장 중 문제가 발생했습니다.";
}

export async function insertLearningRecord(record: LearningRecord) {
  const client = requireSupabase();
  let lastError: unknown;

  for (const table of RECORD_TABLES) {
    const { data, error } = await client.from(table).insert(record).select(RECORD_COLUMNS).single();

    if (!error) return data as LearningRecord;
    lastError = error;
    if (!isMissingTableError(error)) throw error;
  }

  throw lastError;
}

export async function fetchLearningRecords(userId: string, limit = 80) {
  const client = requireSupabase();
  let lastError: unknown;

  for (const table of RECORD_TABLES) {
    const { data, error } = await client
      .from(table)
      .select(RECORD_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error) return (data || []) as LearningRecord[];
    lastError = error;
    if (!isMissingTableError(error)) throw error;
  }

  throw lastError;
}
