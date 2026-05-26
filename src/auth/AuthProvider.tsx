import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { logInternalError } from "../utils/errors";

declare const process:
  {
    env: {
      EXPO_PUBLIC_SITE_URL?: string;
    };
  };

type AuthContextValue = {
  loading: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<string>;
  signInWithGoogle: () => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  resendSignupEmail: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PRODUCTION_SITE_URL = "https://vocarush.vercel.app/";

function normalizeRedirectUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
  } catch {
    return undefined;
  }
}

function isLocalRedirectOrigin(origin?: string) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function authRedirectUrl() {
  const configuredSiteUrl = normalizeRedirectUrl(process.env.EXPO_PUBLIC_SITE_URL);
  if (configuredSiteUrl) return configuredSiteUrl;

  if (typeof window !== "undefined" && window.location?.origin) {
    if (isLocalRedirectOrigin(window.location.origin)) return PRODUCTION_SITE_URL;
    return `${window.location.origin}/`;
  }
  return PRODUCTION_SITE_URL;
}

function cleanAuthHashFromUrl() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash || "";
  if (!hash.includes("access_token=") && !hash.includes("error=")) return;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, document.title, cleanUrl || "/");
}

function notConfiguredError() {
  return new Error("Supabase 연결 정보가 설정되지 않았습니다.");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) cleanAuthHashFromUrl();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) cleanAuthHashFromUrl();
      setIsGuest(false);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      isConfigured: isSupabaseConfigured,
      isAuthenticated: Boolean(session) || isGuest,
      isGuest,
      session,
      user: session?.user ?? null,
      async signIn(email: string, password: string) {
        if (!supabase) throw notConfiguredError();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email: string, password: string) {
        if (!supabase) throw notConfiguredError();
        const redirectTo = authRedirectUrl();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
        });
        if (error) throw error;

        return data.session
          ? "회원가입이 완료되어 바로 로그인되었습니다."
          : "인증 메일을 보냈습니다. 메일함에서 확인 링크 또는 인증 안내를 확인해 주세요.";
      },
      async signInWithGoogle() {
        if (!supabase) throw notConfiguredError();
        const redirectTo = authRedirectUrl();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            ...(redirectTo ? { redirectTo } : {}),
            skipBrowserRedirect: true,
            queryParams: {
              prompt: "select_account",
            },
          },
        });
        if (error) throw error;
        if (data.url && typeof window !== "undefined") {
          window.location.assign(data.url);
        }
      },
      async sendEmailOtp(email: string) {
        if (!supabase) throw notConfiguredError();
        const redirectTo = authRedirectUrl();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
          },
        });
        if (error) throw error;
      },
      async verifyEmailOtp(email: string, token: string) {
        if (!supabase) throw notConfiguredError();
        const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
        if (error) throw error;
      },
      async resendSignupEmail(email: string) {
        if (!supabase) throw notConfiguredError();
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error) throw error;
      },
      async resetPassword(email: string) {
        if (!supabase) throw notConfiguredError();
        const redirectTo = authRedirectUrl();
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          redirectTo ? { redirectTo } : undefined
        );
        if (error) throw error;
      },
      async signOut() {
        setIsGuest(false);
        setSession(null);

        if (!supabase || isGuest) {
          cleanAuthHashFromUrl();
          return;
        }

        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        } catch (error) {
          logInternalError(error, "AuthProvider.signOut");
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (localError) {
            logInternalError(localError, "AuthProvider.signOutLocalFallback");
          }
        } finally {
          cleanAuthHashFromUrl();
        }
      },
      continueAsGuest() {
        setIsGuest(true);
      },
    }),
    [isGuest, loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
