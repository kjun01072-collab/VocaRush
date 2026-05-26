import { AppLanguage } from "../types";

declare const __DEV__: boolean | undefined;
declare const process:
  | {
      env?: {
        NODE_ENV?: string;
      };
    }
  | undefined;

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

const SAFE_ERROR_MESSAGE: Record<AppLanguage, string> = {
  한국어: "문제가 발생했습니다. 다시 시도해 주세요.",
  日本語: "問題が発生しました。もう一度お試しください。",
  中文: "发生错误。请重试。",
  English: "Something went wrong. Please try again.",
};

export function getSafeErrorMessage(error: unknown, appLanguage: AppLanguage = "한국어") {
  if (error instanceof UserFacingError) return error.message;
  return SAFE_ERROR_MESSAGE[appLanguage] || SAFE_ERROR_MESSAGE.한국어;
}

export function logInternalError(error: unknown, context: string) {
  const isDev =
    (typeof __DEV__ !== "undefined" && Boolean(__DEV__)) ||
    (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production");

  if (!isDev) return;
  console.warn(`[VocaRush:${context}]`, error);
}
