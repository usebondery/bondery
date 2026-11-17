import type { UserDateStyle } from "@bondery/helpers/date";

/** The part of `useDateFormatter` that speech needs. */
export interface DateSpeechFormatter {
  formatDate: (date: Date, style?: UserDateStyle) => string;
}

/**
 * Spoken form of a date. A voice needs a month name, not `08/04/2025`.
 *
 * The caller supplies the formatter, so this stays pure and follows the user
 * locale and timezone.
 */
export function dateSpeechText(date: Date, formatter: DateSpeechFormatter): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatter.formatDate(date, "long");
}
