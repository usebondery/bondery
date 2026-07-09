export interface DateFormatterLike {
  dateTime: (date: Date, opts?: Intl.DateTimeFormatOptions & { timeZone?: string }) => string;
  number: (value: number, opts?: Intl.NumberFormatOptions) => string;
  relativeTime: (date: Date, base: Date) => string;
}

/**
 * Formats a date as a relative time string with a "less than a minute ago" fallback.
 *
 * Very recent dates can produce confusing output (e.g. "0 seconds ago").
 * This utility returns the provided lessThanMinuteLabel instead when the date
 * is within the last 60 seconds.
 */
export function formatRelativeTime(
  date: Date,
  formatter: DateFormatterLike,
  lessThanMinuteLabel: string,
): string {
  if (Date.now() - date.getTime() < 60_000) {
    return lessThanMinuteLabel;
  }
  return formatter.relativeTime(date, new Date());
}

/**
 * Formats an API key / resource last-used timestamp.
 * Returns the never-used label when `lastUsedAt` is null instead of nesting it
 * inside a "Last used …" prefix.
 */
export function formatLastUsedAt(
  lastUsedAt: string | null,
  formatter: DateFormatterLike,
  labels: {
    neverUsed: string;
    lessThanMinuteAgo: string;
    lastUsed: (time: string) => string;
  },
): string {
  if (!lastUsedAt) {
    return labels.neverUsed;
  }

  const time = formatRelativeTime(new Date(lastUsedAt), formatter, labels.lessThanMinuteAgo);
  return labels.lastUsed(time);
}
