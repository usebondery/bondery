"use client";

import { useMemo } from "react";
import { useUserLocale } from "@/components/shell/UserLocaleProvider";
import {
  type DateFormatterLike,
  formatLastUsedAt,
  formatRelativeTime,
} from "@/lib/i18n/formatRelativeTime";

function getIntlLocale(locale: string, timeFormat: "12h" | "24h"): string {
  return timeFormat === "12h" ? `${locale}-u-hc-h12` : `${locale}-u-hc-h23`;
}

/**
 * Replaces next-intl useFormatter with Intl APIs driven by user locale preferences.
 */
export function useDateFormatter() {
  const { locale, timezone, timeFormat } = useUserLocale();
  const intlLocale = getIntlLocale(locale, timeFormat);

  return useMemo((): DateFormatterLike => {
    return {
      dateTime: (date: Date, opts?: Intl.DateTimeFormatOptions & { timeZone?: string }) => {
        const { timeZone, ...rest } = opts ?? {};
        return new Intl.DateTimeFormat(intlLocale, {
          timeZone: timeZone ?? timezone,
          ...rest,
        }).format(date);
      },
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
  }, [intlLocale, timezone]);
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
