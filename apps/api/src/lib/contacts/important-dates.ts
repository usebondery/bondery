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
  date: string;
  note: string | null;
  notify_on: string | null;
  notify_days_before: number | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    createdAt: event.created_at,
    date: event.date,
    id: event.id,
    note: event.note,
    notifyDaysBefore: event.notify_days_before,
    notifyOn: event.notify_on,
    personId: event.person_id,
    type: event.type as ImportantDateType,
    updatedAt: event.updated_at,
    userId: event.user_id,
  };
}

export function toIsoDateKey(value: string): string | null {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function deriveReminderDateKey(entry: {
  date: string;
  notify_on: string | null;
  notify_days_before: number | null;
}): string | null {
  if (entry.notify_on) {
    return toIsoDateKey(entry.notify_on);
  }

  if (entry.notify_days_before === null) {
    return null;
  }

  const dateKey = toIsoDateKey(entry.date);
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const notificationDate = new Date(Date.UTC(year, month - 1, day));
  notificationDate.setUTCDate(notificationDate.getUTCDate() - entry.notify_days_before);

  return notificationDate.toISOString().slice(0, 10);
}
