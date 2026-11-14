"use client";

import {
  amPmLabelsForLocale,
  type DateTimeFormatContext,
  dateInputValueFormat,
  formatClockTime,
  formatUserDate,
  formatUserDateField,
  formatUserDateTime,
  formatUserTime,
  type UserDateField,
  type UserDateStyle,
} from "@bondery/helpers/date";
import { buildIntlLocaleTag } from "@bondery/schemas/locale";
import { useUserLocale } from "@/components/shell/UserLocaleProvider";
import {
  type DateFormatterLike,
  formatLastUsedAt,
  formatRelativeTime,
} from "@/lib/i18n/formatRelativeTime";

/**
 * Thin hook over `@bondery/helpers/date`. Every user-visible date and clock on
 * web comes from here, so the string honors the user's date order, clock
 * preference, and timezone.
 *
 * `number` and `relativeTime` stay here. They are not dates on a calendar.
 */
export function useDateFormatter() {
  const { locale, timezone, timeFormat, dateFormat } = useUserLocale();
  const ctx: DateTimeFormatContext = { dateFormat, locale, timeFormat, timeZone: timezone };
  const intlLocale = buildIntlLocaleTag(locale, timeFormat);

  return {
    /** Day-period labels for an input control that renders its own. */
    amPmLabels: () => amPmLabelsForLocale(ctx),
    ctx,
    dateInputValueFormat: (options?: { withYear?: boolean }) => dateInputValueFormat(ctx, options),
    /** Stored `HH:mm[:ss]` with no date. */
    formatClockTime: (hhmmss: string, options?: { withSeconds?: boolean }) =>
      formatClockTime(hhmmss, ctx, options),
    /** A `Date` instant as a calendar date. */
    formatDate: (date: Date, style: UserDateStyle = "numeric", options?: { timeZone?: string }) =>
      formatUserDate(date, ctx, style, options),
    /** One calendar field, for a split date rail or a heading. */
    formatDateField: (date: Date, field: UserDateField, options?: { timeZone?: string }) =>
      formatUserDateField(date, ctx, field, options),
    /** A `Date` instant as a date and a wall clock in the user timezone. */
    formatDateTime: (date: Date) => formatUserDateTime(date, ctx),
    /** A `Date` instant as a wall clock in the user timezone. */
    formatTime: (date: Date, options?: { withSeconds?: boolean }) =>
      formatUserTime(date, ctx, options),
    number: (value: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, opts).format(value),
    relativeTime: (date: Date, base: Date) => {
      const diffMs = date.getTime() - base.getTime();
      const diffSeconds = Math.round(diffMs / 1000);
      const absSeconds = Math.abs(diffSeconds);

      const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });

      if (absSeconds < 60) {
        return rtf.format(diffSeconds, "second");
      }
      const diffMinutes = Math.round(diffSeconds / 60);
      if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, "minute");
      }
      const diffHours = Math.round(diffMinutes / 60);
      if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, "hour");
      }
      const diffDays = Math.round(diffHours / 24);
      if (Math.abs(diffDays) < 30) {
        return rtf.format(diffDays, "day");
      }
      const diffMonths = Math.round(diffDays / 30);
      if (Math.abs(diffMonths) < 12) {
        return rtf.format(diffMonths, "month");
      }
      const diffYears = Math.round(diffMonths / 12);
      return rtf.format(diffYears, "year");
    },
  };
}

export function formatRelativeTimeWithFormatter(
  date: Date,
  formatter: DateFormatterLike,
  lessThanMinuteLabel: string,
): string {
  return formatRelativeTime(date, formatter, lessThanMinuteLabel);
}

export function formatLastUsedAtWithFormatter(
  lastUsedAt: string | null,
  formatter: DateFormatterLike,
  labels: {
    neverUsed: string;
    lessThanMinuteAgo: string;
    lastUsed: (time: string) => string;
  },
): string {
  return formatLastUsedAt(lastUsedAt, formatter, labels);
}
