const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * True when `value` is a real calendar day in `YYYY-MM-DD`.
 * Overflow dates such as `2026-02-31` are false.
 */
export function isCalendarDate(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  const match = CALENDAR_DATE.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Local midnight for a `YYYY-MM-DD` day.
 * Same construction as `parseLocalDateInputValue` in `NewActivityModal`.
 */
export function localCalendarDayStart(value: string): Date {
  const match = CALENDAR_DATE.exec(value);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, received ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Local 23:59:59.999 for a `YYYY-MM-DD` day. Inclusive end of that calendar day. */
export function localCalendarDayEnd(value: string): Date {
  const match = CALENDAR_DATE.exec(value);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, received ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export function formatLocalCalendarDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Map a date-picker value to a URL calendar day. Empty clears the param. */
export function calendarParamFromPicker(value: Date | string | null): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }
    return formatLocalCalendarDate(value);
  }
  const date = value.split("T")[0] ?? "";
  return isCalendarDate(date) ? date : undefined;
}
