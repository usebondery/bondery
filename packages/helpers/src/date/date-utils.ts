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
  return { year, month, yearOnly };
}

/**
 * Formats a single stored date string for display.
 * Year-only dates (day=02 sentinel) are shown as just the year.
 * Month-precise dates are rendered in local time (no UTC shift).
 */
function formatDate(d: string): string {
  const { year, month, yearOnly } = parseDateComponents(d);
  if (yearOnly) return String(year);
  // Construct in local time using numeric components to avoid UTC-to-local shift
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}

/**
 * Formats a date range string from start/end stored date values.
 * Year-only dates (day=02 sentinel) are shown without a month.
 * Shows a present label (default "Present") for null end dates.
 *
 * @param startDate Stored date string (e.g. "2025-01-01" or "2025-07-02") or null.
 * @param endDate Stored date string or null.
 * @param presentLabel Label to use for ongoing entries (default: "Present").
 * @returns Formatted date range like "Jan 2025 – Present", "2025 – Present", or empty string.
 */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  presentLabel = "Present",
): string {
  if (!startDate && !endDate) return "";
  if (startDate && !endDate) return `${formatDate(startDate)} – ${presentLabel}`;
  if (!startDate && endDate) return `– ${formatDate(endDate)}`;
  return `${formatDate(startDate!)} – ${formatDate(endDate!)}`;
}

/**
 * Calculates and formats the duration between two stored dates.
 * Uses the current date when endDate is null (ongoing).
 * Year-only start dates count from January; year-only end dates count to December.
 *
 * @param startDate Stored date string (e.g. "2025-01-01" or "2025-07-02") or null.
 * @param endDate Stored date string or null (treated as today).
 * @returns Formatted duration like "1 year, 2 months", "3 months", or null if startDate is missing.
 */
export function formatDuration(startDate: string | null, endDate: string | null): string | null {
  if (!startDate) return null;

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
    if (years <= 0) return null;
    return `${years} year${years > 1 ? "s" : ""}`;
  }

  let months = (endYear - s.year) * 12 + (endMonth - s.month);
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0 && remainingMonths === 0) return null;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`);

  return parts.join(", ");
}
