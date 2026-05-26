import { AppLanguage } from "../types";

export type ValidationCode =
  | "validEmail"
  | "required"
  | "timeRange"
  | "tooLong"
  | "invalidDate"
  | "invalidNumber"
  | "invalidFileType"
  | "fileTooLarge";

export type ValidationResult<T = string> =
  | { ok: true; value: T }
  | { ok: false; message: string; code: ValidationCode };

const MESSAGES: Record<AppLanguage, Record<ValidationCode, string>> = {
  한국어: {
    validEmail: "올바른 이메일 주소를 입력해 주세요.",
    required: "제목을 입력해 주세요.",
    timeRange: "종료 시간은 시작 시간보다 늦어야 합니다.",
    tooLong: "입력한 문장이 너무 깁니다.",
    invalidDate: "날짜 형식을 확인해 주세요.",
    invalidNumber: "숫자를 올바르게 입력해 주세요.",
    invalidFileType: "이미지 파일만 업로드할 수 있습니다.",
    fileTooLarge: "파일 용량이 너무 큽니다.",
  },
  日本語: {
    validEmail: "有効なメールアドレスを入力してください。",
    required: "タイトルを入力してください。",
    timeRange: "終了時間は開始時間より後にしてください。",
    tooLong: "入力内容が長すぎます。",
    invalidDate: "日付の形式を確認してください。",
    invalidNumber: "数値を正しく入力してください。",
    invalidFileType: "画像ファイルのみアップロードできます。",
    fileTooLarge: "ファイルサイズが大きすぎます。",
  },
  中文: {
    validEmail: "请输入有效的邮箱地址。",
    required: "请输入标题。",
    timeRange: "结束时间必须晚于开始时间。",
    tooLong: "输入内容过长。",
    invalidDate: "请检查日期格式。",
    invalidNumber: "请输入有效数字。",
    invalidFileType: "只能上传图片文件。",
    fileTooLarge: "文件过大。",
  },
  English: {
    validEmail: "Please enter a valid email address.",
    required: "Title is required.",
    timeRange: "End time must be after start time.",
    tooLong: "Text is too long.",
    invalidDate: "Please check the date format.",
    invalidNumber: "Please enter a valid number.",
    invalidFileType: "Only image files can be uploaded.",
    fileTooLarge: "File is too large.",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^(20\d{2})([.-](0?[1-9]|1[0-2]))?([.-](0?[1-9]|[12]\d|3[01]))?(\s+\d{1,2}:\d{2})?(\s*[A-Za-z가-힣一-龥ぁ-んァ-ン]*)?$/;
const MAX_HIGHLIGHT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_HIGHLIGHT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);

export function validationMessage(code: ValidationCode, appLanguage: AppLanguage = "한국어") {
  return MESSAGES[appLanguage]?.[code] || MESSAGES.한국어[code];
}

export function sanitizeText(value: unknown, maxLength = 1000) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateEmail(value: unknown, appLanguage: AppLanguage = "한국어"): ValidationResult {
  const email = sanitizeText(value, 254);
  if (!EMAIL_RE.test(email)) return { ok: false, code: "validEmail", message: validationMessage("validEmail", appLanguage) };
  return { ok: true, value: email };
}

export function validateRequiredText(
  value: unknown,
  maxLength = 120,
  appLanguage: AppLanguage = "한국어",
  emptyMessage?: string
): ValidationResult {
  const text = sanitizeText(value, maxLength + 1);
  if (!text) return { ok: false, code: "required", message: emptyMessage || validationMessage("required", appLanguage) };
  if (text.length > maxLength) return { ok: false, code: "tooLong", message: validationMessage("tooLong", appLanguage) };
  return { ok: true, value: text };
}

export function validateDateString(value: unknown, appLanguage: AppLanguage = "한국어", required = true): ValidationResult {
  const text = sanitizeText(value, 80);
  if (!text) {
    if (!required) return { ok: true, value: "" };
    return { ok: false, code: "invalidDate", message: validationMessage("invalidDate", appLanguage) };
  }
  if (!DATE_RE.test(text)) return { ok: false, code: "invalidDate", message: validationMessage("invalidDate", appLanguage) };
  return { ok: true, value: text };
}

export function validateTimeRange(startAt: unknown, endAt: unknown, appLanguage: AppLanguage = "한국어") {
  const start = new Date(String(startAt ?? ""));
  const end = new Date(String(endAt ?? ""));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end.getTime() <= start.getTime()) {
    return { ok: false as const, code: "timeRange" as const, message: validationMessage("timeRange", appLanguage) };
  }
  return { ok: true as const, value: { startAt: start.toISOString(), endAt: end.toISOString() } };
}

export function validateNumberRange(
  value: unknown,
  min: number,
  max: number,
  appLanguage: AppLanguage = "한국어"
): ValidationResult<number> {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { ok: false, code: "invalidNumber", message: validationMessage("invalidNumber", appLanguage) };
  }
  return { ok: true, value: parsed };
}

export function validatePlannerEvent(
  input: { title?: unknown; startAt?: unknown; endAt?: unknown },
  appLanguage: AppLanguage = "한국어"
) {
  const title = validateRequiredText(input.title, 120, appLanguage);
  if (!title.ok) return title;
  if (input.startAt || input.endAt) {
    const range = validateTimeRange(input.startAt, input.endAt, appLanguage);
    if (!range.ok) return range;
  }
  return { ok: true as const, value: { title: title.value } };
}

export function validateUserProfile(
  input: { name?: unknown; current_level?: unknown },
  appLanguage: AppLanguage = "한국어"
) {
  const name = validateRequiredText(input.name, 40, appLanguage, appLanguage === "English" ? "Nickname is required." : "이름을 입력해 주세요.");
  if (!name.ok) return name;
  const currentLevel = validateRequiredText(input.current_level, 120, appLanguage, appLanguage === "English" ? "Study goal is required." : "학습 목표를 입력해 주세요.");
  if (!currentLevel.ok) return currentLevel;
  return { ok: true as const, value: { name: name.value, current_level: currentLevel.value } };
}

export function validateBulkScheduleImportText(value: unknown, appLanguage: AppLanguage = "한국어") {
  const text = String(value ?? "").trim();
  if (!text) return { ok: false as const, code: "required" as const, message: validationMessage("required", appLanguage) };
  if (text.length > 12000 || text.split(/\r?\n/).length > 300) {
    return { ok: false as const, code: "tooLong" as const, message: validationMessage("tooLong", appLanguage) };
  }
  return { ok: true as const, value: text };
}

export function validateHighlightUploadFile(
  file: (Blob & { name?: string; type?: string; size?: number }) | undefined,
  appLanguage: AppLanguage = "한국어"
) {
  if (!file) return { ok: false as const, code: "required" as const, message: validationMessage("required", appLanguage) };
  const mimeType = file.type || "";
  const name = String(file.name || "").toLowerCase();
  const allowedExtension = /\.(png|jpe?g|webp|heic|heif)$/.test(name);
  const allowedMimeType = !mimeType || ALLOWED_HIGHLIGHT_MIME_TYPES.has(mimeType);
  if (!allowedMimeType && !allowedExtension) {
    return { ok: false as const, code: "invalidFileType" as const, message: validationMessage("invalidFileType", appLanguage) };
  }
  if (Number(file.size || 0) > MAX_HIGHLIGHT_FILE_BYTES) {
    return { ok: false as const, code: "fileTooLarge" as const, message: validationMessage("fileTooLarge", appLanguage) };
  }
  return { ok: true as const, value: file };
}
