import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { COLORS, RADII, SPACING, TYPO } from "../theme";

type AuthMode = "signIn" | "signUp" | "otp";

type FieldErrors = {
  email?: string;
  password?: string;
  token?: string;
  submit?: string;
};

type Notice = {
  title: string;
  body: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NUMBER_RE = /\d/;
const SPECIAL_RE = /[^A-Za-z0-9]/;

function validateEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) return "메일 주소를 입력해주세요.";
  if (!EMAIL_RE.test(trimmed)) return "메일 형식이 올바르지 않습니다. 예: name@example.com";
  return "";
}

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    number: NUMBER_RE.test(password),
    special: SPECIAL_RE.test(password),
  };
}

function passwordProblems(password: string) {
  const checks = passwordChecks(password);
  const problems: string[] = [];
  if (!password) problems.push("비밀번호 입력");
  if (!checks.length) problems.push("8자 이상");
  if (!checks.number) problems.push("숫자 포함");
  if (!checks.special) problems.push("특수문자 포함");
  return problems;
}

function mapAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("provider") || lower.includes("oauth") || lower.includes("google")) {
    return "구글 로그인이 아직 설정되지 않았습니다. Supabase와 Google Cloud 설정을 확인해주세요.";
  }
  if (lower.includes("invalid login credentials")) {
    return "메일 또는 비밀번호가 맞지 않습니다.";
  }
  if (lower.includes("email not confirmed")) {
    return "메일 인증이 아직 완료되지 않았습니다. 받은 메일을 확인해주세요.";
  }
  if (lower.includes("already registered") || lower.includes("user already")) {
    return "이미 가입된 메일입니다. 로그인하거나 비밀번호를 재설정해주세요.";
  }
  if (lower.includes("signup disabled")) {
    return "현재 회원가입이 비활성화되어 있습니다.";
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("at least"))) {
    return "비밀번호 조건을 다시 확인해주세요.";
  }
  if (lower.includes("rate limit") || lower.includes("security purposes")) {
    return "요청이 너무 많습니다. 잠시 뒤 다시 시도해주세요.";
  }
  if (lower.includes("token") || lower.includes("otp")) {
    return "인증번호가 올바르지 않거나 만료되었습니다.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  }

  return "인증 처리 중 문제가 발생했습니다. 잠시 뒤 다시 시도해주세요.";
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleDot, ok ? styles.ruleDotOk : styles.ruleDotBad]} />
      <Text style={[styles.ruleText, ok ? styles.ruleTextOk : styles.ruleTextBad]}>{label}</Text>
    </View>
  );
}

