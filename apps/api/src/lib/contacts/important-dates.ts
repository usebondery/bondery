import type { ImportantDateType } from "@bondery/schemas";

export const IMPORTANT_DATE_SELECT = `
  id,
  user_id,
  person_id,
  type,
  date,
  note,
  notify_on,
  notify_days_before,
  created_at,
  updated_at
`;

export function toImportantDate(event: {
  id: string;
  user_id: string;
  person_id: string;
  type: string;
  date: string | Date;
  note: string | null;
  notify_on: string | Date | null;
  notify_days_before: number | null;
  created_at: string | Date;
  updated_at: string | Date;
}) {
  const dateValue = event.date instanceof Date ? event.date.toISOString().slice(0, 10) : event.date;
  const notifyOn =
    event.notify_on instanceof Date ? event.notify_on.toISOString().slice(0, 10) : event.notify_on;
  const createdAt =
    event.created_at instanceof Date ? event.created_at.toISOString() : event.created_at;
  const updatedAt =
    event.updated_at instanceof Date ? event.updated_at.toISOString() : event.updated_at;

  return {
    createdAt,
    date: dateValue,
    id: event.id,
    note: event.note,
    notifyDaysBefore: event.notify_days_before,
    notifyOn,
    personId: event.person_id,
    type: event.type as ImportantDateType,
    updatedAt,
    userId: event.user_id,
  };
}

export function toImportantDateFromPrisma(row: {
  id: string;
  userId: string;
  personId: string;
  type: string;
  date: Date;
  note: string | null;
  notifyOn: Date | null;
  notifyDaysBefore: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return toImportantDate({
    created_at: row.createdAt,
    date: row.date,
    id: row.id,
    note: row.note,
    notify_days_before: row.notifyDaysBefore,
    notify_on: row.notifyOn,
    person_id: row.personId,
    type: row.type,
    updated_at: row.updatedAt,
    user_id: row.userId,
  });
}

/** Years are zero-padded to four digits in an ISO calendar date. */
const ISO_YEAR_DIGITS = 4;

export function toIsoDateKey(value: string): string | null {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return `${year.toString().padStart(ISO_YEAR_DIGITS, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function deriveReminderDateKey(entry: {
  date: string | Date;
  notify_on?: string | Date | null;
  notify_days_before?: number | null;
  notifyOn?: string | Date | null;
  notifyDaysBefore?: number | null;
}): string | null {
  const notifyOn = entry.notify_on ?? entry.notifyOn ?? null;
  const notifyDaysBefore = entry.notify_days_before ?? entry.notifyDaysBefore ?? null;
  const dateValue = entry.date instanceof Date ? entry.date.toISOString() : entry.date;

  if (notifyOn) {
    const notifyOnValue = notifyOn instanceof Date ? notifyOn.toISOString() : notifyOn;
    return toIsoDateKey(notifyOnValue);
  }

  if (notifyDaysBefore === null) {
    return null;
  }

  const dateKey = toIsoDateKey(dateValue);
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const notificationDate = new Date(Date.UTC(year, month - 1, day));
  notificationDate.setUTCDate(notificationDate.getUTCDate() - notifyDaysBefore);

  return notificationDate.toISOString().slice(0, 10);
}
