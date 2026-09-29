const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type CompactAgeLabels = {
  ageDaysShort: (count: number) => string;
  ageHoursShort: (count: number) => string;
  lessThanMinuteLabel: string;
};

/**
 * Compact sidebar age: `< 60s` uses `lessThanMinuteLabel`, then `{n}h` until 24h, then `{n}d`.
 * Sub-hour durations in the hours bucket display as `1h` so the slot never shows `0h`.
 */
export function formatCompactAge(
  date: Date,
  labels: CompactAgeLabels,
  now: Date = new Date(),
): string {
  const elapsedMs = now.getTime() - date.getTime();
  if (elapsedMs < MINUTE_MS) {
    return labels.lessThanMinuteLabel;
  }

  if (elapsedMs < DAY_MS) {
    const hours = Math.max(1, Math.floor(elapsedMs / HOUR_MS));
    return labels.ageHoursShort(hours);
  }

  const days = Math.max(1, Math.floor(elapsedMs / DAY_MS));
  return labels.ageDaysShort(days);
}