export function AuthScreen() {
  const {
    isConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    sendEmailOtp,
    verifyEmailOtp,
    resendSignupEmail,
    resetPassword,
    continueAsGuest,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const isSignIn = mode === "signIn";
  const isSignUp = mode === "signUp";
  const checks = useMemo(() => passwordChecks(password), [password]);
  const liveEmailError = emailTouched || email.length > 0 ? validateEmail(email) : "";
  const livePasswordError =
    isSignUp && (passwordTouched || password.length > 0) && passwordProblems(password).length > 0
      ? `부족한 조건: ${passwordProblems(password).join(", ")}`
      : "";

  function clearMode(nextMode: AuthMode) {
    if (busy) return;
    setMode(nextMode);
    setErrors({});
    setNotice(null);
    setOtpSent(false);
    setToken("");
    setPasswordTouched(false);
  }

  function setFieldError(field: keyof FieldErrors, value?: string) {
    setErrors((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const mailError = validateEmail(email);
    if (mailError) nextErrors.email = mailError;

    if (mode === "signIn" && !password) {
      nextErrors.password = "비밀번호를 입력해주세요.";
    }

    if (mode === "signUp") {
      const problems = passwordProblems(password);
      if (problems.length) {
        nextErrors.password = `비밀번호 조건이 부족합니다: ${problems.join(", ")}`;
      }
    }

    if (mode === "otp" && otpSent && token.trim().length !== 6) {
      nextErrors.token = "메일로 받은 6자리 인증번호를 입력해주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (busy) return;
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!validateForm()) return;

    if (!isConfigured) {
      setErrors({ submit: "Supabase 연결 정보가 없어 게스트 모드만 사용할 수 있습니다." });
      return;
    }

    const trimmedEmail = email.trim();
    setBusy(true);
    setErrors({});
    setNotice(null);

    try {
      if (mode === "signIn") {
        await signIn(trimmedEmail, password);
      } else if (mode === "signUp") {
        const message = await signUp(trimmedEmail, password);
        const nextNotice = {
          title: message.includes("인증 메일") ? "인증 메일 확인" : "회원가입 완료",
          body: message,
        };
        setNotice(nextNotice);
        Alert.alert(nextNotice.title, nextNotice.body);
      } else if (!otpSent) {
        await sendEmailOtp(trimmedEmail);
        setOtpSent(true);
        setNotice({
          title: "인증번호 확인",
          body: "인증번호를 보냈습니다. 메일함에서 6자리 코드를 확인해주세요.",
        });
      } else {
        await verifyEmailOtp(trimmedEmail, token.trim());
      }
    } catch (error) {
      setErrors({ submit: mapAuthError(error instanceof Error ? error.message : "") });
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    if (busy) return;
    if (!isConfigured) {
      setErrors({ submit: "Supabase 연결 정보가 없어 구글 로그인을 사용할 수 없습니다." });
      return;
    }

    setBusy(true);
    setErrors({});
    setNotice(null);

    try {
      await signInWithGoogle();
      setNotice({
        title: "구글 로그인 이동 중",
        body: "구글 계정 선택 화면으로 이동합니다. 로그인 후 VocaRush로 돌아옵니다.",
      });
    } catch (error) {
      setErrors({ submit: mapAuthError(error instanceof Error ? error.message : "") });
      setBusy(false);
    }
  }

  async function resendEmail() {
    if (busy) return;
    setEmailTouched(true);

    const mailError = validateEmail(email);
    if (mailError) {
      setErrors({ email: mailError });
      return;
    }
    if (!isConfigured) {
      setErrors({ submit: "Supabase 연결 정보가 없어 메일을 보낼 수 없습니다." });
      return;
    }

    setBusy(true);
    setErrors({});
    setNotice(null);

    try {
      if (mode === "otp") {
        await sendEmailOtp(email.trim());
        setOtpSent(true);
        setNotice({
          title: "인증번호 재전송",
          body: "인증번호를 다시 보냈습니다. 가장 최근 메일의 6자리 코드를 입력해주세요.",
        });
      } else {
        await resendSignupEmail(email.trim());
        setNotice({
          title: "인증 메일 재전송",
          body: "회원가입 인증 메일을 다시 보냈습니다. 메일함과 스팸함을 확인해주세요.",
        });
      }
    } catch (error) {
      setErrors({ submit: mapAuthError(error instanceof Error ? error.message : "") });
    } finally {
      setBusy(false);
    }
  }

  async function sendResetPassword() {
    if (busy) return;
    setEmailTouched(true);

    const mailError = validateEmail(email);
    if (mailError) {
      setErrors({ email: mailError });
      return;
    }
    if (!isConfigured) {
      setErrors({ submit: "Supabase 연결 정보가 없어 비밀번호 재설정 메일을 보낼 수 없습니다." });
      return;
    }

    setBusy(true);
    setErrors({});
    setNotice(null);

    try {
      await resetPassword(email.trim());
      setNotice({
        title: "재설정 메일 발송",
        body: "비밀번호 재설정 메일을 보냈습니다. 메일함에서 링크를 확인해주세요.",
      });
    } catch (error) {
      setErrors({ submit: mapAuthError(error instanceof Error ? error.message : "") });
    } finally {
      setBusy(false);
    }
  }

  function continueGuest() {
    if (busy) return;
    continueAsGuest();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>V</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.logo}>VocaRush</Text>
              <Text style={styles.subtitle}>EJU 기출 단어 데이터 중심 학습</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.kicker}>바로 시작하기</Text>
            <Text style={styles.title}>계정 없이 먼저 둘러보고, 필요할 때 저장하세요.</Text>
            <Text style={styles.description}>
              게스트 모드는 학습 화면을 바로 볼 수 있습니다. 계정으로 로그인하면 학습 기록과 단어장이 저장됩니다.
            </Text>
            <Pressable
              disabled={busy}
              style={({ pressed }) => [
                styles.guestButton,
                busy && styles.disabledButton,
                pressed && !busy && styles.pressed,
              ]}
              onPress={continueGuest}
            >
              <Text style={styles.guestButtonText}>게스트 모드로 바로 보기</Text>
            </Pressable>
          </View>

          <View style={styles.accountIntroCard}>
            <Text style={styles.kicker}>VocaRush 계정</Text>
            <Text style={styles.title}>기출 단어 데이터를 내 학습 기록과 함께 쌓아가세요.</Text>
            <Text style={styles.description}>
              Google 또는 이메일로 로그인하면 단어장, 별표, 오답 기록이 계정에 저장됩니다.
            </Text>
          </View>

          {!isConfigured ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Supabase 연결 필요</Text>
              <Text style={styles.warningText}>
                현재 인증 서버 연결 정보가 없어 회원가입과 로그인이 비활성화됩니다. 게스트 모드는 바로 사용할 수 있습니다.
              </Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <Pressable
              disabled={busy || !isConfigured}
              style={({ pressed }) => [
                styles.googleButton,
                (!isConfigured || busy) && styles.disabledButton,
                pressed && !busy && styles.pressed,
              ]}
              onPress={submitGoogle}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <View style={styles.googleMark}>
                    <Text style={styles.googleMarkText}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Google로 계속하기</Text>
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는 메일로 계속</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.switchRow}>
              <Pressable
                disabled={busy}
                style={[styles.switchItem, isSignIn && styles.switchItemOn]}
                onPress={() => clearMode("signIn")}
              >
                <Text style={[styles.switchText, isSignIn && styles.switchTextOn]}>로그인</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                style={[styles.switchItem, isSignUp && styles.switchItemOn]}
                onPress={() => clearMode("signUp")}
              >
                <Text style={[styles.switchText, isSignUp && styles.switchTextOn]}>회원가입</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                style={[styles.switchItem, mode === "otp" && styles.switchItemOn]}
                onPress={() => clearMode("otp")}
              >
                <Text style={[styles.switchText, mode === "otp" && styles.switchTextOn]}>인증번호</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>메일</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setFieldError("email");
              }}
              onBlur={() => setEmailTouched(true)}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="name@example.com"
              placeholderTextColor={COLORS.dim}
              style={[styles.input, (errors.email || liveEmailError) && styles.inputError]}
            />
            {errors.email || liveEmailError ? (
              <Text style={styles.errorText}>{errors.email || liveEmailError}</Text>
            ) : null}

            {mode !== "otp" ? (
              <>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>비밀번호</Text>
                  {isSignIn ? (
                    <Pressable disabled={busy} onPress={sendResetPassword}>
                      <Text style={[styles.textLink, busy && styles.disabledText]}>비밀번호 재설정</Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setFieldError("password");
                  }}
                  onBlur={() => setPasswordTouched(true)}
                  editable={!busy}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType={isSignIn ? "password" : "newPassword"}
                  placeholder={isSignUp ? "8자 이상, 숫자와 특수문자 포함" : "비밀번호"}
                  placeholderTextColor={COLORS.dim}
                  style={[styles.input, (errors.password || livePasswordError) && styles.inputError]}
                />
                {errors.password || livePasswordError ? (
                  <Text style={styles.errorText}>{errors.password || livePasswordError}</Text>
                ) : null}
                {isSignUp ? (
                  <View style={styles.rulesBox}>
                    <PasswordRule ok={checks.length} label="8자 이상" />
                    <PasswordRule ok={checks.number} label="숫자 포함" />
                    <PasswordRule ok={checks.special} label="특수문자 포함" />
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.label}>인증번호 확인</Text>
                  <Pressable disabled={busy} onPress={resendEmail}>
                    <Text style={[styles.textLink, busy && styles.disabledText]}>
                      {otpSent ? "다시 받기" : "인증번호 받기"}
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  value={token}
                  onChangeText={(text) => {
                    setToken(text.replace(/[^0-9]/g, "").slice(0, 6));
                    setFieldError("token");
                  }}
                  editable={!busy}
                  keyboardType="number-pad"
                  placeholder="메일로 받은 6자리 코드"
                  placeholderTextColor={COLORS.dim}
                  style={[styles.input, errors.token && styles.inputError]}
                />
                {errors.token ? <Text style={styles.errorText}>{errors.token}</Text> : null}
                <Text style={styles.fieldHint}>
                  먼저 인증번호 받기를 누른 뒤, 메일에 도착한 6자리 코드를 입력하세요.
                </Text>
              </>
            )}

            {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}
            {notice ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeBody}>{notice.body}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryButton,
                busy && styles.disabledButton,
                pressed && !busy && styles.pressed,
              ]}
              onPress={submit}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === "signIn"
                    ? "로그인"
                    : mode === "signUp"
                      ? "회원가입"
                      : otpSent
                        ? "인증하고 로그인"
                        : "인증번호 받기"}
                </Text>
              )}
            </Pressable>

            {mode === "signUp" && email ? (
              <Pressable style={styles.secondaryButton} onPress={resendEmail} disabled={busy}>
                <Text style={[styles.secondaryButtonText, busy && styles.disabledText]}>
                  인증 메일 다시 보내기
                </Text>
              </Pressable>
            ) : null}

            <Text style={styles.helpText}>
              구글 로그인은 Supabase Google Provider와 Google Cloud OAuth 설정이 완료되어야 작동합니다. 인증번호
              로그인은 Supabase 메일 템플릿에 6자리 토큰이 포함되어 있어야 합니다.
            </Text>
          </View>

          <View style={styles.guestFooter}>
            <Text style={styles.guestFooterTitle}>먼저 둘러보고 싶다면</Text>
            <Text style={styles.guestFooterText}>
              게스트 모드는 저장 없이 앱 화면과 학습 흐름을 바로 확인할 수 있습니다.
            </Text>
            <Pressable
              disabled={busy}
              style={({ pressed }) => [
                styles.guestFooterButton,
                busy && styles.disabledButton,
                pressed && !busy && styles.pressed,
              ]}
              onPress={continueGuest}
            >
              <Text style={styles.guestFooterButtonText}>게스트 모드로 둘러보기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.pageX, paddingTop: 24, paddingBottom: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  brandText: { flex: 1 },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  logoMarkText: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  logo: { color: COLORS.text, fontSize: TYPO.logo, fontWeight: "800" },
  subtitle: { color: COLORS.muted, fontSize: TYPO.small, marginTop: 2 },
  heroCard: {
    display: "none",
    backgroundColor: COLORS.card,
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 20,
    marginBottom: 14,
  },
  accountIntroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 20,
    marginBottom: 14,
  },
  kicker: { color: COLORS.cyan, fontWeight: "800", fontSize: TYPO.small },
  title: { color: COLORS.text, fontSize: 25, lineHeight: 34, fontWeight: "800", marginTop: 12 },
  description: { color: COLORS.muted, fontSize: TYPO.body, lineHeight: TYPO.bodyLine, marginTop: 10 },
  guestButton: {
    minHeight: 54,
    borderRadius: RADII.card,
    backgroundColor: COLORS.violet,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  guestButtonText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  guestFooter: {
    marginTop: 14,
    padding: 16,
    borderRadius: RADII.cardLg,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  guestFooterTitle: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.h3 },
  guestFooterText: { color: COLORS.muted, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 6 },
  guestFooterButton: {
    minHeight: 48,
    borderRadius: RADII.card,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  guestFooterButtonText: { color: COLORS.text, fontWeight: "900", fontSize: TYPO.body },
  warningCard: {
    backgroundColor: "#2B2442",
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.gold,
    padding: 16,
    marginBottom: 14,
  },
  warningTitle: { color: COLORS.gold, fontWeight: "800", fontSize: TYPO.h3 },
  warningText: { color: COLORS.text, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 8 },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.cardLg,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 18,
  },
  googleButton: {
    minHeight: 54,
    borderRadius: RADII.card,
    backgroundColor: "#F7F8FF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  googleMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  googleMarkText: { color: "#4285F4", fontSize: 17, fontWeight: "900" },
  googleButtonText: { color: "#111827", fontSize: TYPO.h3, fontWeight: "900" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.lineSoft },
  dividerText: { color: COLORS.dim, fontSize: TYPO.small, fontWeight: "800" },
  switchRow: {
    flexDirection: "row",
    backgroundColor: COLORS.field,
    borderRadius: RADII.pill,
    padding: 4,
    marginBottom: 18,
  },
  switchItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADII.pill,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  switchItemOn: { backgroundColor: COLORS.blue },
  switchText: { color: COLORS.muted, fontWeight: "800", fontSize: TYPO.small },
  switchTextOn: { color: COLORS.text },
  label: { color: COLORS.muted, fontWeight: "800", marginBottom: 8, marginTop: 12 },
  passwordLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  otpHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  textLink: { color: "#BFC4FF", fontWeight: "800", fontSize: TYPO.small, marginTop: 12, marginBottom: 8 },
  disabledText: { opacity: 0.45 },
  input: {
    backgroundColor: COLORS.field,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.line,
    color: COLORS.text,
    minHeight: 54,
    paddingHorizontal: 14,
    fontSize: TYPO.body,
    fontWeight: "700",
  },
  inputError: { borderColor: COLORS.red, backgroundColor: "#271A34" },
  errorText: { color: "#FF8A98", fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 7, fontWeight: "700" },
  submitError: {
    color: "#FF8A98",
    fontSize: TYPO.small,
    lineHeight: TYPO.smallLine,
    marginTop: 14,
    fontWeight: "800",
  },
  fieldHint: { color: COLORS.dim, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 8 },
  rulesBox: { backgroundColor: "#11183C", borderRadius: RADII.md, padding: 12, marginTop: 10, gap: 8 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleDot: { width: 8, height: 8, borderRadius: 4 },
  ruleDotOk: { backgroundColor: COLORS.green },
  ruleDotBad: { backgroundColor: COLORS.red },
  ruleText: { fontSize: TYPO.small, fontWeight: "800" },
  ruleTextOk: { color: COLORS.green },
  ruleTextBad: { color: "#FF8A98" },
  noticeCard: {
    backgroundColor: "#10263A",
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: "rgba(80,216,144,0.45)",
    padding: 13,
    marginTop: 14,
  },
  noticeTitle: { color: COLORS.green, fontSize: TYPO.small, fontWeight: "900", marginBottom: 4 },
  noticeBody: { color: COLORS.text, fontSize: TYPO.small, lineHeight: TYPO.smallLine, fontWeight: "700" },
  primaryButton: {
    minHeight: 54,
    backgroundColor: COLORS.blue,
    borderRadius: RADII.card,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  disabledButton: { opacity: 0.55 },
  pressed: { opacity: 0.9 },
  primaryButtonText: { color: COLORS.text, fontWeight: "800", fontSize: TYPO.h3 },
  secondaryButton: {
    minHeight: 48,
    borderRadius: RADII.card,
    backgroundColor: COLORS.card2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  secondaryButtonText: { color: COLORS.text, fontWeight: "800" },
  helpText: { color: COLORS.dim, fontSize: TYPO.small, lineHeight: TYPO.smallLine, marginTop: 14 },
});
