import type { ImportantDate, ImportantDateType } from "@bondery/schemas";

export interface ImportantDateDraft {
  date: Date | null;
  note: string;
  notifyDaysBefore: number | null;
  type: ImportantDateType | null;
}

export function createDraftDate(): ImportantDateDraft {
  return {
    date: null,
    note: "",
    notifyDaysBefore: null,
    type: null,
  };
}

export function formatDateString(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateString(date: string): Date | null {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function isRecurringDate(date: Date | null): boolean {
  return date?.getFullYear() === 1904;
}

export function getDateFormat(date: Date | null): string {
  return isRecurringDate(date) ? "MMMM D" : "MMMM D, YYYY";
}

export function normalizePickerDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
}

export function parseNotifyValue(value: string | null): 1 | 3 | 7 | null {
  if (value === "1" || value === "3" || value === "7") {
    return Number(value) as 1 | 3 | 7;
  }

  return null;
}

export function areDatesEqual(first: ImportantDate[], second: ImportantDate[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((firstEvent, index) => {
    const secondEvent = second[index];
    if (!secondEvent) {
      return false;
    }

    return (
      firstEvent.id === secondEvent.id &&
      firstEvent.type === secondEvent.type &&
      firstEvent.date === secondEvent.date &&
      (firstEvent.note ?? "") === (secondEvent.note ?? "") &&
      (firstEvent.notifyDaysBefore ?? null) === (secondEvent.notifyDaysBefore ?? null)
    );
  });
}
