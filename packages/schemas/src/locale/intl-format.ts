import type { DateFormatPreference, TimeFormatPreference } from "#entities/settings/types.js";
import { intlTagForLocale } from "./supported-locale/schema.js";

export type TextDirection = "ltr" | "rtl";

/** Maps catalog `dir` to a document direction. */
export function directionFromDirField(dir: "ltr" | "rtl" | null | undefined): TextDirection {
  return dir === "rtl" ? "rtl" : "ltr";
}

const DATE_FORMAT_VALUES = ["locale", "mdy", "dmy", "ymd"] as const;

export function coerceDateFormatPreference(raw: string | null | undefined): DateFormatPreference {
  if (raw && (DATE_FORMAT_VALUES as readonly string[]).includes(raw)) {
    return raw as DateFormatPreference;
  }
  return "locale";
}

/**
 * Single BCP 47 tag for Intl date/number/relative formatters.
 * Pins Gregorian calendar, Latin digits, and hour cycle — never append a second `-u-`.
 */
export function buildIntlLocaleTag(
  locale: string | null | undefined,
  timeFormat: TimeFormatPreference,
): string {
  const tag = intlTagForLocale(locale);
  const hc = timeFormat === "12h" ? "h12" : "h23";
  return `${tag}-u-ca-gregory-hc-${hc}-nu-latn`;
}

export interface FormatOrderedDateOptions {
  date: Date;
  dateFormat: DateFormatPreference;
  intlLocaleTag: string;
  timeZone?: string;
}

type NumericDateOrder = "mdy" | "dmy" | "ymd";

function joinNumericDate(
  order: NumericDateOrder,
  month: string,
  day: string,
  year: string,
): string {
  const sep = order === "ymd" ? "-" : "/";
  const parts =
    order === "mdy"
      ? [month, day, year]
      : order === "dmy"
        ? [day, month, year]
        : [year, month, day];
  return parts.join(sep);
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

/**
 * Formats a calendar date with optional order override.
 * When `dateFormat` is `locale`, delegates to Intl for the tag.
 */
export function formatOrderedDate({
  date,
  dateFormat,
  intlLocaleTag,
  timeZone,
}: FormatOrderedDateOptions): string {
  const baseOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  };

  if (dateFormat === "locale") {
    return new Intl.DateTimeFormat(intlLocaleTag, baseOptions).format(date);
  }

  const parts = new Intl.DateTimeFormat(intlLocaleTag, baseOptions).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  const hasNamedMonth = month.length > 2 || Number.isNaN(Number.parseInt(month, 10));
  if (hasNamedMonth) {
    const namedOrder: Record<NumericDateOrder, string> = {
      dmy: `${day} ${month} ${year}`,
      mdy: `${month} ${day}, ${year}`,
      ymd: `${year} ${month} ${day}`,
    };
    return namedOrder[dateFormat];
  }

  return joinNumericDate(dateFormat, pad2(month), pad2(day), year);
}

/** CSS font-family stack when a script needs more than Lexend. Otherwise null. */
export function fontStackForLocale(locale: string | null | undefined): string | null {
  const code = (locale ?? "").toLowerCase();
  switch (code) {
    case "zh-hans":
    case "zh":
      return '"PingFang SC", "Hiragino Sans", "Noto Sans SC", sans-serif';
    case "ja":
      return '"Yu Gothic", "Hiragino Sans", Meiryo, sans-serif';
    case "he":
      return '"Noto Sans Hebrew", sans-serif';
    case "ar":
      return '"Noto Sans Arabic", sans-serif';
    case "th":
      return '"Noto Sans Thai", sans-serif';
    default:
      return null;
  }
}

const AMBIGUOUS_NUMERIC_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/**
 * Parses `MM/DD/YYYY` or `DD/MM/YYYY` when the user chose an order preference.
 * Returns null for `locale` or non-matching input.
 */
export function parseAmbiguousNumericDate(
  raw: string,
  dateFormat: DateFormatPreference,
): { year: number; month: number; day: number } | null {
  if (dateFormat !== "mdy" && dateFormat !== "dmy") {
    return null;
  }

  const match = raw.trim().match(AMBIGUOUS_NUMERIC_DATE);
  if (!match) {
    return null;
  }

  const first = Number.parseInt(match[1] ?? "", 10);
  const second = Number.parseInt(match[2] ?? "", 10);
  const year = Number.parseInt(match[3] ?? "", 10);

  if (dateFormat === "mdy") {
    return { day: second, month: first, year };
  }
  return { day: first, month: second, year };
}
