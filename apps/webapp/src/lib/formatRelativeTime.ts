import type { useFormatter } from "next-intl";

type Formatter = ReturnType<typeof useFormatter>;

/**
 * Formats a date as a relative time string with a "less than a minute ago" fallback.
 *
 * next-intl's relativeTime() produces confusing output (e.g. "0 seconds ago") for
 * very recent dates. This utility returns the provided lessThanMinuteLabel instead
 * when the date is within the last 60 seconds.
 *
 * @param date - The date to format.
 * @param formatter - The next-intl formatter from useFormatter().
 * @param lessThanMinuteLabel - Translated label to show when the date is < 60 seconds ago.
 * @returns Formatted relative time string.
 */
export function formatRelativeTime(
  date: Date,
  formatter: Formatter,
  lessThanMinuteLabel: string,
): string {
  if (Date.now() - date.getTime() < 60_000) {
    return lessThanMinuteLabel;
  }
  return formatter.relativeTime(date, new Date());
}
