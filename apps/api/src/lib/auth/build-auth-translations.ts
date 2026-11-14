import { SUPPORTED_LOCALES, type SupportedLocale } from "@bondery/translations";
import { loadNamespace } from "@bondery/translations/loader";

/** Curated Better Auth codes shipped in `common.errors.auth`. */
export const AUTH_ERROR_CODES = [
  "CREDENTIAL_ACCOUNT_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
  "EMAIL_SEND_FAILED",
  "FAILED_TO_CREATE_SESSION",
  "FAILED_TO_CREATE_USER",
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_PASSWORD",
  "INVALID_TOKEN",
  "SESSION_EXPIRED",
  "SOCIAL_ACCOUNT_ALREADY_LINKED",
  "TOKEN_EXPIRED",
  "TOO_MANY_REQUESTS",
  "USER_NOT_FOUND",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

type CommonErrors = {
  errors?: {
    auth?: Partial<Record<AuthErrorCode, string>>;
  };
};

function readAuthErrors(lng: SupportedLocale): Record<string, string> {
  const common = loadNamespace(lng, "common") as CommonErrors;
  const auth = common.errors?.auth ?? {};
  const entries: [string, string][] = [];

  for (const code of AUTH_ERROR_CODES) {
    const message = auth[code];
    if (message) {
      entries.push([code, message]);
    }
  }

  return Object.fromEntries(entries);
}

/**
 * Builds the static translation map expected by `@better-auth/i18n` from
 * `common.errors.auth` in `@bondery/translations`.
 */
export function buildAuthTranslations(): Record<SupportedLocale, Record<string, string>> {
  return Object.fromEntries(SUPPORTED_LOCALES.map((lng) => [lng, readAuthErrors(lng)])) as Record<
    SupportedLocale,
    Record<string, string>
  >;
}
