"use client";

import { type DateTimeFormatContext, formatClockTime, formatUserTime } from "@bondery/helpers/date";

export interface ClockTimeProps {
  /** User locale, clock preference, and display timezone. */
  ctx: DateTimeFormatContext;
  /**
   * A `Date` instant, for an instant such as "now in this timezone".
   * A string is a stored `HH:mm[:ss]`.
   */
  value: Date | string;
  /** Show seconds. */
  withSeconds?: boolean;
}

/**
 * Displays a clock-of-day as a string from `@bondery/helpers/date`.
 * `ClockTime` holds no time-of-day rule. 12h or 24h shape, AM/PM labels, and
 * label position all come from the helper.
 */
export function ClockTime({ ctx, value, withSeconds }: ClockTimeProps) {
  const text =
    value instanceof Date
      ? formatUserTime(value, ctx, { withSeconds })
      : formatClockTime(value, ctx, { withSeconds });

  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{text}</span>;
}
