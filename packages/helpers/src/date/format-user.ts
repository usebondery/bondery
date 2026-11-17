import type { DateFormatPreference, TimeFormatPreference } from "@bondery/schemas";
import { buildIntlLocaleTag, formatOrderedDate } from "@bondery/schemas/locale";

export type { DateFormatPreference, TimeFormatPreference };
export { formatOrderedDate };

export type DateTimeFormatContext = {
  /** UI locale code (`cs`, `de`). Helpers build the Intl tag internally. */
  locale: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  /** IANA timezone. Omit for the runtime local zone. */
  timeZone?: string;
};

export type UserDateStyle =
  | "numeric"
  | "short"
  | "medium"
  | "long"
  | "monthDay"
  | "monthYear"
  | "monthYearLong";

/** One calendar field, for a split date rail. Use `formatUserDate` for a full date. */
export type UserDateField = "monthShort" | "monthLong" | "yearNumeric" | "dayTwoDigit";

type NumericDateOrder = "mdy" | "dmy" | "ymd";

const CLOCK_PATTERN = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;

function intlTag(ctx: DateTimeFormatContext): string {
  return buildIntlLocaleTag(ctx.locale, ctx.timeFormat);
}

function zoneOptions(ctx: DateTimeFormatContext): Pick<Intl.DateTimeFormatOptions, "timeZone"> {
  return ctx.timeZone ? { timeZone: ctx.timeZone } : {};
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function joinNamedDate(order: NumericDateOrder, month: string, day: string, year?: string): string {
  if (!year) {
    return order === "mdy" ? `${month} ${day}` : `${day} ${month}`;
  }

  if (order === "mdy") {
    return `${month} ${day}, ${year}`;
  }
  if (order === "dmy") {
    return `${day} ${month} ${year}`;
  }
  return `${year} ${month} ${day}`;
}

function joinMonthYear(order: NumericDateOrder, month: string, year: string): string {
  return order === "ymd" ? `${year} ${month}` : `${month} ${year}`;
}

function namedFieldOptions(style: Exclude<UserDateStyle, "numeric">): Intl.DateTimeFormatOptions {
  switch (style) {
    case "short":
      return { day: "numeric", month: "short", year: "numeric" };
    case "medium":
      return { day: "numeric", month: "short", year: "numeric" };
    case "long":
      return { day: "numeric", month: "long", year: "numeric" };
    case "monthDay":
      return { day: "numeric", month: "long" };
    case "monthYear":
      return { month: "short", year: "numeric" };
    case "monthYearLong":
      return { month: "long", year: "numeric" };
  }
}

function formatNamedOverride(
  date: Date,
  ctx: DateTimeFormatContext,
  style: Exclude<UserDateStyle, "numeric">,
  order: NumericDateOrder,
): string {
  const parts = new Intl.DateTimeFormat(intlTag(ctx), {
    ...namedFieldOptions(style),
    ...zoneOptions(ctx),
  }).formatToParts(date);
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");
  const year = partValue(parts, "year");

  if (style === "monthYear" || style === "monthYearLong") {
    return joinMonthYear(order, month, year);
  }
  if (style === "monthDay") {
    return joinNamedDate(order, month, day);
  }
  return joinNamedDate(order, month, day, year);
}

/**
 * Formats a calendar date. `numeric` uses `formatOrderedDate`.
 * Named styles still honor `mdy` / `dmy` / `ymd` via `formatToParts`.
 *
 * `options.timeZone` overrides `ctx.timeZone` for one call. Use it for a
 * calendar date held as UTC midnight, which must not shift to the day before.
 */
export function formatUserDate(
  date: Date,
  ctx: DateTimeFormatContext,
  style: UserDateStyle = "numeric",
  options?: { timeZone?: string },
): string {
  const resolved: DateTimeFormatContext = options?.timeZone
    ? { ...ctx, timeZone: options.timeZone }
    : ctx;

  if (style === "numeric") {
    return formatOrderedDate({
      date,
      dateFormat: resolved.dateFormat,
      intlLocaleTag: intlTag(resolved),
      timeZone: resolved.timeZone,
    });
  }

  if (resolved.dateFormat === "locale") {
    if (style === "short" || style === "medium" || style === "long") {
      return new Intl.DateTimeFormat(intlTag(resolved), {
        dateStyle: style,
        ...zoneOptions(resolved),
      }).format(date);
    }

    return new Intl.DateTimeFormat(intlTag(resolved), {
      ...namedFieldOptions(style),
      ...zoneOptions(resolved),
    }).format(date);
  }

  return formatNamedOverride(date, resolved, style, resolved.dateFormat);
}

const DATE_FIELD_OPTIONS: Record<UserDateField, Intl.DateTimeFormatOptions> = {
  dayTwoDigit: { day: "2-digit" },
  monthLong: { month: "long" },
  monthShort: { month: "short" },
  yearNumeric: { year: "numeric" },
};

/**
 * Formats one calendar field. Use it for a split date rail or a group heading.
 * Use `formatUserDate` when the user needs a full date.
 */
export function formatUserDateField(
  date: Date,
  ctx: DateTimeFormatContext,
  field: UserDateField,
  options?: { timeZone?: string },
): string {
  const resolved: DateTimeFormatContext = options?.timeZone
    ? { ...ctx, timeZone: options.timeZone }
    : ctx;

  return new Intl.DateTimeFormat(intlTag(resolved), {
    ...DATE_FIELD_OPTIONS[field],
    ...zoneOptions(resolved),
  }).format(date);
}

function formatTimeOfDate(
  date: Date,
  ctx: DateTimeFormatContext,
  options?: { withSeconds?: boolean },
): string {
  const timeOptions: Intl.DateTimeFormatOptions = {
    // A 24h clock pads the hour. A 12h clock does not, in most locales.
    hour: ctx.timeFormat === "24h" ? "2-digit" : "numeric",
    minute: "2-digit",
    ...(options?.withSeconds ? { second: "2-digit" } : {}),
    ...zoneOptions(ctx),
  };

  return new Intl.DateTimeFormat(intlTag(ctx), timeOptions).format(date);
}

/**
 * Formats the wall clock of a `Date` instant in `ctx.timeZone`.
 * The shape (12h or 24h, day-period labels and their position) comes from
 * `Intl` in `ctx.locale`, so the label stays correct in every locale.
 */
export function formatUserTime(
  date: Date,
  ctx: DateTimeFormatContext,
  options?: { withSeconds?: boolean },
): string {
  return formatTimeOfDate(date, ctx, options);
}

function parseClockTime(hhmmss: string): { hour: number; minute: number; second: number } | null {
  const match = CLOCK_PATTERN.exec(hhmmss.trim());
  if (!match) {
    return null;
  }

  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  const second = Number.parseInt(match[3] ?? "0", 10);
  if (hour > 23) {
    return null;
  }

  return { hour, minute, second };
}

/**
 * Formats a stored `HH:mm[:ss]` clock that belongs to no date.
 * The value is local wall-clock time, so a fixed UTC date carries the digits.
 * `ctx.timeZone` does not apply. Use `formatUserTime` for a `Date` instant.
 */
export function formatClockTime(
  hhmmss: string,
  ctx: DateTimeFormatContext,
  options?: { withSeconds?: boolean },
): string {
  const parsed = parseClockTime(hhmmss);
  if (!parsed) {
    return hhmmss;
  }

  const date = new Date(Date.UTC(2026, 0, 1, parsed.hour, parsed.minute, parsed.second));
  return formatTimeOfDate(date, { ...ctx, timeZone: "UTC" }, options);
}

/** Date and wall clock in `ctx.timeZone`, for a tooltip or a detail row. */
export function formatUserDateTime(date: Date, ctx: DateTimeFormatContext): string {
  return `${formatUserDate(date, ctx, "medium")} ${formatUserTime(date, ctx)}`;
}

/**
 * Day-period labels from `Intl` in `ctx.locale`.
 * A clock display takes its label from `formatUserTime`. This exists for an
 * input control, such as Mantine `TimePicker`, that renders its own labels.
 */
export function amPmLabelsForLocale(ctx: DateTimeFormatContext): { am: string; pm: string } {
  const tag = buildIntlLocaleTag(ctx.locale, "12h");
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: true,
    timeZone: "UTC",
  };
  const morning = new Date(Date.UTC(2026, 0, 1, 5, 0, 0));
  const afternoon = new Date(Date.UTC(2026, 0, 1, 17, 0, 0));
  const am =
    partValue(new Intl.DateTimeFormat(tag, timeOptions).formatToParts(morning), "dayPeriod") ||
    "AM";
  const pm =
    partValue(new Intl.DateTimeFormat(tag, timeOptions).formatToParts(afternoon), "dayPeriod") ||
    "PM";
  return { am, pm };
}

