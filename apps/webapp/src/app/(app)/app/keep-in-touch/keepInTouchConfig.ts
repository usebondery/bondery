/**
 * Canonical list of keep-in-touch frequency presets.
 * The `value` is the number of days between desired follow-ups.
 * `null` means "don't keep in touch" (removes the contact from the page).
 */
export const KEEP_IN_TOUCH_PRESETS = [
  { value: "7", days: 7, labelKey: "FrequencyWeekly" },
  { value: "14", days: 14, labelKey: "FrequencyBiweekly" },
  { value: "90", days: 90, labelKey: "FrequencyQuarterly" },
  { value: "180", days: 180, labelKey: "FrequencyBiannually" },
  { value: "365", days: 365, labelKey: "FrequencyYearly" },
] as const;

export type KeepInTouchDays = (typeof KEEP_IN_TOUCH_PRESETS)[number]["days"];

/**
 * Returns the label key for a given number of days, or undefined if no preset matches.
 */
export function getPresetLabelKey(days: number): string | undefined {
  return KEEP_IN_TOUCH_PRESETS.find((p) => p.days === days)?.labelKey;
}

/**
 * Computes the next due date string (YYYY-MM-DD) from lastInteraction + frequencyDays.
 * Returns null if either value is missing.
 */
export function computeNextDueDate(
  lastInteraction: string | null | undefined,
  keepFrequencyDays: number | null | undefined,
): Date | null {
  if (!lastInteraction || !keepFrequencyDays) return null;
  const next = new Date(lastInteraction);
  next.setDate(next.getDate() + keepFrequencyDays);
  return next;
}
