import { type DateTimeFormatContext, formatUserDate } from "@bondery/helpers/date";
import { buildIntlLocaleTag } from "@bondery/schemas/locale";

/** Epoch year used for recurring dates without a year (matches web + vCard convention). */
const YEARLESS_SENTINEL = 1904;

/** Characters of the year at the start of an ISO `YYYY-MM-DD` date. */
const ISO_YEAR_LENGTH = 4;

interface ImportantDateWheelValue {
  day: number;
  month: number;
  withoutYear: boolean;
  year: number;
}

function isYearlessDate(iso: string): boolean {
  const year = Number.parseInt(iso.slice(0, ISO_YEAR_LENGTH), 10);
  return year === YEARLESS_SENTINEL;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(day: number, month: number, year: number): number {
  const max = daysInMonth(month, year);
  return Math.min(Math.max(day, 1), max);
}

function fromImportantDateIso(iso: string): ImportantDateWheelValue {
  const [yearPart, monthPart, dayPart] = iso.slice(0, 10).split("-").map(Number);
  const withoutYear = yearPart === YEARLESS_SENTINEL;

  return {
    day: dayPart || 1,
    month: monthPart || 1,
    withoutYear,
    year: withoutYear ? new Date().getFullYear() : yearPart || new Date().getFullYear(),
  };
}

function toImportantDateIso(value: ImportantDateWheelValue): string {
  const year = value.withoutYear ? YEARLESS_SENTINEL : value.year;
  const clampYear = value.withoutYear ? YEARLESS_SENTINEL : value.year;
  const day = clampDay(value.day, value.month, clampYear);
  const month = String(value.month).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");

  return `${year}-${month}-${dayStr}`;
}

function resolveDateLocale(language: string): string {
  return buildIntlLocaleTag(language, "24h");
}

function formatImportantDate(iso: string, ctx: DateTimeFormatContext): string {
  const parsed = fromImportantDateIso(iso);
  const date = new Date(
    parsed.withoutYear ? YEARLESS_SENTINEL : parsed.year,
    parsed.month - 1,
    parsed.day,
  );

  return formatUserDate(
    date,
    { ...ctx, timeZone: undefined },
    parsed.withoutYear ? "monthDay" : "long",
  );
}

function getMonthLabels(locale: string): string[] {
  return Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString(locale, { month: "long" }),
  );
}

function buildYearRange(start = 1900, endOffset = 10): number[] {
  const end = new Date().getFullYear() + endOffset;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function defaultWithoutYearForType(type: string | null | undefined): boolean {
  return type === "birthday" || type === "nameday";
}

function createTodayImportantDateIso(withoutYear = false): string {
  const now = new Date();
  return toImportantDateIso({
    day: now.getDate(),
    month: now.getMonth() + 1,
    withoutYear,
    year: now.getFullYear(),
  });
}

function createDefaultWheelValue(
  type: string | null | undefined,
  existingIso?: string | null,
): ImportantDateWheelValue {
  if (existingIso) {
    return fromImportantDateIso(existingIso);
  }

  const now = new Date();
  const withoutYear = defaultWithoutYearForType(type);

  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    withoutYear,
    year: now.getFullYear(),
  };
}

export type { ImportantDateWheelValue };
export {
  buildYearRange,
  clampDay,
  createDefaultWheelValue,
  createTodayImportantDateIso,
  daysInMonth,
  defaultWithoutYearForType,
  formatImportantDate,
  fromImportantDateIso,
  getMonthLabels,
  isYearlessDate,
  resolveDateLocale,
  toImportantDateIso,
  YEARLESS_SENTINEL,
};