function localeYearlessDayjsToken(ctx: DateTimeFormatContext): string {
  const sample = new Date(2026, 10, 13);
  const parts = new Intl.DateTimeFormat(intlTag(ctx), {
    day: "numeric",
    month: "long",
  }).formatToParts(sample);
  const monthIndex = parts.findIndex((part) => part.type === "month");
  const dayIndex = parts.findIndex((part) => part.type === "day");
  if (monthIndex >= 0 && dayIndex >= 0 && monthIndex < dayIndex) {
    return "MMMM D";
  }
  return "D MMMM";
}

/**
 * Mantine `DateInput` / `DatePickerInput` `valueFormat` token string.
 */
export function dateInputValueFormat(
  ctx: DateTimeFormatContext,
  options?: { withYear?: boolean },
): string {
  const withYear = options?.withYear ?? true;

  if (ctx.dateFormat === "mdy") {
    return withYear ? "MM/DD/YYYY" : "MM/DD";
  }
  if (ctx.dateFormat === "dmy") {
    return withYear ? "DD/MM/YYYY" : "DD/MM";
  }
  if (ctx.dateFormat === "ymd") {
    return withYear ? "YYYY-MM-DD" : "MM-DD";
  }

  return withYear ? "LL" : localeYearlessDayjsToken(ctx);
}
