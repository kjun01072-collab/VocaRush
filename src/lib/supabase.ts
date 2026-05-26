import "react-native-url-polyfill/auto";

import type { SupabaseClient } from "@supabase/supabase-js";

declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  };
};

declare const require: <T = unknown>(moduleName: string) => T;

const { createClient, processLock } =
  require<typeof import("@supabase/supabase-js")>("@supabase/supabase-js/dist/index.cjs");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublicKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublicKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: typeof window !== "undefined",
        flowType: "pkce",
        lock: processLock,
      },
    })
  : null;
