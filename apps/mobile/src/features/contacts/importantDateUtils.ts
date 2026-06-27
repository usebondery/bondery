/** Epoch year used for recurring dates without a year (matches web + vCard convention). */
export const YEARLESS_SENTINEL = 1904;

export interface ImportantDateWheelValue {
  day: number;
  month: number;
  year: number;
  withoutYear: boolean;
}

export function isYearlessDate(iso: string): boolean {
  const year = Number.parseInt(iso.slice(0, 4), 10);
  return year === YEARLESS_SENTINEL;
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function clampDay(day: number, month: number, year: number): number {
  const max = daysInMonth(month, year);
  return Math.min(Math.max(day, 1), max);
}

export function fromImportantDateIso(iso: string): ImportantDateWheelValue {
  const [yearPart, monthPart, dayPart] = iso.slice(0, 10).split("-").map(Number);
  const withoutYear = yearPart === YEARLESS_SENTINEL;

  return {
    day: dayPart || 1,
    month: monthPart || 1,
    year: withoutYear ? new Date().getFullYear() : yearPart || new Date().getFullYear(),
    withoutYear,
  };
}

export function toImportantDateIso(value: ImportantDateWheelValue): string {
  const year = value.withoutYear ? YEARLESS_SENTINEL : value.year;
  const clampYear = value.withoutYear ? YEARLESS_SENTINEL : value.year;
  const day = clampDay(value.day, value.month, clampYear);
  const month = String(value.month).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");

  return `${year}-${month}-${dayStr}`;
}

export function resolveDateLocale(language: string): string {
  if (language.startsWith("cs")) {
    return "cs-CZ";
  }

  return "en-US";
}

export function formatImportantDate(iso: string, locale = "en-US"): string {
  const parsed = fromImportantDateIso(iso);
  const date = new Date(
    parsed.withoutYear ? YEARLESS_SENTINEL : parsed.year,
    parsed.month - 1,
    parsed.day,
  );

  return date.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    ...(parsed.withoutYear ? {} : { year: "numeric" }),
  });
}

export function getMonthLabels(locale: string): string[] {
  return Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString(locale, { month: "long" }),
  );
}

export function buildYearRange(start = 1900, endOffset = 10): number[] {
  const end = new Date().getFullYear() + endOffset;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function defaultWithoutYearForType(type: string | null | undefined): boolean {
  return type === "birthday" || type === "nameday";
}

export function createTodayImportantDateIso(withoutYear = false): string {
  const now = new Date();
  return toImportantDateIso({
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    withoutYear,
  });
}

export function createDefaultWheelValue(
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
    year: now.getFullYear(),
    withoutYear,
  };
}
