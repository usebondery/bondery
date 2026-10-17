import { firstZodErrorMessage, reminderSendHourSchema } from "@bondery/schemas";

function isValidTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value.trim());
}

function normalizeTimeValue(value: string): string {
  if (!isValidTimeValue(value)) {
    return "08:00";
  }

  const [hourPart, minutePart] = value.trim().split(":");

  return `${hourPart.padStart(2, "0")}:${minutePart.padStart(2, "0")}`;
}

function roundToHourValue(value: string): string {
  if (!isValidTimeValue(value)) {
    return "08:00";
  }

  const [hourPart, minutePart] = value.trim().split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return "08:00";
  }

  const roundedHour = (hour + (minute >= 30 ? 1 : 0)) % 24;
  return `${String(roundedHour).padStart(2, "0")}:00`;
}

function toInputTime(value: string): string {
  const normalized = normalizeTimeValue(value);
  const [hourPart, minutePart] = normalized.split(":");

  if (!hourPart || !minutePart) {
    return "08:00";
  }

  return `${hourPart}:${minutePart}`;
}

/** API `reminderSendHour` → `HH:mm` for the time picker (hour-rounded). */
export function reminderSendHourToPickerValue(apiTime: string): string {
  return roundToHourValue(toInputTime(apiTime));
}

export function parseReminderPickerInput(value: string): string | null {
  const trimmed = value.trim();

  const match24h = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24h) {
    const hour = Number(match24h[1]);
    const minute = Number(match24h[2]);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const match12h = trimmed.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);

  if (!match12h) {
    return null;
  }

  const hourRaw = Number(match12h[1]);
  const minute = Number(match12h[2]);
  const suffix = match12h[3].toUpperCase();

  if (Number.isNaN(hourRaw) || Number.isNaN(minute) || hourRaw < 1 || hourRaw > 12) {
    return null;
  }

  if (minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = suffix === "PM" ? (hourRaw % 12) + 12 : hourRaw % 12;

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toApiTime(value: string): string | null {
  if (!isValidTimeValue(value)) {
    return null;
  }

  const [hourPart, minutePart, secondPart] = value.trim().split(":");
  const normalizedHour = hourPart.padStart(2, "0");
  const normalizedMinute = minutePart.padStart(2, "0");
  const normalizedSecond = (secondPart || "00").padStart(2, "0");

  return `${normalizedHour}:${normalizedMinute}:${normalizedSecond}`;
}

export type ReminderSendHourPayloadResult =
  | { ok: true; apiTime: string; pickerValue: string }
  | { ok: false; kind: "invalid" | "schema"; message: string };

export function buildReminderSendHourPayload(pickerValue: string): ReminderSendHourPayloadResult {
  const normalizedInputTime = roundToHourValue(normalizeTimeValue(pickerValue));
  const apiTime = toApiTime(normalizedInputTime);

  if (!apiTime) {
    return { kind: "invalid", message: "", ok: false };
  }

  const parsedReminderTime = reminderSendHourSchema.safeParse(apiTime);
  if (!parsedReminderTime.success) {
    return {
      kind: "schema",
      message: firstZodErrorMessage(parsedReminderTime.error),
      ok: false,
    };
  }

  return {
    apiTime: parsedReminderTime.data,
    ok: true,
    pickerValue: normalizedInputTime,
  };
}
