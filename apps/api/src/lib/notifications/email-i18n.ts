import {
  buildIntlLocaleTag,
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@bondery/schemas/locale";
import { loadNamespace } from "@bondery/translations/loader";

export type EmailCopyValues = Record<string, string | number | boolean | null | undefined>;

export async function resolveEmailLocale(
  userId: string | null | undefined,
): Promise<SupportedLocale> {
  if (!userId) {
    return DEFAULT_LOCALE;
  }

  const { getUserSettingsLanguage } = await import("../auth/get-user-settings-language.js");
  return (await getUserSettingsLanguage(userId)) ?? DEFAULT_LOCALE;
}

export function loadEmailNamespace(
  lng: SupportedLocale,
  namespace: string,
): Record<string, unknown> {
  return loadNamespace(lng, namespace);
}

export function interpolateCopy(template: string, values: EmailCopyValues): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function readCopyString(
  bundle: Record<string, unknown>,
  key: string,
  values?: EmailCopyValues,
): string {
  const raw = bundle[key];
  if (typeof raw !== "string") {
    return "";
  }

  return values ? interpolateCopy(raw, values) : raw;
}

export function formatEmailDate(
  date: Date,
  lng: SupportedLocale,
  style: "medium" | "long" = "medium",
): string {
  return date.toLocaleDateString(buildIntlLocaleTag(lng, "24h"), {
    dateStyle: style,
    timeZone: "UTC",
  });
}

export function formatEmailDateFromIso(
  isoDate: string,
  lng: SupportedLocale,
  style: "medium" | "long" = "medium",
): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return formatEmailDate(parsed, lng, style);
}

export function preloadEmailNamespaces(
  namespace: string,
): Record<SupportedLocale, Record<string, unknown>> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((lng) => [lng, loadNamespace(lng, namespace)]),
  ) as Record<SupportedLocale, Record<string, unknown>>;
}

export function getPreloadedCopy(
  cache: Record<SupportedLocale, Record<string, unknown>>,
  lng: SupportedLocale,
): Record<string, unknown> {
  return cache[lng] ?? cache[DEFAULT_LOCALE];
}

export async function resolveEmailLocalesForUsers(
  userIds: string[],
): Promise<Map<string, SupportedLocale>> {
  const uniqueIds = [...new Set(userIds)];
  const localeByUserId = new Map<string, SupportedLocale>(
    uniqueIds.map((userId) => [userId, DEFAULT_LOCALE]),
  );

  if (uniqueIds.length === 0) {
    return localeByUserId;
  }

  const { prisma } = await import("@bondery/db");
  const settings = await prisma.userSettings.findMany({
    select: { language: true, userId: true },
    where: { userId: { in: uniqueIds } },
  });

  for (const row of settings) {
    localeByUserId.set(row.userId, coerceSupportedLocale(row.language) ?? DEFAULT_LOCALE);
  }

  return localeByUserId;
}
