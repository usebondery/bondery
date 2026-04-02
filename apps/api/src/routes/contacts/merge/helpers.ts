/**
 * Contacts — Merge Helpers
 * Pure constants, normalisation functions, and TypeBox schemas for the merge routes.
 */

import { Type } from "@sinclair/typebox";
import type {
  SocialPlatform,
  MergeConflictField,
  MergeConflictChoice,
  MergeRecommendationReason,
} from "@bondery/types";
import { AvatarQualityEnum, AvatarSizeEnum } from "../../../lib/schemas.js";

// ── Constants ────────────────────────────────────────────────────

export const MERGEABLE_SCALAR_FIELDS = {
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  headline: "headline",
  location: "location",
  notes: "notes",
  lastInteraction: "last_interaction",
  language: "language",
  timezone: "timezone",
  gisPoint: "gis_point",
  latitude: "latitude",
  longitude: "longitude",
} as const;

export const MERGEABLE_SET_FIELDS: Array<
  Extract<MergeConflictField, "phones" | "emails" | "importantDates">
> = ["phones", "emails", "importantDates"];

export const MERGEABLE_SOCIAL_FIELDS: Record<
  Extract<
    MergeConflictField,
    "linkedin" | "instagram" | "whatsapp" | "facebook" | "website" | "signal"
  >,
  SocialPlatform
> = {
  linkedin: "linkedin",
  instagram: "instagram",
  whatsapp: "whatsapp",
  facebook: "facebook",
  website: "website",
  signal: "signal",
};

export const MERGEABLE_FIELDS = new Set<MergeConflictField>([
  ...Object.keys(MERGEABLE_SCALAR_FIELDS),
  ...Object.keys(MERGEABLE_SOCIAL_FIELDS),
  ...MERGEABLE_SET_FIELDS,
  "avatar",
] as MergeConflictField[]);

export const MERGE_RECOMMENDATION_ALGORITHM_VERSION = "v1";

// ── TypeBox Schemas ──────────────────────────────────────────────

export const MergeContactsBody = Type.Object({
  leftPersonId: Type.String({ minLength: 1 }),
  rightPersonId: Type.String({ minLength: 1 }),
  conflictResolutions: Type.Optional(
    Type.Record(Type.String(), Type.Union([Type.Literal("left"), Type.Literal("right")])),
  ),
});

export const MergeRecommendationsQuery = Type.Object({
  declined: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

// ── Helper Types ─────────────────────────────────────────────────

export type MergeRecommendationCandidate = {
  leftPersonId: string;
  rightPersonId: string;
  score: number;
  reasons: MergeRecommendationReason[];
};

// ── Normalisation Helpers ────────────────────────────────────────

export function normalizeDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeNamePart(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return normalizeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function normalizeEmailValue(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhoneValue(prefix: string | null | undefined, value: string): string {
  const normalized = `${prefix || ""}${value}`.replace(/\D+/g, "");
  return normalized.replace(/^00/, "");
}

export function normalizeSocialHandle(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return normalizeDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

export function toFullNameKey(person: { first_name: string; last_name: string | null }): string {
  return `${normalizeNamePart(person.first_name)} ${normalizeNamePart(person.last_name)}`.trim();
}

export function toBigrams(value: string): string[] {
  if (value.length < 2) {
    return value.length === 1 ? [value] : [];
  }

  const result: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    result.push(value.slice(index, index + 2));
  }

  return result;
}

export function diceCoefficient(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = toBigrams(left);
  const rightBigrams = toBigrams(right);

  if (!leftBigrams.length || !rightBigrams.length) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const bigram of leftBigrams) {
    counts.set(bigram, (counts.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (const bigram of rightBigrams) {
    const count = counts.get(bigram) || 0;
    if (count > 0) {
      intersection += 1;
      counts.set(bigram, count - 1);
    }
  }

  return (2 * intersection) / (leftBigrams.length + rightBigrams.length);
}

export function countSetOverlap(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) {
    return 0;
  }

  let overlap = 0;
  const [smallSet, largeSet] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of smallSet) {
    if (largeSet.has(value)) {
      overlap += 1;
    }
  }

  return overlap;
}

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

export function areValuesEquivalent(left: unknown, right: unknown): boolean {
  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

export function normalizePhoneSet(
  rows:
    | Array<{ prefix: string; value: string; type: string; preferred: boolean }>
    | null
    | undefined,
): string[] {
  return (rows || [])
    .map((phone) => {
      const prefix = String(phone.prefix || "").trim();
      const value = String(phone.value || "").trim();
      const type = String(phone.type || "home")
        .trim()
        .toLowerCase();
      if (!value) {
        return "";
      }

      return `${prefix}|${value}|${type}|${phone.preferred ? "1" : "0"}`;
    })
    .filter(Boolean)
    .sort();
}

export function normalizeEmailSet(
  rows: Array<{ value: string; type: string; preferred: boolean }> | null | undefined,
): string[] {
  return (rows || [])
    .map((email) => {
      const value = String(email.value || "")
        .trim()
        .toLowerCase();
      const type = String(email.type || "home")
        .trim()
        .toLowerCase();
      if (!value) {
        return "";
      }

      return `${value}|${type}|${email.preferred ? "1" : "0"}`;
    })
    .filter(Boolean)
    .sort();
}

export function normalizeImportantDateSet(
  rows:
    | Array<{
        type: string;
        date: string;
        note: string | null;
        notify_days_before: number | null;
      }>
    | null
    | undefined,
): string[] {
  return (rows || [])
    .map((entry) => {
      const dateType = String(entry.type || "")
        .trim()
        .toLowerCase();
      const dateValue = String(entry.date || "")
        .trim()
        .slice(0, 10);
      const note = String(entry.note || "").trim();
      const notifyDaysBefore =
        typeof entry.notify_days_before === "number" ? String(entry.notify_days_before) : "";
      if (!dateType || !dateValue) {
        return "";
      }

      return `${dateType}|${dateValue}|${note}|${notifyDaysBefore}`;
    })
    .filter(Boolean)
    .sort();
}

export function resolveConflictChoice(
  conflictResolutions: Partial<Record<MergeConflictField, MergeConflictChoice>>,
  field: MergeConflictField,
): MergeConflictChoice {
  const candidate = conflictResolutions[field];
  return candidate === "right" ? "right" : "left";
}

/** Used only in the merge recommendations list error-fallback path. */
export function withEmptyChannels<T extends { id: string }>(
  rows: T[],
): Array<T & { phones: []; emails: []; addresses: [] }> {
  return rows.map((row) => ({
    ...row,
    phones: [],
    emails: [],
    addresses: [],
  }));
}

export function withEmptySocials<T extends { id: string }>(
  rows: T[],
): Array<
  T & {
    avatar: null;
    linkedin: null;
    instagram: null;
    whatsapp: null;
    facebook: null;
    website: null;
    signal: null;
  }
> {
  return rows.map((row) => ({
    ...row,
    avatar: null,
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
  }));
}
