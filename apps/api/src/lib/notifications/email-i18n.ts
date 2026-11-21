import {
  type DateTimeFormatContext,
  formatUserDate,
  type UserDateStyle,
} from "@bondery/helpers/date";
import {
  coerceDateFormatPreference,
  coerceSupportedLocale,
  coerceTimeFormatPreference,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@bondery/schemas/locale";
import { loadNamespace } from "@bondery/translations/loader";
import { orIfBlank } from "../platform/blank-text.js";

export type EmailCopyValues = Record<string, string | number | boolean | null | undefined>;

export type EmailFormatContext = DateTimeFormatContext & { locale: SupportedLocale };

export function defaultEmailFormatContext(): EmailFormatContext {
  return {
    dateFormat: "locale",
    locale: DEFAULT_LOCALE,
    timeFormat: "24h",
    timeZone: "UTC",
  };
}

function contextFromSettingsRow(row: {
  dateFormat: string | null;
  language: string | null;
  timeFormat: string | null;
  timezone: string | null;
}): EmailFormatContext {
  return {
    dateFormat: coerceDateFormatPreference(row.dateFormat),
    locale: coerceSupportedLocale(row.language) ?? DEFAULT_LOCALE,
    timeFormat: coerceTimeFormatPreference(row.timeFormat),
    timeZone: orIfBlank(row.timezone, "UTC"),
  };
}

export async function resolveEmailLocale(
  userId: string | null | undefined,
): Promise<EmailFormatContext> {
  if (!userId) {
    return defaultEmailFormatContext();
  }

  const { prisma } = await import("@bondery/db");
  const settings = await prisma.userSettings.findUnique({
    select: { dateFormat: true, language: true, timeFormat: true, timezone: true },
    where: { userId },
  });

  if (!settings) {
    return defaultEmailFormatContext();
  }

  return contextFromSettingsRow(settings);
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
  ctx: EmailFormatContext,
  style: Extract<UserDateStyle, "medium" | "long"> = "medium",
): string {
  return formatUserDate(date, { ...ctx, timeZone: "UTC" }, style);
}

export function formatEmailDateFromIso(
  isoDate: string,
  ctx: EmailFormatContext,
  style: Extract<UserDateStyle, "medium" | "long"> = "medium",
): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return formatEmailDate(parsed, ctx, style);
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
  return cache[lng] ?? cache[DEFAULT_LOCALE] ?? {};
}

export async function resolveEmailLocalesForUsers(
  userIds: string[],
): Promise<Map<string, EmailFormatContext>> {
  const uniqueIds = [...new Set(userIds)];
  const formatByUserId = new Map<string, EmailFormatContext>(
    uniqueIds.map((userId) => [userId, defaultEmailFormatContext()]),
  );

  if (uniqueIds.length === 0) {
    return formatByUserId;
  }

  const { prisma } = await import("@bondery/db");
  const settings = await prisma.userSettings.findMany({
    select: { dateFormat: true, language: true, timeFormat: true, timezone: true, userId: true },
    where: { userId: { in: uniqueIds } },
  });

  for (const row of settings) {
    formatByUserId.set(row.userId, contextFromSettingsRow(row));
  }

  return formatByUserId;
}
