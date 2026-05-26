import { SupabaseProfile } from "../types";
import { logInternalError } from "../utils/errors";
import { supabase } from "./supabase";

const PROFILE_COLUMNS = "id,user_id,name,role,goal,current_level,created_at,updated_at";
const PROFILE_TABLES = ["vocarush_profiles", "profiles"] as const;

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

export function profileErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  logInternalError(error, "profiles");

  if (lower.includes("schema cache") || lower.includes("could not find the table")) {
    return "프로필을 준비하는 중 문제가 발생했습니다. 다시 시도해 주세요.";
  }
  if (lower.includes("permission") || lower.includes("rls") || lower.includes("row-level")) {
    return "프로필 접근 권한을 확인하지 못했습니다. 다시 로그인해 주세요.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  }

  return "프로필 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function fetchProfile(userId: string) {
  const client = requireSupabase();
  let lastError: unknown;

  for (const table of PROFILE_TABLES) {
    const { data, error } = await client
      .from(table)
      .select(PROFILE_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error) return data as SupabaseProfile | null;
    lastError = error;
    if (!isMissingTableError(error)) throw error;
  }

  throw lastError;
}

export async function saveProfile(input: Omit<SupabaseProfile, "id" | "created_at" | "updated_at">) {
  const client = requireSupabase();
  const payload = {
    ...input,
    updated_at: new Date().toISOString(),
  };
  let lastError: unknown;

  for (const table of PROFILE_TABLES) {
    const { data, error } = await client
      .from(table)
      .upsert(payload, { onConflict: "user_id" })
      .select(PROFILE_COLUMNS)
      .single();

    if (!error) return data as SupabaseProfile;
    lastError = error;
    if (!isMissingTableError(error)) throw error;
  }

  throw lastError;
}
