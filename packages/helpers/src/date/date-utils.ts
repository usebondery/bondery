import { type DateTimeFormatContext, formatUserDate } from "#date/format-user.js";

const PATTERN_5E285C647B34_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_PER_YEAR = 12;

/**
 * Date formatting utilities for work history and education display.
 *
 * Storage convention (set by toPostgresDate in redirect.ts):
 *   - Month-precise:  YYYY-MM-01  (day is always 01)
 *   - Year-only:      YYYY-07-02  (day=02 is the precision sentinel)
 */

/**
 * Parses a stored ISO date string into its components.
 * Avoids `new Date(string)` to prevent UTC-to-local timezone shifts.
 */
function parseDateComponents(d: string): { year: number; month: number; yearOnly: boolean } {
  const [yearStr, monthStr, dayStr] = d.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr ?? 1);
  const day = Number(dayStr ?? 1);
  // day=02 is the year-only sentinel (see toPostgresDate in redirect.ts)
  const yearOnly = day === 2;
  return { month, year, yearOnly };
}

/**
 * Formats a single stored date string for display.
 * Year-only dates (day=02 sentinel) are shown as just the year.
 * Month-precise dates use local numeric components so UTC does not shift the month.
 */
function formatWorkHistoryDate(d: string, ctx: DateTimeFormatContext): string {
  const { year, month, yearOnly } = parseDateComponents(d);
  if (yearOnly) {
    return String(year);
  }
  const date = new Date(year, month - 1, 1);
  return formatUserDate(date, { ...ctx, timeZone: undefined }, "monthYear");
}

/** Parse a `YYYY-MM-DD` calendar date as UTC midnight, so no timezone shifts the day. */
function parseCalendarDate(value: string): Date | undefined {
  const match = PATTERN_5E285C647B34_RE.exec(value);
  if (!match) {
    return undefined;
  }

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);

  // `new Date` rolls impossible days forward (2026-02-30 becomes 2026-03-02),
  // so compare the round trip to reject a date that does not exist.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return undefined;
  }

  return date;
}

/**
 * Formats a date range string from start/end stored date values.
 * Year-only dates (day=02 sentinel) are shown without a month.
 * Pass a translated `presentLabel` for ongoing entries.
 *
 * @param startDate Stored date string (e.g. "2025-01-01" or "2025-07-02") or null.
 * @param endDate Stored date string or null.
 * @param ctx User date format preferences.
 * @param presentLabel Translated label for a missing end date.
 * @returns Formatted date range like "Jan 2025 – Present", "2025 – Present", or empty string.
 */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  ctx: DateTimeFormatContext,
  presentLabel: string,
): string {
  if (!startDate && !endDate) {
    return "";
  }
  if (startDate && !endDate) {
    return `${formatWorkHistoryDate(startDate, ctx)} – ${presentLabel}`;
  }
  if (!startDate && endDate) {
    return `– ${formatWorkHistoryDate(endDate, ctx)}`;
  }
  if (startDate && endDate) {
    return `${formatWorkHistoryDate(startDate, ctx)} – ${formatWorkHistoryDate(endDate, ctx)}`;
  }
  return "";
}

/**
 * Calculates and formats the duration between two stored dates.
 * Uses the current date when endDate is null (ongoing).
 * Year-only start dates count from January; year-only end dates count to December.
 *
 * @param startDate Stored date string (e.g. "2025-01-01" or "2025-07-02") or null.
 * @param endDate Stored date string or null (treated as today).
 * @param _ctx User date format preferences. Duration unit copy stays English.
 * @returns Formatted duration like "1 year, 2 months", "3 months", or null if startDate is missing.
 */
export function formatDuration(
  startDate: string | null,
  endDate: string | null,
  _ctx: DateTimeFormatContext,
): string | null {
  if (!startDate) {
    return null;
  }

  const s = parseDateComponents(startDate);

  const now = new Date();
  let endYear: number;
  let endMonth: number;
  let endYearOnly: boolean;
  if (endDate) {
    const e = parseDateComponents(endDate);
    endYear = e.year;
    endMonth = e.month;
    endYearOnly = e.yearOnly;
  } else {
    endYear = now.getFullYear();
    endMonth = now.getMonth() + 1;
    endYearOnly = false;
  }

  // When either boundary is year-only we lack month precision —
  // show whole years only to avoid misleading "11 months" from padding.
  if (s.yearOnly || endYearOnly) {
    const years = endYear - s.year;
    if (years <= 0) {
      return null;
    }
    return `${years} year${years > 1 ? "s" : ""}`;
  }

  let months = (endYear - s.year) * MONTHS_PER_YEAR + (endMonth - s.month);
  if (months < 0) {
    months = 0;
  }

  const years = Math.floor(months / MONTHS_PER_YEAR);
  const remainingMonths = months % MONTHS_PER_YEAR;

  if (years === 0 && remainingMonths === 0) {
    return null;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} year${years > 1 ? "s" : ""}`);
  }
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`);
  }

  return parts.join(", ");
}

/**
 * Formats a `YYYY-MM-DD` calendar date for display, e.g. `September 30, 2026`.
 *
 * The value is a calendar date with no time, so the format timezone is UTC.
 * A local zone would shift the day for anyone west of UTC.
 *
 * @param value Calendar date, e.g. `2026-09-30`.
 * @param locale BCP 47 locale tag. Defaults to `en-US`, the marketing site locale.
 * @returns The formatted date, or `null` when the input is not a real date.
 */
export function formatCalendarDate(value: string, locale = "en-US"): string | null {
  const date = parseCalendarDate(value);
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}
