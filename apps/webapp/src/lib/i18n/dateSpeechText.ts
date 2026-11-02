import type { DateFormatterLike } from "@/lib/i18n/formatRelativeTime";

/**
 * Spoken form of a date. A voice needs a month name, not `08/04/2025`.
 *
 * The caller supplies the formatter, so this stays pure and follows the user
 * locale and timezone.
 */
export function dateSpeechText(date: Date, formatter: DateFormatterLike): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatter.dateTime(date, { day: "numeric", month: "long", year: "numeric" });
}
