import type { Contact, MergeConflictChoice, MergeConflictField } from "@bondery/schemas";

export const MERGE_CONFLICT_FIELDS: MergeConflictField[] = [
  "avatar",
  "firstName",
  "middleName",
  "lastName",
  "headline",
  "location",
  "notes",
  "lastInteraction",
  "phones",
  "emails",
  "importantDates",
  "language",
  "timezone",
  "gisPoint",
  "latitude",
  "longitude",
  "linkedin",
  "instagram",
  "whatsapp",
  "facebook",
  "website",
  "signal",
];

export function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return true;
}

function normalizePhoneSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as {
        prefix?: unknown;
        value?: unknown;
        type?: unknown;
      };
      const prefix = String(row.prefix || "").trim();
      const phone = String(row.value || "").trim();
      const type = String(row.type || "home")
        .trim()
        .toLowerCase();
      if (!phone) {
        return "";
      }

      return `${prefix}|${phone}|${type}`;
    })
    .filter(Boolean)
    .sort();
}

function normalizeEmailSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as { value?: unknown; type?: unknown };
      const email = String(row.value || "")
        .trim()
        .toLowerCase();
      const type = String(row.type || "home")
        .trim()
        .toLowerCase();
      if (!email) {
        return "";
      }

      return `${email}|${type}`;
    })
    .filter(Boolean)
    .sort();
}

function normalizeImportantDatesSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as { type?: unknown; date?: unknown; note?: unknown };
      const dateType = String(row.type || "")
        .trim()
        .toLowerCase();
      const dateValue = String(row.date || "")
        .trim()
        .slice(0, 10);
      const note = String(row.note || "").trim();
      if (!dateType || !dateValue) {
        return "";
      }

      return `${dateType}|${dateValue}|${note}`;
    })
    .filter(Boolean)
    .sort();
}

export function areValuesEquivalent(
  field: MergeConflictField,
  left: unknown,
  right: unknown,
): boolean {
  if (field === "phones") {
    return JSON.stringify(normalizePhoneSet(left)) === JSON.stringify(normalizePhoneSet(right));
  }

  if (field === "emails") {
    return JSON.stringify(normalizeEmailSet(left)) === JSON.stringify(normalizeEmailSet(right));
  }

  if (field === "importantDates") {
    return (
      JSON.stringify(normalizeImportantDatesSet(left)) ===
      JSON.stringify(normalizeImportantDatesSet(right))
    );
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

export function normalizeDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return "";
}

function parseTimestampValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = typeof value === "string" ? value.trim() : String(value);
  if (!raw) {
    return null;
  }

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

export function getAutoLastInteractionChoice(
  leftValue: unknown,
  rightValue: unknown,
): MergeConflictChoice | null {
  const leftTimestamp = parseTimestampValue(leftValue);
  const rightTimestamp = parseTimestampValue(rightValue);

  if (leftTimestamp === null && rightTimestamp === null) {
    return null;
  }

  if (leftTimestamp === null) {
    return "right";
  }

  if (rightTimestamp === null) {
    return "left";
  }

  if (leftTimestamp === rightTimestamp) {
    return null;
  }

  return leftTimestamp > rightTimestamp ? "left" : "right";
}

export function toPersonPreview(contact: Contact | null) {
  if (!contact) {
    return null;
  }

  return {
    avatar: contact.avatar,
    firstName: contact.firstName,
    id: contact.id,
    lastName: contact.lastName,
    middleName: contact.middleName,
  };
}

export function formatConflictDisplayValue(field: MergeConflictField, value: unknown): string {
  if (field === "importantDates") {
    const count = normalizeImportantDatesSet(value).length;
    return count > 0 ? `${count}` : "";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length}` : "";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return normalizeDisplayText(value);
}
