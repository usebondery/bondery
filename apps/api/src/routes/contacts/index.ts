/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { buildContactAvatarUrl } from "../../lib/supabase.js";
import { generateVCard } from "./vcard.js";
import {
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "./channels.js";
import { parseAddressEntries, replaceContactAddresses } from "./addresses.js";
import { findPersonIdBySocialMedia, upsertContactSocialMedia } from "../../lib/social-media.js";
import { attachContactExtras, type FullContactExtras } from "../../lib/contact-enrichment.js";
import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  PhoneEntry,
  RelationshipType,
  ImportantDateType,
  UpcomingReminder,
  Database,
  SocialMediaPlatform,
  MergeContactsResponse,
  MergeConflictField,
  MergeConflictChoice,
  MergeRecommendationReason,
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
  ScrapedWorkHistoryEntry,
  ScrapedEducationEntry,
} from "@bondery/types";
import { cleanPersonName } from "@bondery/helpers/name-utils";
import { cachedGeocodeLinkedInPlace } from "../../lib/mapy.js";
import {
  toPostgresDate,
  updateContactPhoto,
  uploadAllLinkedInLogos,
} from "../../lib/linkedin-helpers.js";
import {
  UuidParam,
  ContactsFilterSchema,
  ContactSortEnum,
  NullableString,
  NullableNumber,
  PhoneEntrySchema,
  EmailEntrySchema,
  ContactAddressEntrySchema,
  ScrapedWorkHistoryEntrySchema,
  ScrapedEducationEntrySchema,
  ImportantDateInputSchema,
  CONTACT_SELECT,
  GROUP_SELECT,
  TAG_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";

const RELATIONSHIP_SELECT = `
  id,
  user_id,
  source_person_id,
  target_person_id,
  relationship_type,
  created_at,
  updated_at
`;

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "parent",
  "child",
  "spouse",
  "partner",
  "sibling",
  "friend",
  "colleague",
  "neighbor",
  "guardian",
  "dependent",
  "other",
] satisfies RelationshipType[];

const IMPORTANT_DATE_SELECT = `
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

const IMPORTANT_DATE_TYPES = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] satisfies ImportantDateType[];

const IMPORTANT_DATE_NOTIFY_VALUES = [1, 3, 7] as const;

const LOOKUP_SOCIAL_PLATFORMS: SocialMediaPlatform[] = ["instagram", "linkedin", "facebook"];

// ── TypeBox Schemas ──────────────────────────────────────────────

const RelationshipTypeEnum = Type.Union([
  Type.Literal("parent"),
  Type.Literal("child"),
  Type.Literal("spouse"),
  Type.Literal("partner"),
  Type.Literal("sibling"),
  Type.Literal("friend"),
  Type.Literal("colleague"),
  Type.Literal("neighbor"),
  Type.Literal("guardian"),
  Type.Literal("dependent"),
  Type.Literal("other"),
]);

const ImportantDateTypeEnum = Type.Union([
  Type.Literal("birthday"),
  Type.Literal("anniversary"),
  Type.Literal("nameday"),
  Type.Literal("graduation"),
  Type.Literal("other"),
]);

const LookupPlatformEnum = Type.Union([
  Type.Literal("instagram"),
  Type.Literal("linkedin"),
  Type.Literal("facebook"),
]);

const ContactListQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  q: Type.Optional(Type.String()),
  sort: Type.Optional(ContactSortEnum),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const CreateContactBody = Type.Object({
  firstName: Type.String({ minLength: 1 }),
  lastName: Type.String({ minLength: 1 }),
  middleName: Type.Optional(Type.String()),
  linkedin: Type.Optional(Type.String()),
});

const UpdateContactBody = Type.Object({
  firstName: Type.Optional(Type.String({ minLength: 1 })),
  middleName: Type.Optional(NullableString),
  lastName: Type.Optional(NullableString),
  headline: Type.Optional(NullableString),
  place: Type.Optional(NullableString),
  notes: Type.Optional(NullableString),
  language: Type.Optional(NullableString),
  timezone: Type.Optional(NullableString),
  location: Type.Optional(NullableString),
  latitude: Type.Optional(NullableNumber),
  longitude: Type.Optional(NullableNumber),
  addressLine1: Type.Optional(NullableString),
  addressLine2: Type.Optional(NullableString),
  addressCity: Type.Optional(NullableString),
  addressPostalCode: Type.Optional(NullableString),
  addressState: Type.Optional(NullableString),
  addressStateCode: Type.Optional(NullableString),
  addressCountry: Type.Optional(NullableString),
  addressCountryCode: Type.Optional(NullableString),
  addressGranularity: Type.Optional(NullableString),
  addressFormatted: Type.Optional(NullableString),
  addressGeocodeSource: Type.Optional(NullableString),
  lastInteraction: Type.Optional(NullableString),
  phones: Type.Optional(Type.Array(PhoneEntrySchema)),
  emails: Type.Optional(Type.Array(EmailEntrySchema)),
  addresses: Type.Optional(Type.Array(ContactAddressEntrySchema)),
  linkedin: Type.Optional(NullableString),
  instagram: Type.Optional(NullableString),
  whatsapp: Type.Optional(NullableString),
  facebook: Type.Optional(NullableString),
  website: Type.Optional(NullableString),
  signal: Type.Optional(NullableString),
});

const DeleteContactsBody = Type.Union([
  Type.Object({
    ids: Type.Array(Type.String(), { minItems: 1 }),
  }),
  Type.Object({
    filter: ContactsFilterSchema,
    excludeIds: Type.Optional(Type.Array(Type.String())),
  }),
]);

const MergeContactsBody = Type.Object({
  leftPersonId: Type.String({ minLength: 1 }),
  rightPersonId: Type.String({ minLength: 1 }),
  conflictResolutions: Type.Optional(
    Type.Record(Type.String(), Type.Union([Type.Literal("left"), Type.Literal("right")])),
  ),
});

const BySocialQuery = Type.Object({
  platform: Type.Optional(Type.String()),
  handle: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const MergeRecommendationsQuery = Type.Object({
  declined: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const ContactTagBody = Type.Object({
  tagId: Type.String({ minLength: 1 }),
});

const ContactTagIdParams = Type.Object({
  id: Type.String(),
  tagId: Type.String(),
});

const RelationshipIdParams = Type.Object({
  id: Type.String(),
  relationshipId: Type.String(),
});

const CreateRelationshipBody = Type.Object({
  relatedPersonId: Type.String({ minLength: 1 }),
  relationshipType: RelationshipTypeEnum,
});

const UpdateRelationshipBody = Type.Object({
  relatedPersonId: Type.String({ minLength: 1 }),
  relationshipType: RelationshipTypeEnum,
});

const ImportantDatesBody = Type.Object({
  dates: Type.Array(ImportantDateInputSchema),
});

const LinkedInDataBody = Type.Object({
  workHistory: Type.Optional(
    Type.Array(
      Type.Object({
        title: Type.Optional(Type.String()),
        companyName: Type.String(),
        companyLinkedinId: Type.Optional(Type.String()),
        startDate: Type.Optional(Type.String()),
        endDate: Type.Optional(Type.String()),
        employmentType: Type.Optional(Type.String()),
        location: Type.Optional(Type.String()),
      }),
    ),
  ),
});

const EnrichContactBody = Type.Object({
  firstName: Type.Optional(Type.String()),
  middleName: Type.Optional(NullableString),
  lastName: Type.Optional(NullableString),
  profileImageUrl: Type.Optional(NullableString),
  headline: Type.Optional(NullableString),
  place: Type.Optional(NullableString),
  linkedinBio: Type.Optional(NullableString),
  workHistory: Type.Optional(Type.Array(ScrapedWorkHistoryEntrySchema)),
  educationHistory: Type.Optional(Type.Array(ScrapedEducationEntrySchema)),
});

const MERGEABLE_SCALAR_FIELDS = {
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  headline: "headline",
  place: "place",
  notes: "notes",
  lastInteraction: "last_interaction",
  language: "language",
  timezone: "timezone",
  location: "location",
  latitude: "latitude",
  longitude: "longitude",
} as const;

const MERGEABLE_SET_FIELDS: Array<
  Extract<MergeConflictField, "phones" | "emails" | "importantDates">
> = ["phones", "emails", "importantDates"];

const MERGEABLE_SOCIAL_FIELDS: Record<
  Extract<
    MergeConflictField,
    "linkedin" | "instagram" | "whatsapp" | "facebook" | "website" | "signal"
  >,
  SocialMediaPlatform
> = {
  linkedin: "linkedin",
  instagram: "instagram",
  whatsapp: "whatsapp",
  facebook: "facebook",
  website: "website",
  signal: "signal",
};

const MERGEABLE_FIELDS = new Set<MergeConflictField>([
  ...Object.keys(MERGEABLE_SCALAR_FIELDS),
  ...Object.keys(MERGEABLE_SOCIAL_FIELDS),
  ...MERGEABLE_SET_FIELDS,
] as MergeConflictField[]);

const MERGE_RECOMMENDATION_ALGORITHM_VERSION = "v1";

function normalizeDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeNamePart(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return normalizeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeEmailValue(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhoneValue(prefix: string | null | undefined, value: string): string {
  const normalized = `${prefix || ""}${value}`.replace(/\D+/g, "");
  return normalized.replace(/^00/, "");
}

function normalizeSocialHandle(value: string | null | undefined): string {
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

function toFullNameKey(person: { first_name: string; last_name: string | null }): string {
  return `${normalizeNamePart(person.first_name)} ${normalizeNamePart(person.last_name)}`.trim();
}

function toBigrams(value: string): string[] {
  if (value.length < 2) {
    return value.length === 1 ? [value] : [];
  }

  const result: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    result.push(value.slice(index, index + 2));
  }

  return result;
}

function diceCoefficient(left: string, right: string): number {
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

function countSetOverlap(left: Set<string>, right: Set<string>): number {
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

type MergeRecommendationCandidate = {
  leftPersonId: string;
  rightPersonId: string;
  score: number;
  reasons: MergeRecommendationReason[];
};

async function recomputeMergeRecommendations(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const [
    { data: peopleRows, error: peopleError },
    { data: emailRows, error: emailError },
    { data: phoneRows, error: phoneError },
    { data: socialRows, error: socialError },
    { data: existingRows, error: existingError },
  ] = await Promise.all([
    client.from("people").select("id, first_name, last_name").eq("user_id", userId),
    client.from("people_emails").select("person_id, value").eq("user_id", userId),
    client.from("people_phones").select("person_id, prefix, value").eq("user_id", userId),
    client
      .from("people_social_media")
      .select("person_id, platform, handle")
      .eq("user_id", userId)
      .in("platform", ["linkedin", "facebook"]),
    client
      .from("people_merge_recommendations")
      .select("id, left_person_id, right_person_id, is_declined")
      .eq("user_id", userId),
  ]);

  if (peopleError || emailError || phoneError || socialError || existingError) {
    throw new Error(
      peopleError?.message ||
        emailError?.message ||
        phoneError?.message ||
        socialError?.message ||
        existingError?.message ||
        "Failed to recompute merge recommendations",
    );
  }

  const people = peopleRows || [];
  if (people.length < 2) {
    if ((existingRows || []).length > 0) {
      const { error: clearError } = await client
        .from("people_merge_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("is_declined", false);

      if (clearError) {
        throw new Error(clearError.message);
      }
    }

    return 0;
  }

  const emailsByPerson = new Map<string, Set<string>>();
  for (const row of emailRows || []) {
    const normalized = normalizeEmailValue(row.value || "");
    if (!normalized) {
      continue;
    }

    const bucket = emailsByPerson.get(row.person_id) || new Set<string>();
    bucket.add(normalized);
    emailsByPerson.set(row.person_id, bucket);
  }

  const phonesByPerson = new Map<string, Set<string>>();
  for (const row of phoneRows || []) {
    const normalized = normalizePhoneValue(row.prefix, row.value || "");
    if (!normalized) {
      continue;
    }

    const bucket = phonesByPerson.get(row.person_id) || new Set<string>();
    bucket.add(normalized);
    phonesByPerson.set(row.person_id, bucket);
  }

  const socialByPerson = new Map<string, { linkedin: string; facebook: string }>();
  for (const row of socialRows || []) {
    const normalized = normalizeSocialHandle(row.handle || "");
    if (!normalized) {
      continue;
    }

    const existing = socialByPerson.get(row.person_id) || { linkedin: "", facebook: "" };
    if (row.platform === "linkedin") {
      existing.linkedin = normalized;
    }

    if (row.platform === "facebook") {
      existing.facebook = normalized;
    }

    socialByPerson.set(row.person_id, existing);
  }

  const candidates: MergeRecommendationCandidate[] = [];
  for (let leftIndex = 0; leftIndex < people.length; leftIndex += 1) {
    const leftPerson = people[leftIndex];
    const leftName = toFullNameKey(leftPerson);
    const leftEmails = emailsByPerson.get(leftPerson.id) || new Set<string>();
    const leftPhones = phonesByPerson.get(leftPerson.id) || new Set<string>();
    const leftSocial = socialByPerson.get(leftPerson.id) || { linkedin: "", facebook: "" };

    for (let rightIndex = leftIndex + 1; rightIndex < people.length; rightIndex += 1) {
      const rightPerson = people[rightIndex];
      const rightName = toFullNameKey(rightPerson);
      const rightEmails = emailsByPerson.get(rightPerson.id) || new Set<string>();
      const rightPhones = phonesByPerson.get(rightPerson.id) || new Set<string>();
      const rightSocial = socialByPerson.get(rightPerson.id) || { linkedin: "", facebook: "" };

      const hasLinkedinConflict =
        Boolean(leftSocial.linkedin) &&
        Boolean(rightSocial.linkedin) &&
        leftSocial.linkedin !== rightSocial.linkedin;
      const hasFacebookConflict =
        Boolean(leftSocial.facebook) &&
        Boolean(rightSocial.facebook) &&
        leftSocial.facebook !== rightSocial.facebook;

      if (hasLinkedinConflict || hasFacebookConflict) {
        continue;
      }

      const fullNameScore = diceCoefficient(leftName, rightName);
      const emailOverlapCount = countSetOverlap(leftEmails, rightEmails);
      const phoneOverlapCount = countSetOverlap(leftPhones, rightPhones);

      const reasons: MergeRecommendationReason[] = [];
      const hasFullNameMatch = fullNameScore >= 0.84;

      if (hasFullNameMatch) {
        reasons.push("fullName");
      }

      if (emailOverlapCount > 0) {
        reasons.push("email");
      }

      if (phoneOverlapCount > 0) {
        reasons.push("phone");
      }

      if (reasons.length === 0) {
        continue;
      }

      const leftPersonId = leftPerson.id < rightPerson.id ? leftPerson.id : rightPerson.id;
      const rightPersonId = leftPerson.id < rightPerson.id ? rightPerson.id : leftPerson.id;

      const score = Math.min(
        1,
        fullNameScore * 0.6 +
          Math.min(emailOverlapCount, 1) * 0.25 +
          Math.min(phoneOverlapCount, 1) * 0.2,
      );

      candidates.push({
        leftPersonId,
        rightPersonId,
        score,
        reasons,
      });
    }
  }

  const existingByPair = new Map(
    (existingRows || []).map((row) => [`${row.left_person_id}|${row.right_person_id}`, row]),
  );
  const nextPairKeys = new Set(
    candidates.map((candidate) => `${candidate.leftPersonId}|${candidate.rightPersonId}`),
  );
  const newCandidatesCount = candidates.filter(
    (candidate) => !existingByPair.has(`${candidate.leftPersonId}|${candidate.rightPersonId}`),
  ).length;

  if (candidates.length > 0) {
    const rowsToUpsert = candidates.map((candidate) => {
      const key = `${candidate.leftPersonId}|${candidate.rightPersonId}`;
      const existing = existingByPair.get(key);

      return {
        user_id: userId,
        left_person_id: candidate.leftPersonId,
        right_person_id: candidate.rightPersonId,
        score: candidate.score,
        reasons: candidate.reasons,
        algorithm_version: MERGE_RECOMMENDATION_ALGORITHM_VERSION,
        is_declined: existing?.is_declined || false,
      };
    });

    const { error: upsertError } = await client
      .from("people_merge_recommendations")
      .upsert(rowsToUpsert, {
        onConflict: "user_id,left_person_id,right_person_id",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  const staleActiveIds = (existingRows || [])
    .filter((row) => !row.is_declined)
    .filter((row) => !nextPairKeys.has(`${row.left_person_id}|${row.right_person_id}`))
    .map((row) => row.id);

  if (staleActiveIds.length > 0) {
    const { error: deleteStaleError } = await client
      .from("people_merge_recommendations")
      .delete()
      .eq("user_id", userId)
      .in("id", staleActiveIds);

    if (deleteStaleError) {
      throw new Error(deleteStaleError.message);
    }
  }

  return newCandidatesCount;
}

function hasMeaningfulValue(value: unknown): boolean {
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

function areValuesEquivalent(left: unknown, right: unknown): boolean {
  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizePhoneSet(
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

function normalizeEmailSet(
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

function normalizeImportantDateSet(
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

function resolveConflictChoice(
  conflictResolutions: Partial<Record<MergeConflictField, MergeConflictChoice>>,
  field: MergeConflictField,
): MergeConflictChoice {
  const candidate = conflictResolutions[field];
  return candidate === "right" ? "right" : "left";
}

function isLookupPlatform(value: string): value is (typeof LOOKUP_SOCIAL_PLATFORMS)[number] {
  return LOOKUP_SOCIAL_PLATFORMS.includes(value as (typeof LOOKUP_SOCIAL_PLATFORMS)[number]);
}

function isRelationshipType(value: string): value is RelationshipType {
  return RELATIONSHIP_TYPES.includes(value as RelationshipType);
}

function isImportantDateType(value: string): value is ImportantDateType {
  return IMPORTANT_DATE_TYPES.includes(value as ImportantDateType);
}

function isValidImportantDateNotifyDaysBefore(value: unknown): value is 1 | 3 | 7 | null {
  return value === null || IMPORTANT_DATE_NOTIFY_VALUES.includes(value as 1 | 3 | 7);
}

function toContactPreview(
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
  },
  avatarUrl: string | null,
) {
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: avatarUrl,
  };
}

function toImportantDate(event: {
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
    id: event.id,
    userId: event.user_id,
    personId: event.person_id,
    type: event.type,
    date: event.date,
    note: event.note,
    notifyOn: event.notify_on,
    notifyDaysBefore: event.notify_days_before,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function toIsoDateKey(value: string): string | null {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function deriveReminderDateKey(entry: {
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

function withEmptyChannels<T extends { id: string }>(
  rows: T[],
): Array<T & { phones: []; emails: []; addresses: [] }> {
  return rows.map((row) => ({
    ...row,
    phones: [],
    emails: [],
    addresses: [],
  }));
}

function withEmptySocialMedia<
  T extends {
    id: string;
  },
>(
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

/**
 * Deletes interactions that would be left without participants after removing the given contacts.
 *
 * It only affects interactions owned by the current user and only interactions that currently include
 * at least one of the contacts being deleted.
 */
async function deleteOrphanedInteractionsForDeletedContacts(
  client: any,
  userId: string,
  contactIds: string[],
) {
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return;
  }

  const uniqueContactIds = Array.from(new Set(contactIds.filter(Boolean)));
  if (uniqueContactIds.length === 0) {
    return;
  }

  const { data: impactedMemberships, error: impactedMembershipsError } = await client
    .from("interaction_participants")
    .select("interaction_id, person_id")
    .in("person_id", uniqueContactIds);

  if (impactedMembershipsError) {
    throw new Error(impactedMembershipsError.message);
  }

  const impactedInteractionIds = Array.from(
    new Set(
      (impactedMemberships || []).map(
        (membership: { interaction_id: string }) => membership.interaction_id,
      ),
    ),
  );

  if (impactedInteractionIds.length === 0) {
    return;
  }

  const { data: ownedInteractions, error: ownedInteractionsError } = await client
    .from("interactions")
    .select("id")
    .eq("user_id", userId)
    .in("id", impactedInteractionIds);

  if (ownedInteractionsError) {
    throw new Error(ownedInteractionsError.message);
  }

  const ownedInteractionIds = (ownedInteractions || []).map(
    (interaction: { id: string }) => interaction.id,
  );

  if (ownedInteractionIds.length === 0) {
    return;
  }

  const { data: allMemberships, error: allMembershipsError } = await client
    .from("interaction_participants")
    .select("interaction_id, person_id")
    .in("interaction_id", ownedInteractionIds);

  if (allMembershipsError) {
    throw new Error(allMembershipsError.message);
  }

  const deleteIdSet = new Set<string>();

  for (const interactionId of ownedInteractionIds) {
    const participants = (allMemberships || []).filter(
      (membership: { interaction_id: string; person_id: string }) =>
        membership.interaction_id === interactionId,
    );

    if (participants.length === 0) {
      continue;
    }

    const allParticipantsDeleted = participants.every((membership: { person_id: string }) =>
      uniqueContactIds.includes(membership.person_id),
    );

    if (allParticipantsDeleted) {
      deleteIdSet.add(interactionId);
    }
  }

  const interactionIdsToDelete = Array.from(deleteIdSet);

  if (interactionIdsToDelete.length === 0) {
    return;
  }

  const { error: deleteInteractionsError } = await client
    .from("interactions")
    .delete()
    .in("id", interactionIdsToDelete);

  if (deleteInteractionsError) {
    throw new Error(deleteInteractionsError.message);
  }
}

/**
 * Collects all LinkedIn IDs (company and school) referenced by the work/education
 * history of the given persons. Must be called BEFORE deleting the persons so the
 * rows are still present.
 *
 * @param client Authenticated Supabase client.
 * @param userId The user who owns the contacts.
 * @param personIds The IDs of the contacts about to be deleted.
 * @returns Deduplicated array of LinkedIn IDs whose logos may become orphaned.
 */
async function collectLinkedInLogoIds(
  client: any,
  userId: string,
  personIds: string[],
): Promise<string[]> {
  if (personIds.length === 0) return [];

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("company_linkedin_id", "is", null),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("school_linkedin_id", "is", null),
  ]);

  const ids = new Set<string>();
  for (const row of workResult.data ?? []) ids.add(row.company_linkedin_id);
  for (const row of eduResult.data ?? []) ids.add(row.school_linkedin_id);
  return Array.from(ids);
}

/**
 * After the persons have been deleted (and their work/education rows cascaded away),
 * checks which of the candidate LinkedIn IDs are no longer referenced by any remaining
 * row for this user, then removes those orphaned logo files from Supabase Storage.
 *
 * @param client Authenticated Supabase client.
 * @param userId The user who owns the contacts.
 * @param candidateIds LinkedIn IDs collected before deletion via collectLinkedInLogoIds.
 */
async function removeOrphanedLinkedInLogos(
  client: any,
  userId: string,
  candidateIds: string[],
): Promise<void> {
  if (candidateIds.length === 0) return;

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("company_linkedin_id", candidateIds),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("school_linkedin_id", candidateIds),
  ]);

  const stillReferenced = new Set<string>();
  for (const row of workResult.data ?? []) stillReferenced.add(row.company_linkedin_id);
  for (const row of eduResult.data ?? []) stillReferenced.add(row.school_linkedin_id);

  const orphaned = candidateIds.filter((id) => !stillReferenced.has(id));
  if (orphaned.length === 0) return;

  const paths = orphaned.map((id) => `${userId}/${id}.jpg`);
  await client.storage.from("linkedin_logos").remove(paths);
}

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Contacts"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/contacts - List all contacts
   */
  fastify.get(
    "/",
    { schema: { querystring: ContactListQuery } },
    async (
      request: FastifyRequest<{
        Querystring: typeof ContactListQuery.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const query = request.query || {};
      const avatarOptions = extractAvatarOptions(query);

      const limit = Math.min(query.limit ?? 50, 200);
      const offset = query.offset ?? 0;
      const search = typeof query.q === "string" ? query.q.trim() : "";

      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

      const [
        { count: totalContactsCount },
        { count: monthInteractionsCount },
        { count: newContactsYearCount },
      ] = await Promise.all([
        client
          .from("people")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .eq("myself", false),
        client
          .from("interactions")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .gte("date", monthStart.toISOString())
          .lt("date", nextMonthStart.toISOString()),
        client
          .from("people")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .eq("myself", false)
          .not("created_at", "is", null)
          .gte("created_at", yearStart.toISOString())
          .lt("created_at", nextYearStart.toISOString()),
      ]);

      let peopleQuery = client
        .from("people")
        .select(CONTACT_SELECT, { count: "exact" })
        .eq("user_id", user.id)
        .eq("myself", false);

      if (search) {
        const searchTokens = search.split(/\s+/).filter(Boolean);
        for (const token of searchTokens) {
          peopleQuery = peopleQuery.or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`);
        }
      }

      switch (query.sort) {
        case "nameAsc":
          peopleQuery = peopleQuery.order("first_name", { ascending: true });
          break;
        case "nameDesc":
          peopleQuery = peopleQuery.order("first_name", { ascending: false });
          break;
        case "surnameAsc":
          peopleQuery = peopleQuery.order("last_name", { ascending: true, nullsFirst: true });
          break;
        case "surnameDesc":
          peopleQuery = peopleQuery.order("last_name", { ascending: false, nullsFirst: false });
          break;
        case "interactionAsc":
          peopleQuery = peopleQuery.order("last_interaction", {
            ascending: true,
            nullsFirst: true,
          });
          break;
        case "interactionDesc":
          peopleQuery = peopleQuery.order("last_interaction", {
            ascending: false,
            nullsFirst: false,
          });
          break;
        default:
          peopleQuery = peopleQuery.order("first_name", { ascending: true });
          break;
      }

      peopleQuery = peopleQuery.range(offset, offset + limit - 1);

      const { data: contacts, error, count } = await peopleQuery;

      if (error) {
        request.log.error({ err: error }, "Error fetching contacts");
        return reply.status(500).send({ error: error.message });
      }

      let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
      try {
        enrichedContacts = await attachContactExtras(client, user.id, contacts || [], {
          addresses: true,
          avatarOptions,
        });
      } catch (enrichError) {
        fastify.log.error({ enrichError }, "Failed to attach contact extras for contact list");
        enrichedContacts = withEmptySocialMedia(withEmptyChannels(contacts || []));
      }

      return {
        contacts: enrichedContacts,
        totalCount: typeof count === "number" ? count : enrichedContacts.length,
        limit,
        offset,
        stats: {
          totalContacts: totalContactsCount || 0,
          thisMonthInteractions: monthInteractionsCount || 0,
          newContactsThisYear: newContactsYearCount || 0,
        },
      };
    },
  );

  /**
   * GET /api/contacts/important-dates/upcoming - List upcoming reminders with notification configured
   */
  fastify.get(
    "/important-dates/upcoming",
    {
      schema: {
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { avatarQuality?: string; avatarSize?: string } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query as any);

      const today = new Date();
      const startDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      const endDate = new Date(startDate);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);

      const startDateIso = startDate.toISOString().slice(0, 10);
      const endDateIso = endDate.toISOString().slice(0, 10);

      const { data: rows, error } = await client
        .from("people_important_dates")
        .select(
          `${IMPORTANT_DATE_SELECT}, person:people!inner(id, first_name, last_name, updated_at)`,
        )
        .eq("user_id", user.id)
        .or("notify_days_before.not.is.null,notify_on.not.is.null")
        .order("date", { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      const reminderRows = (rows || []).filter((row) => {
        const reminderDateKey = deriveReminderDateKey(row);
        if (!reminderDateKey) {
          return false;
        }

        return reminderDateKey >= startDateIso && reminderDateKey <= endDateIso;
      });

      const reminderDateKeys = Array.from(
        new Set(
          reminderRows
            .map((row) => deriveReminderDateKey(row))
            .filter((value): value is string => Boolean(value)),
        ),
      );

      let latestDispatchByReminderDate = new Map<string, string>();
      if (reminderDateKeys.length > 0) {
        const { data: dispatchRows, error: dispatchError } = await client
          .from("reminder_dispatch_log")
          .select("reminder_date, created_at")
          .eq("user_id", user.id)
          .in("reminder_date", reminderDateKeys)
          .order("created_at", { ascending: false });

        if (dispatchError) {
          return reply.status(500).send({ error: dispatchError.message });
        }

        latestDispatchByReminderDate = (dispatchRows || []).reduce((accumulator, row) => {
          const typedRow = row as Pick<
            Database["public"]["Tables"]["reminder_dispatch_log"]["Row"],
            "reminder_date" | "created_at"
          >;

          if (!accumulator.has(typedRow.reminder_date)) {
            accumulator.set(typedRow.reminder_date, typedRow.created_at);
          }

          return accumulator;
        }, new Map<string, string>());
      }

      const reminders: UpcomingReminder[] = reminderRows
        .map((row) => {
          const person = row.person;
          if (!person) {
            return null;
          }

          const reminderDateKey = deriveReminderDateKey(row);
          const notificationSentAt = reminderDateKey
            ? latestDispatchByReminderDate.get(reminderDateKey) || null
            : null;

          return {
            importantDate: toImportantDate(row),
            person: toContactPreview(
              person,
              buildContactAvatarUrl(client, user.id, person.id, avatarOptions, person.updated_at),
            ),
            notificationSent: Boolean(notificationSentAt),
            notificationSentAt,
          };
        })
        .filter((value): value is UpcomingReminder => Boolean(value))
        .sort((a, b) => {
          const aReminderDate = deriveReminderDateKey({
            date: a.importantDate.date,
            notify_on: a.importantDate.notifyOn,
            notify_days_before: a.importantDate.notifyDaysBefore,
          });
          const bReminderDate = deriveReminderDateKey({
            date: b.importantDate.date,
            notify_on: b.importantDate.notifyOn,
            notify_days_before: b.importantDate.notifyDaysBefore,
          });

          if (aReminderDate && bReminderDate && aReminderDate !== bReminderDate) {
            return aReminderDate.localeCompare(bReminderDate);
          }

          return a.importantDate.date.localeCompare(b.importantDate.date);
        });

      return { reminders };
    },
  );

  /**
   * POST /api/contacts - Create a new contact
   */
  fastify.post(
    "/",
    { schema: { body: CreateContactBody } },
    async (
      request: FastifyRequest<{ Body: typeof CreateContactBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      // Prepare insert data
      const insertData: any = {
        user_id: user.id,
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        last_interaction: new Date().toISOString(),
        myself: false,
      };

      if (body.middleName && body.middleName.trim().length > 0) {
        insertData.middle_name = body.middleName.trim();
      }

      // Insert contact
      const { data: newContact, error } = await client
        .from("people")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (body.linkedin && body.linkedin.trim().length > 0) {
        try {
          await upsertContactSocialMedia(client, user.id, newContact.id, "linkedin", body.linkedin);
        } catch (socialError) {
          const message =
            socialError instanceof Error ? socialError.message : "Social upsert failed";
          return reply.status(500).send({ error: message });
        }
      }

      return reply.status(201).send({ id: newContact.id });
    },
  );

  /**
   * DELETE /api/contacts - Delete multiple contacts
   * Accepts either { ids: string[] } or { filter: ContactsFilter, excludeIds?: string[] }.
   */
  fastify.delete(
    "/",
    { schema: { body: DeleteContactsBody } },
    async (
      request: FastifyRequest<{ Body: typeof DeleteContactsBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      let uniqueIds: string[];

      // Resolve the list of IDs to delete — either provided directly or via filter.
      if ("ids" in body && Array.isArray(body.ids)) {
        uniqueIds = Array.from(new Set(body.ids.filter(Boolean)));
        if (uniqueIds.length === 0) {
          return reply.status(400).send({
            error: "Invalid request body. 'ids' must be a non-empty array.",
          });
        }
      } else if ("filter" in body && body.filter) {
        // Build the same Supabase query used by GET /contacts, but only select IDs.
        let filterQuery = client
          .from("people")
          .select("id")
          .eq("user_id", user.id)
          .eq("myself", false);

        const search = typeof body.filter.q === "string" ? body.filter.q.trim() : "";
        if (search) {
          const searchTokens = search.split(/\s+/).filter(Boolean);
          for (const token of searchTokens) {
            filterQuery = filterQuery.or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`);
          }
        }

        const { data: rows, error: filterError } = await filterQuery;

        if (filterError) {
          return reply.status(500).send({ error: filterError.message });
        }

        const excludeSet = new Set(body.excludeIds ?? []);
        uniqueIds = (rows || [])
          .map((r: { id: string }) => r.id)
          .filter((id: string) => !excludeSet.has(id));

        if (uniqueIds.length === 0) {
          return { message: "No contacts matched the filter" };
        }
      } else {
        return reply.status(400).send({
          error: "Invalid request body. Provide either 'ids' or 'filter'.",
        });
      }

      try {
        await deleteOrphanedInteractionsForDeletedContacts(client, user.id, uniqueIds);
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error
            ? cleanupError.message
            : "Failed to clean up interactions for deleted contacts";
        return reply.status(500).send({ error: message });
      }

      const candidateLogoIds = await collectLinkedInLogoIds(client, user.id, uniqueIds);

      const { error } = await client
        .from("people")
        .delete()
        .eq("user_id", user.id)
        .in("id", uniqueIds);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      // Clean up storage: delete avatar files for the deleted contacts
      const avatarPaths = uniqueIds.map((id) => `${user.id}/${id}.jpg`);
      await client.storage.from("avatars").remove(avatarPaths);

      // Clean up orphaned LinkedIn logo files (best-effort, does not fail the response)
      try {
        await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
      } catch (logoCleanupError) {
        request.log.warn(
          { logoCleanupError },
          "[contacts] Failed to clean up orphaned LinkedIn logos",
        );
      }

      return { message: "Contacts deleted successfully", deletedCount: uniqueIds.length };
    },
  );

  /**
   * DELETE /api/contacts/:id - Delete a single contact
   */
  fastify.delete(
    "/:id",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      try {
        await deleteOrphanedInteractionsForDeletedContacts(client, user.id, [id]);
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error
            ? cleanupError.message
            : "Failed to clean up interactions for deleted contact";
        return reply.status(500).send({ error: message });
      }

      const candidateLogoIds = await collectLinkedInLogoIds(client, user.id, [id]);

      const { data: deletedContact, error } = await client
        .from("people")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error || !deletedContact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Clean up storage: delete avatar file for the deleted contact
      await client.storage.from("avatars").remove([`${user.id}/${id}.jpg`]);

      // Clean up orphaned LinkedIn logo files (best-effort, does not fail the response)
      try {
        await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
      } catch (logoCleanupError) {
        request.log.warn(
          { logoCleanupError },
          "[contacts] Failed to clean up orphaned LinkedIn logos",
        );
      }

      return { message: "Contact deleted successfully" };
    },
  );

  /**
   * GET /api/contacts/merge-recommendations - List merge recommendations
   */
  fastify.get(
    "/merge-recommendations",
    { schema: { querystring: MergeRecommendationsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof MergeRecommendationsQuery.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query);
      const declinedQuery = request.query?.declined;
      const showDeclined =
        typeof declinedQuery === "boolean"
          ? declinedQuery
          : typeof declinedQuery === "string"
            ? declinedQuery.toLowerCase() === "true"
            : false;

      let { data: recommendationRows, error: recommendationsError } = await client
        .from("people_merge_recommendations")
        .select("id, left_person_id, right_person_id, score, reasons")
        .eq("user_id", user.id)
        .eq("is_declined", showDeclined)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false });

      if (recommendationsError) {
        return reply.status(500).send({ error: recommendationsError.message });
      }

      if (!showDeclined && (!recommendationRows || recommendationRows.length === 0)) {
        const { data: existingRows, error: existingRowsError } = await client
          .from("people_merge_recommendations")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (existingRowsError) {
          return reply.status(500).send({ error: existingRowsError.message });
        }

        if (!existingRows || existingRows.length === 0) {
          try {
            await recomputeMergeRecommendations(client, user.id);
          } catch (recomputeError) {
            const message =
              recomputeError instanceof Error
                ? recomputeError.message
                : "Failed to generate merge recommendations";
            return reply.status(500).send({ error: message });
          }

          const refreshed = await client
            .from("people_merge_recommendations")
            .select("id, left_person_id, right_person_id, score, reasons")
            .eq("user_id", user.id)
            .eq("is_declined", false)
            .order("score", { ascending: false })
            .order("created_at", { ascending: false });

          recommendationRows = refreshed.data || [];
          recommendationsError = refreshed.error;

          if (recommendationsError) {
            return reply.status(500).send({ error: recommendationsError.message });
          }
        }
      }

      const personIds = Array.from(
        new Set(
          (recommendationRows || []).flatMap((row) => [row.left_person_id, row.right_person_id]),
        ),
      );

      if (personIds.length === 0) {
        const emptyResponse: MergeRecommendationsResponse = { recommendations: [] };
        return emptyResponse;
      }

      const { data: personRows, error: personRowsError } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("user_id", user.id)
        .in("id", personIds);

      if (personRowsError) {
        return reply.status(500).send({ error: personRowsError.message });
      }

      let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
      try {
        enrichedContacts = await attachContactExtras(client, user.id, personRows || [], {
          addresses: true,
          avatarOptions,
        });
      } catch (enrichError) {
        fastify.log.error(
          { enrichError },
          "Failed to attach contact extras for merge recommendations",
        );
        enrichedContacts = withEmptySocialMedia(withEmptyChannels(personRows || []));
      }

      const contacts = enrichedContacts;

      const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

      const allowedReasons: MergeRecommendationReason[] = ["fullName", "email", "phone"];
      const recommendations: MergeRecommendationsResponse["recommendations"] = [];

      for (const row of recommendationRows || []) {
        const leftPerson = contactsById.get(row.left_person_id);
        const rightPerson = contactsById.get(row.right_person_id);

        if (!leftPerson || !rightPerson) {
          continue;
        }

        const reasons = (Array.isArray(row.reasons) ? row.reasons : []).filter((reason) =>
          allowedReasons.includes(reason as MergeRecommendationReason),
        ) as MergeRecommendationReason[];

        recommendations.push({
          id: row.id,
          leftPerson: leftPerson as Contact,
          rightPerson: rightPerson as Contact,
          score: Number(row.score) || 0,
          reasons,
        });
      }

      const response: MergeRecommendationsResponse = {
        recommendations,
      };

      return response;
    },
  );

  /**
   * POST /api/contacts/merge-recommendations/refresh - Recompute merge recommendations
   */
  fastify.post(
    "/merge-recommendations/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { client, user } = getAuth(request);

      try {
        const recommendationsCount = await recomputeMergeRecommendations(client, user.id);
        const response: RefreshMergeRecommendationsResponse = {
          success: true,
          recommendationsCount,
        };

        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to refresh merge recommendations";
        return reply.status(500).send({ error: message });
      }
    },
  );

  /**
   * PATCH /api/contacts/merge-recommendations/:id/decline - Decline recommendation
   */
  fastify.patch(
    "/merge-recommendations/:id/decline",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const recommendationId = request.params.id?.trim();

      if (!recommendationId) {
        return reply.status(400).send({ error: "Recommendation id is required" });
      }

      const { data, error } = await client
        .from("people_merge_recommendations")
        .update({
          is_declined: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recommendationId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!data) {
        return reply.status(404).send({ error: "Recommendation not found" });
      }

      return { success: true };
    },
  );

  /**
   * PATCH /api/contacts/merge-recommendations/:id/restore - Restore recommendation
   */
  fastify.patch(
    "/merge-recommendations/:id/restore",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const recommendationId = request.params.id?.trim();

      if (!recommendationId) {
        return reply.status(400).send({ error: "Recommendation id is required" });
      }

      const { data, error } = await client
        .from("people_merge_recommendations")
        .update({
          is_declined: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recommendationId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!data) {
        return reply.status(404).send({ error: "Recommendation not found" });
      }

      return { success: true };
    },
  );

  /**
   * POST /api/contacts/merge - Merge duplicate contacts
   * Left person survives and absorbs data from right person.
   */
  fastify.post(
    "/merge",
    { schema: { body: MergeContactsBody } },
    async (
      request: FastifyRequest<{ Body: typeof MergeContactsBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const leftPersonId = request.body.leftPersonId.trim();
      const rightPersonId = request.body.rightPersonId.trim();
      const conflictResolutions = request.body.conflictResolutions || {};

      if (leftPersonId === rightPersonId) {
        return reply.status(400).send({ error: "Cannot merge the same contact" });
      }

      for (const [field, choice] of Object.entries(conflictResolutions)) {
        if (!MERGEABLE_FIELDS.has(field as MergeConflictField)) {
          return reply.status(400).send({ error: `Unsupported conflict field: ${field}` });
        }

        if (choice !== "left" && choice !== "right") {
          return reply.status(400).send({ error: `Invalid conflict choice for field: ${field}` });
        }
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("*")
        .eq("user_id", user.id)
        .in("id", [leftPersonId, rightPersonId]);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const leftPerson = peopleRows.find((person) => person.id === leftPersonId);
      const rightPerson = peopleRows.find((person) => person.id === rightPersonId);

      if (!leftPerson || !rightPerson) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const scalarUpdates: Record<string, unknown> = {};

      for (const [field, dbColumn] of Object.entries(MERGEABLE_SCALAR_FIELDS)) {
        const mergeField = field as MergeConflictField;
        const leftValue = (leftPerson as Record<string, unknown>)[dbColumn];
        const rightValue = (rightPerson as Record<string, unknown>)[dbColumn];

        if (!hasMeaningfulValue(rightValue)) {
          continue;
        }

        if (!hasMeaningfulValue(leftValue)) {
          scalarUpdates[dbColumn] = rightValue;
          continue;
        }

        if (areValuesEquivalent(leftValue, rightValue)) {
          continue;
        }

        if (resolveConflictChoice(conflictResolutions, mergeField) === "right") {
          scalarUpdates[dbColumn] = rightValue;
        }
      }

      scalarUpdates.updated_at = new Date().toISOString();

      const { error: updateLeftPersonError } = await client
        .from("people")
        .update(scalarUpdates)
        .eq("id", leftPersonId)
        .eq("user_id", user.id);

      if (updateLeftPersonError) {
        return reply.status(500).send({ error: updateLeftPersonError.message });
      }

      const [
        { data: leftPhones, error: leftPhonesError },
        { data: rightPhones, error: rightPhonesError },
      ] = await Promise.all([
        client
          .from("people_phones")
          .select("prefix, value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("sort_order", { ascending: true }),
        client
          .from("people_phones")
          .select("prefix, value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("sort_order", { ascending: true }),
      ]);

      if (leftPhonesError || rightPhonesError) {
        return reply
          .status(500)
          .send({ error: leftPhonesError?.message || rightPhonesError?.message });
      }

      const normalizedLeftPhones = (leftPhones || [])
        .map((phone) => ({
          prefix: phone.prefix || "+1",
          value: String(phone.value || "").trim(),
          type: phone.type || "home",
          preferred: Boolean(phone.preferred),
        }))
        .filter((phone) => phone.value.length > 0);

      const normalizedRightPhones = (rightPhones || [])
        .map((phone) => ({
          prefix: phone.prefix || "+1",
          value: String(phone.value || "").trim(),
          type: phone.type || "home",
          preferred: Boolean(phone.preferred),
        }))
        .filter((phone) => phone.value.length > 0);

      const phonesEqual =
        JSON.stringify(normalizePhoneSet(normalizedLeftPhones)) ===
        JSON.stringify(normalizePhoneSet(normalizedRightPhones));

      let mergedPhones = normalizedLeftPhones;
      if (!normalizedLeftPhones.length && normalizedRightPhones.length) {
        mergedPhones = normalizedRightPhones;
      } else if (normalizedLeftPhones.length && normalizedRightPhones.length && !phonesEqual) {
        const choice = resolveConflictChoice(conflictResolutions, "phones");
        mergedPhones = choice === "right" ? normalizedRightPhones : normalizedLeftPhones;
      }

      try {
        await replaceContactPhones(client, user.id, leftPersonId, mergedPhones as PhoneEntry[]);
      } catch (phoneError) {
        const message = phoneError instanceof Error ? phoneError.message : "Failed to merge phones";
        return reply.status(500).send({ error: message });
      }

      const [
        { data: leftEmails, error: leftEmailsError },
        { data: rightEmails, error: rightEmailsError },
      ] = await Promise.all([
        client
          .from("people_emails")
          .select("value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("sort_order", { ascending: true }),
        client
          .from("people_emails")
          .select("value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("sort_order", { ascending: true }),
      ]);

      if (leftEmailsError || rightEmailsError) {
        return reply
          .status(500)
          .send({ error: leftEmailsError?.message || rightEmailsError?.message });
      }

      const normalizedLeftEmails = (leftEmails || [])
        .map((email) => ({
          value: String(email.value || "").trim(),
          type: email.type || "home",
          preferred: Boolean(email.preferred),
        }))
        .filter((email) => email.value.length > 0);

      const normalizedRightEmails = (rightEmails || [])
        .map((email) => ({
          value: String(email.value || "").trim(),
          type: email.type || "home",
          preferred: Boolean(email.preferred),
        }))
        .filter((email) => email.value.length > 0);

      const emailsEqual =
        JSON.stringify(normalizeEmailSet(normalizedLeftEmails)) ===
        JSON.stringify(normalizeEmailSet(normalizedRightEmails));

      let mergedEmails = normalizedLeftEmails;
      if (!normalizedLeftEmails.length && normalizedRightEmails.length) {
        mergedEmails = normalizedRightEmails;
      } else if (normalizedLeftEmails.length && normalizedRightEmails.length && !emailsEqual) {
        const choice = resolveConflictChoice(conflictResolutions, "emails");
        mergedEmails = choice === "right" ? normalizedRightEmails : normalizedLeftEmails;
      }

      try {
        await replaceContactEmails(client, user.id, leftPersonId, mergedEmails as EmailEntry[]);
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : "Failed to merge emails";
        return reply.status(500).send({ error: message });
      }

      const { data: socialRows, error: socialRowsError } = await client
        .from("people_social_media")
        .select("id, person_id, platform, handle, connected_at")
        .eq("user_id", user.id)
        .in("person_id", [leftPersonId, rightPersonId]);

      if (socialRowsError) {
        return reply.status(500).send({ error: socialRowsError.message });
      }

      const leftSocialByPlatform = new Map(
        (socialRows || [])
          .filter((row) => row.person_id === leftPersonId)
          .map((row) => [row.platform, row]),
      );

      const rightSocialByPlatform = new Map(
        (socialRows || [])
          .filter((row) => row.person_id === rightPersonId)
          .map((row) => [row.platform, row]),
      );

      // Batch social media writes: collect inserts and updates, then execute in parallel
      const socialInserts: Array<{
        user_id: string;
        person_id: string;
        platform: string;
        handle: string;
        connected_at: string | null;
      }> = [];
      const socialUpdatePromises: Array<PromiseLike<unknown>> = [];

      for (const [field, platform] of Object.entries(MERGEABLE_SOCIAL_FIELDS)) {
        const leftSocial = leftSocialByPlatform.get(platform);
        const rightSocial = rightSocialByPlatform.get(platform);

        if (!rightSocial || !hasMeaningfulValue(rightSocial.handle)) {
          continue;
        }

        if (!leftSocial) {
          socialInserts.push({
            user_id: user.id,
            person_id: leftPersonId,
            platform,
            handle: rightSocial.handle,
            connected_at: rightSocial.connected_at,
          });
          continue;
        }

        if (areValuesEquivalent(leftSocial.handle, rightSocial.handle)) {
          continue;
        }

        const choice = resolveConflictChoice(conflictResolutions, field as MergeConflictField);
        if (choice !== "right") {
          continue;
        }

        socialUpdatePromises.push(
          client
            .from("people_social_media")
            .update({
              handle: rightSocial.handle,
              connected_at: rightSocial.connected_at,
              updated_at: new Date().toISOString(),
            })
            .eq("id", leftSocial.id)
            .eq("user_id", user.id),
        );
      }

      // Execute all social media writes in parallel
      const socialWriteResults = await Promise.allSettled([
        ...(socialInserts.length > 0
          ? [client.from("people_social_media").insert(socialInserts)]
          : []),
        ...socialUpdatePromises,
      ]);

      // Check for non-duplicate errors
      for (const result of socialWriteResults) {
        if (result.status === "rejected") {
          return reply
            .status(500)
            .send({ error: result.reason?.message ?? "Social media merge failed" });
        }
        if (
          result.status === "fulfilled" &&
          result.value &&
          typeof result.value === "object" &&
          "error" in result.value
        ) {
          const err = (result.value as { error: { code?: string; message: string } | null }).error;
          if (err && err.code !== "23505") {
            return reply.status(500).send({ error: err.message });
          }
        }
      }

      const { data: rightGroupMemberships, error: rightGroupMembershipsError } = await client
        .from("people_groups")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("person_id", rightPersonId);

      if (rightGroupMembershipsError) {
        return reply.status(500).send({ error: rightGroupMembershipsError.message });
      }

      if ((rightGroupMemberships || []).length > 0) {
        const { error: groupMergeError } = await client.from("people_groups").upsert(
          (rightGroupMemberships || []).map((membership) => ({
            user_id: user.id,
            person_id: leftPersonId,
            group_id: membership.group_id,
          })),
          {
            onConflict: "person_id,group_id",
            ignoreDuplicates: true,
          },
        );

        if (groupMergeError) {
          return reply.status(500).send({ error: groupMergeError.message });
        }
      }

      const { data: rightParticipants, error: rightParticipantsError } = await client
        .from("interaction_participants")
        .select("interaction_id")
        .eq("person_id", rightPersonId);

      if (rightParticipantsError) {
        return reply.status(500).send({ error: rightParticipantsError.message });
      }

      if ((rightParticipants || []).length > 0) {
        const { error: participantsMergeError } = await client
          .from("interaction_participants")
          .upsert(
            (rightParticipants || []).map((participant) => ({
              interaction_id: participant.interaction_id,
              person_id: leftPersonId,
            })),
            {
              onConflict: "interaction_id,person_id",
              ignoreDuplicates: true,
            },
          );

        if (participantsMergeError) {
          return reply.status(500).send({ error: participantsMergeError.message });
        }
      }

      const [
        { data: leftImportantDates, error: leftImportantDatesError },
        { data: rightImportantDates, error: rightImportantDatesError },
      ] = await Promise.all([
        client
          .from("people_important_dates")
          .select("type, date, note, notify_days_before")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("created_at", { ascending: true }),
        client
          .from("people_important_dates")
          .select("type, date, note, notify_days_before")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("created_at", { ascending: true }),
      ]);

      if (leftImportantDatesError || rightImportantDatesError) {
        return reply
          .status(500)
          .send({ error: leftImportantDatesError?.message || rightImportantDatesError?.message });
      }

      const normalizedLeftImportantDates = (leftImportantDates || []).map((event) => ({
        type: event.type,
        date: event.date,
        note: event.note,
        notify_days_before: event.notify_days_before,
      }));

      const normalizedRightImportantDates = (rightImportantDates || []).map((event) => ({
        type: event.type,
        date: event.date,
        note: event.note,
        notify_days_before: event.notify_days_before,
      }));

      const importantDatesEqual =
        JSON.stringify(normalizeImportantDateSet(normalizedLeftImportantDates)) ===
        JSON.stringify(normalizeImportantDateSet(normalizedRightImportantDates));

      let mergedImportantDates = normalizedLeftImportantDates;
      if (!normalizedLeftImportantDates.length && normalizedRightImportantDates.length) {
        mergedImportantDates = normalizedRightImportantDates;
      } else if (
        normalizedLeftImportantDates.length &&
        normalizedRightImportantDates.length &&
        !importantDatesEqual
      ) {
        const choice = resolveConflictChoice(conflictResolutions, "importantDates");
        mergedImportantDates =
          choice === "right" ? normalizedRightImportantDates : normalizedLeftImportantDates;
      }

      const { error: deleteLeftImportantDatesError } = await client
        .from("people_important_dates")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", leftPersonId);

      if (deleteLeftImportantDatesError) {
        return reply.status(500).send({ error: deleteLeftImportantDatesError.message });
      }

      if (mergedImportantDates.length > 0) {
        const { error: insertImportantDatesError } = await client
          .from("people_important_dates")
          .insert(
            mergedImportantDates.map((event) => ({
              user_id: user.id,
              person_id: leftPersonId,
              type: event.type,
              date: event.date,
              note: event.note,
              notify_days_before: event.notify_days_before,
            })),
          );

        if (insertImportantDatesError) {
          return reply.status(500).send({ error: insertImportantDatesError.message });
        }
      }

      const { data: relationshipsToTransfer, error: relationshipsToTransferError } = await client
        .from("people_relationships")
        .select("relationship_type, source_person_id, target_person_id")
        .eq("user_id", user.id)
        .or(`source_person_id.eq.${rightPersonId},target_person_id.eq.${rightPersonId}`);

      if (relationshipsToTransferError) {
        return reply.status(500).send({ error: relationshipsToTransferError.message });
      }

      // Bulk insert relationship transfers instead of per-row inserts
      const relationshipRows = (relationshipsToTransfer || [])
        .map((relationship) => {
          const nextSourcePersonId =
            relationship.source_person_id === rightPersonId
              ? leftPersonId
              : relationship.source_person_id;
          const nextTargetPersonId =
            relationship.target_person_id === rightPersonId
              ? leftPersonId
              : relationship.target_person_id;

          // Filter out self-referential relationships
          if (nextSourcePersonId === nextTargetPersonId) {
            return null;
          }

          return {
            user_id: user.id,
            source_person_id: nextSourcePersonId,
            target_person_id: nextTargetPersonId,
            relationship_type: relationship.relationship_type,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (relationshipRows.length > 0) {
        // Use Promise.allSettled to handle individual constraint violations gracefully
        const results = await Promise.allSettled(
          relationshipRows.map((row) => client.from("people_relationships").insert(row)),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.error) {
            const err = result.value.error;
            // 23505 = unique violation, 23514 = check constraint — both are expected and skippable
            if (err.code !== "23505" && err.code !== "23514") {
              return reply.status(500).send({ error: err.message });
            }
          }
        }
      }

      const { error: deleteMergedPersonError } = await client
        .from("people")
        .delete()
        .eq("id", rightPersonId)
        .eq("user_id", user.id);

      if (deleteMergedPersonError) {
        return reply.status(500).send({ error: deleteMergedPersonError.message });
      }

      const response: MergeContactsResponse = {
        personId: leftPersonId,
        userId: user.id,
        mergedIntoPersonId: leftPersonId,
        mergedFromPersonId: rightPersonId,
      };

      return response;
    },
  );

  /**
   * GET /api/contacts/by-social - Find contact by social media platform + handle
   */
  fastify.get(
    "/by-social",
    { schema: { querystring: BySocialQuery } },
    async (
      request: FastifyRequest<{
        Querystring: typeof BySocialQuery.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const platform = request.query.platform?.trim() ?? "";
      const handle = request.query.handle?.trim() ?? "";
      const avatarOpts = extractAvatarOptions(request.query);

      if (!platform || !handle || !isLookupPlatform(platform)) {
        return reply.status(400).send({ error: "Invalid platform or handle" });
      }

      const personId = await findPersonIdBySocialMedia(client, user.id, platform, handle);

      if (!personId) {
        return { exists: false };
      }

      const { data: person, error } = await client
        .from("people")
        .select("id, first_name, last_name, updated_at")
        .eq("user_id", user.id)
        .eq("id", personId)
        .single();

      if (error || !person) {
        return reply.status(500).send({ error: error?.message ?? "Failed to find contact" });
      }

      return {
        exists: true,
        contact: toContactPreview(
          person,
          buildContactAvatarUrl(client, user.id, person.id, avatarOpts, person.updated_at),
        ),
      };
    },
  );

  /**
   * GET /api/contacts/:id - Get a single contact
   */
  fastify.get(
    "/:id",
    {
      schema: {
        params: UuidParam,
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Querystring: { avatarQuality?: string; avatarSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const avatarOpts = extractAvatarOptions(request.query as any);

      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({ error: error.message });
      }

      try {
        const [enrichedContact] = await attachContactExtras(client, user.id, [contact], {
          addresses: true,
          avatarOptions: avatarOpts,
        });
        return { contact: enrichedContact };
      } catch (channelError) {
        fastify.log.error(
          { channelError },
          "Failed to attach contact channels/social media for single contact",
        );
        return { contact: withEmptySocialMedia(withEmptyChannels([contact]))[0] };
      }
    },
  );

  /**
   * GET /api/contacts/:id/groups - Get groups a contact belongs to
   */
  fastify.get(
    "/:id/groups",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client } = getAuth(request);
      const { id: personId } = request.params;

      const { data: memberships, error: membershipsError } = await client
        .from("people_groups")
        .select("group_id")
        .eq("person_id", personId);

      if (membershipsError) {
        return reply.status(500).send({ error: membershipsError.message });
      }

      const groupIds = (memberships || []).map((m) => m.group_id);

      if (groupIds.length === 0) {
        return { groups: [] };
      }

      const { data: groups, error: groupsError } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .in("id", groupIds)
        .order("label", { ascending: true });

      if (groupsError) {
        return reply.status(500).send({ error: groupsError.message });
      }

      return { groups };
    },
  );

  /**
   * GET /api/contacts/:id/tags - Get tags for a contact
   */
  fastify.get(
    "/:id/tags",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client } = getAuth(request);
      const { id: personId } = request.params;

      const { data: memberships, error: membershipsError } = await client
        .from("people_tags")
        .select("tag_id")
        .eq("person_id", personId);

      if (membershipsError) {
        return reply.status(500).send({ error: membershipsError.message });
      }

      const tagIds = (memberships || []).map((m: { tag_id: string }) => m.tag_id);

      if (tagIds.length === 0) {
        return { tags: [] };
      }

      const { data: tags, error: tagsError } = await client
        .from("tags")
        .select(TAG_SELECT)
        .in("id", tagIds)
        .order("label", { ascending: true });

      if (tagsError) {
        return reply.status(500).send({ error: tagsError.message });
      }

      return { tags };
    },
  );

  /**
   * POST /api/contacts/:id/tags - Add a tag to a contact
   */
  fastify.post(
    "/:id/tags",
    { schema: { params: UuidParam, body: ContactTagBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof ContactTagBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const { tagId } = request.body;

      const { error } = await client
        .from("people_tags")
        .upsert(
          { person_id: personId, tag_id: tagId, user_id: user.id },
          { onConflict: "person_id,tag_id", ignoreDuplicates: true },
        );

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.status(201).send({ message: "Tag added to contact successfully" });
    },
  );

  /**
   * DELETE /api/contacts/:id/tags/:tagId - Remove a tag from a contact
   */
  fastify.delete(
    "/:id/tags/:tagId",
    { schema: { params: ContactTagIdParams } },
    async (
      request: FastifyRequest<{ Params: typeof ContactTagIdParams.static }>,
      reply: FastifyReply,
    ) => {
      const { client } = getAuth(request);
      const { id: personId, tagId } = request.params;

      const { error } = await client
        .from("people_tags")
        .delete()
        .eq("person_id", personId)
        .eq("tag_id", tagId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Tag removed from contact successfully" };
    },
  );

  /**
   * GET /api/contacts/:id/relationships - Get all relationships for a person
   */
  fastify.get(
    "/:id/relationships",
    {
      schema: {
        params: UuidParam,
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Querystring: { avatarQuality?: string; avatarSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query as any);
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const { data: rows, error: rowsError } = await client
        .from("people_relationships")
        .select(RELATIONSHIP_SELECT)
        .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
      }

      const relationships = rows || [];
      if (relationships.length === 0) {
        return { relationships: [] };
      }

      const personIds = Array.from(
        new Set(
          relationships.flatMap((relationship) => [
            relationship.source_person_id,
            relationship.target_person_id,
          ]),
        ),
      );

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id, first_name, last_name, updated_at")
        .in("id", personIds)
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      const peopleById = new Map((peopleRows || []).map((personRow) => [personRow.id, personRow]));

      const formattedRelationships = relationships
        .map((relationship) => {
          const sourcePerson = peopleById.get(relationship.source_person_id);
          const targetPerson = peopleById.get(relationship.target_person_id);

          if (!sourcePerson || !targetPerson) {
            return null;
          }

          return {
            id: relationship.id,
            userId: relationship.user_id,
            sourcePersonId: relationship.source_person_id,
            targetPersonId: relationship.target_person_id,
            relationshipType: relationship.relationship_type,
            createdAt: relationship.created_at,
            updatedAt: relationship.updated_at,
            sourcePerson: toContactPreview(
              sourcePerson,
              buildContactAvatarUrl(
                client,
                user.id,
                sourcePerson.id,
                avatarOpts,
                sourcePerson.updated_at,
              ),
            ),
            targetPerson: toContactPreview(
              targetPerson,
              buildContactAvatarUrl(
                client,
                user.id,
                targetPerson.id,
                avatarOpts,
                targetPerson.updated_at,
              ),
            ),
          };
        })
        .filter((relationship) => Boolean(relationship));

      return { relationships: formattedRelationships };
    },
  );

  /**
   * POST /api/contacts/:id/relationships - Create a relationship for a person
   */
  fastify.post(
    "/:id/relationships",
    { schema: { params: UuidParam, body: CreateRelationshipBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof CreateRelationshipBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: sourcePersonId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId.trim();

      if (sourcePersonId === normalizedRelatedPersonId) {
        return reply.status(400).send({ error: "A contact cannot be related to itself" });
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id")
        .in("id", [sourcePersonId, normalizedRelatedPersonId])
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const { data: insertedRelationship, error: insertError } = await client
        .from("people_relationships")
        .insert({
          user_id: user.id,
          source_person_id: sourcePersonId,
          target_person_id: normalizedRelatedPersonId,
          relationship_type: relationshipType,
        })
        .select(RELATIONSHIP_SELECT)
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Relationship already exists" });
        }

        if (insertError.code === "23514") {
          return reply.status(400).send({ error: "Invalid relationship data" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return reply.status(201).send({
        relationship: {
          id: insertedRelationship.id,
          userId: insertedRelationship.user_id,
          sourcePersonId: insertedRelationship.source_person_id,
          targetPersonId: insertedRelationship.target_person_id,
          relationshipType: insertedRelationship.relationship_type,
          createdAt: insertedRelationship.created_at,
          updatedAt: insertedRelationship.updated_at,
        },
      });
    },
  );

  /**
   * PATCH /api/contacts/:id/relationships/:relationshipId - Update a relationship for a person
   */
  fastify.patch(
    "/:id/relationships/:relationshipId",
    { schema: { params: RelationshipIdParams, body: UpdateRelationshipBody } },
    async (
      request: FastifyRequest<{
        Params: typeof RelationshipIdParams.static;
        Body: typeof UpdateRelationshipBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId, relationshipId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId.trim();

      if (personId === normalizedRelatedPersonId) {
        return reply.status(400).send({ error: "A contact cannot be related to itself" });
      }

      const { data: existingRelationship, error: existingRelationshipError } = await client
        .from("people_relationships")
        .select("id, source_person_id, target_person_id")
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .single();

      if (existingRelationshipError || !existingRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      if (
        existingRelationship.source_person_id !== personId &&
        existingRelationship.target_person_id !== personId
      ) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id")
        .in("id", [personId, normalizedRelatedPersonId])
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const { data: updatedRelationship, error: updateError } = await client
        .from("people_relationships")
        .update({
          source_person_id: personId,
          target_person_id: normalizedRelatedPersonId,
          relationship_type: relationshipType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .select(RELATIONSHIP_SELECT)
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          return reply.status(409).send({ error: "Relationship already exists" });
        }

        if (updateError.code === "23514") {
          return reply.status(400).send({ error: "Invalid relationship data" });
        }

        return reply.status(500).send({ error: updateError.message });
      }

      return {
        relationship: {
          id: updatedRelationship.id,
          userId: updatedRelationship.user_id,
          sourcePersonId: updatedRelationship.source_person_id,
          targetPersonId: updatedRelationship.target_person_id,
          relationshipType: updatedRelationship.relationship_type,
          createdAt: updatedRelationship.created_at,
          updatedAt: updatedRelationship.updated_at,
        },
      };
    },
  );

  /**
   * DELETE /api/contacts/:id/relationships/:relationshipId - Delete a relationship for a person
   */
  fastify.delete(
    "/:id/relationships/:relationshipId",
    { schema: { params: RelationshipIdParams } },
    async (
      request: FastifyRequest<{ Params: typeof RelationshipIdParams.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId, relationshipId } = request.params;

      const { data: existingRelationship, error: existingRelationshipError } = await client
        .from("people_relationships")
        .select("id, source_person_id, target_person_id")
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .single();

      if (existingRelationshipError || !existingRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      if (
        existingRelationship.source_person_id !== personId &&
        existingRelationship.target_person_id !== personId
      ) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      const { data: deletedRelationship, error: deleteError } = await client
        .from("people_relationships")
        .delete()
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (deleteError || !deletedRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      return { message: "Relationship deleted successfully" };
    },
  );

  /**
   * GET /api/contacts/:id/important-dates - Get normalized important dates for a person
   */
  fastify.get(
    "/:id/important-dates",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const { data: rows, error: rowsError } = await client
        .from("people_important_dates")
        .select(IMPORTANT_DATE_SELECT)
        .eq("user_id", user.id)
        .eq("person_id", personId)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
      }

      return {
        dates: (rows || []).map(toImportantDate),
      };
    },
  );

  /**
   * PUT /api/contacts/:id/important-dates - Replace normalized important dates for a person
   */
  fastify.put(
    "/:id/important-dates",
    { schema: { params: UuidParam, body: ImportantDatesBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof ImportantDatesBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const dates = request.body.dates;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const replaceRows = dates.map((event) => ({
        id: event.id,
        user_id: user.id,
        person_id: personId,
        type: event.type,
        date: event.date,
        note: event.note?.trim() ? event.note.trim() : null,
        notify_days_before: event.notifyDaysBefore ?? null,
      }));

      const { error: deleteError } = await client
        .from("people_important_dates")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", personId);

      if (deleteError) {
        return reply.status(500).send({ error: deleteError.message });
      }

      if (replaceRows.length === 0) {
        return { dates: [] };
      }

      const { data: insertedRows, error: insertError } = await client
        .from("people_important_dates")
        .insert(replaceRows)
        .select(IMPORTANT_DATE_SELECT)
        .order("created_at", { ascending: true });

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Duplicate important date" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return {
        dates: (insertedRows || []).map(toImportantDate),
      };
    },
  );

  /**
   * PATCH /api/contacts/:id - Update a contact
   */
  fastify.patch(
    "/:id",
    { schema: { params: UuidParam, body: UpdateContactBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof UpdateContactBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.firstName !== undefined) {
        updates.first_name = body.firstName;
      }
      if (body.middleName !== undefined) updates.middle_name = body.middleName;
      if (body.lastName !== undefined) updates.last_name = body.lastName;
      if (body.headline !== undefined) updates.headline = body.headline;
      if (body.place !== undefined) updates.place = body.place;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.language !== undefined) updates.language = body.language;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      if (body.location !== undefined) updates.location = body.location;
      if (body.addressLine1 !== undefined) updates.address_line1 = body.addressLine1;
      if (body.addressLine2 !== undefined) updates.address_line2 = body.addressLine2;
      if (body.addressCity !== undefined) updates.address_city = body.addressCity;
      if (body.addressPostalCode !== undefined)
        updates.address_postal_code = body.addressPostalCode;
      if (body.addressState !== undefined) updates.address_state = body.addressState;
      if (body.addressStateCode !== undefined) updates.address_state_code = body.addressStateCode;
      if (body.addressCountry !== undefined) updates.address_country = body.addressCountry;
      if (body.addressCountryCode !== undefined)
        updates.address_country_code = body.addressCountryCode;
      if (body.addressGranularity !== undefined)
        updates.address_granularity = body.addressGranularity;
      if (body.addressFormatted !== undefined) updates.address_formatted = body.addressFormatted;
      if (body.addressGeocodeSource !== undefined)
        updates.address_geocode_source = body.addressGeocodeSource;
      if (body.lastInteraction !== undefined) updates.last_interaction = body.lastInteraction;

      const hasLatitudeField = Object.prototype.hasOwnProperty.call(body, "latitude");
      const hasLongitudeField = Object.prototype.hasOwnProperty.call(body, "longitude");

      let nextLatitude: number | null | undefined;
      let nextLongitude: number | null | undefined;

      if (hasLatitudeField || hasLongitudeField) {
        nextLatitude = (body.latitude as number | null | undefined) ?? null;
        nextLongitude = (body.longitude as number | null | undefined) ?? null;

        if ((nextLatitude === null) !== (nextLongitude === null)) {
          return reply
            .status(400)
            .send({ error: "Both latitude and longitude must be provided together" });
        }

        if (
          nextLatitude !== null &&
          nextLongitude !== null &&
          (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude))
        ) {
          return reply.status(400).send({ error: "Invalid latitude/longitude values" });
        }
      }

      let nextPhones: PhoneEntry[] | undefined;
      if (body.phones !== undefined) {
        try {
          nextPhones = parsePhoneEntries(body.phones);
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : "Invalid phones payload";
          return reply.status(400).send({ error: message });
        }
      }

      let nextEmails: EmailEntry[] | undefined;
      if (body.emails !== undefined) {
        try {
          nextEmails = parseEmailEntries(body.emails);
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : "Invalid emails payload";
          return reply.status(400).send({ error: message });
        }
      }

      let nextAddresses: ContactAddressEntry[] | undefined;
      if (body.addresses !== undefined) {
        try {
          nextAddresses = parseAddressEntries(body.addresses);
          request.log.info(
            {
              route: "PATCH /contacts/:id",
              personId: id,
              addressCount: nextAddresses.length,
              addresses: nextAddresses.map((entry) => ({
                type: entry.type,
                value: entry.value,
                latitude: entry.latitude,
                longitude: entry.longitude,
                addressFormatted: entry.addressFormatted,
                addressGeocodeSource: entry.addressGeocodeSource,
              })),
            },
            "Parsed addresses payload",
          );
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : "Invalid addresses payload";
          return reply.status(400).send({ error: message });
        }

        const preferredAddress =
          nextAddresses.find((entry) => entry.type === "home") || nextAddresses[0] || null;

        updates.place = preferredAddress?.value ?? null;
        updates.address_line1 = preferredAddress?.addressLine1 ?? null;
        updates.address_line2 = preferredAddress?.addressLine2 ?? null;
        updates.address_city = preferredAddress?.addressCity ?? null;
        updates.address_postal_code = preferredAddress?.addressPostalCode ?? null;
        updates.address_state = preferredAddress?.addressState ?? null;
        updates.address_state_code = preferredAddress?.addressStateCode ?? null;
        updates.address_country = preferredAddress?.addressCountry ?? null;
        updates.address_country_code = preferredAddress?.addressCountryCode ?? null;
        updates.address_granularity = preferredAddress?.addressGranularity ?? "address";
        updates.address_formatted = preferredAddress?.addressFormatted ?? null;
        updates.address_geocode_source = preferredAddress?.addressGeocodeSource ?? null;
      }

      const socialMediaUpdates: Array<{
        platform: Parameters<typeof upsertContactSocialMedia>[3];
        handle: string | null | undefined;
      }> = [];

      if (body.linkedin !== undefined) {
        socialMediaUpdates.push({ platform: "linkedin", handle: body.linkedin });
      }
      if (body.instagram !== undefined) {
        socialMediaUpdates.push({ platform: "instagram", handle: body.instagram });
      }
      if (body.whatsapp !== undefined) {
        socialMediaUpdates.push({ platform: "whatsapp", handle: body.whatsapp });
      }
      if (body.facebook !== undefined) {
        socialMediaUpdates.push({ platform: "facebook", handle: body.facebook });
      }
      if (body.website !== undefined) {
        socialMediaUpdates.push({ platform: "website", handle: body.website });
      }
      if (body.signal !== undefined) {
        socialMediaUpdates.push({ platform: "signal", handle: body.signal });
      }

      updates.updated_at = new Date().toISOString();

      const { data: updatedContact, error } = await client
        .from("people")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!updatedContact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      try {
        if (hasLatitudeField || hasLongitudeField) {
          const { error: locationError } = await client.rpc("set_person_location", {
            p_person_id: id,
            p_user_id: user.id,
            p_latitude: nextLatitude ?? null,
            p_longitude: nextLongitude ?? null,
          });

          if (locationError) {
            return reply.status(500).send({ error: locationError.message });
          }
        }

        if (nextPhones !== undefined) {
          request.log.info(
            {
              route: "PATCH /contacts/:id",
              personId: id,
              addresses: nextAddresses?.map((entry) => ({
                type: entry.type,
                value: entry.value,
                latitude: entry.latitude,
                longitude: entry.longitude,
              })),
            },
            "Upserting contact channels",
          );
        }

        // Run all replace operations in parallel — they operate on independent tables
        const parallelOps: Promise<void>[] = [];

        if (nextPhones !== undefined) {
          parallelOps.push(replaceContactPhones(client, user.id, id, nextPhones));
        }
        if (nextEmails !== undefined) {
          parallelOps.push(replaceContactEmails(client, user.id, id, nextEmails));
        }
        if (nextAddresses !== undefined) {
          parallelOps.push(replaceContactAddresses(client, user.id, id, nextAddresses));
        }
        if (socialMediaUpdates.length > 0) {
          parallelOps.push(
            Promise.all(
              socialMediaUpdates.map((entry) =>
                upsertContactSocialMedia(client, user.id, id, entry.platform, entry.handle),
              ),
            ).then(() => undefined),
          );
        }

        if (parallelOps.length > 0) {
          await Promise.all(parallelOps);
        }
      } catch (channelError) {
        const message =
          channelError instanceof Error ? channelError.message : "Unknown channel error";
        return reply.status(500).send({ error: message });
      }

      return { message: "Contact updated successfully" };
    },
  );

  /**
   * POST /api/contacts/:id/photo - Upload contact photo
   */
  fastify.post(
    "/:id/photo",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: contactId } = request.params;

      // Get uploaded file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      // Validate file
      const { validateImageUpload, validateImageMagicBytes } = await import("../../lib/config.js");
      const validation = validateImageUpload({ type: data.mimetype, size: 0 }); // Size checked by multipart limits
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.error });
      }

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upload to storage
      const buffer = await data.toBuffer();

      if (!validateImageMagicBytes(buffer)) {
        return reply
          .status(400)
          .send({ error: "File content does not match a valid image format" });
      }
      const fileName = `${user.id}/${contactId}.jpg`;

      const { error: uploadError } = await client.storage.from("avatars").upload(fileName, buffer, {
        contentType: data.mimetype,
        upsert: true,
      });

      if (uploadError) {
        return reply.status(500).send({ error: "Failed to upload photo" });
      }

      // Touch updated_at so the avatar URL includes a fresh cache-busting timestamp
      await client
        .from("people")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", user.id);

      const avatarUrl = buildContactAvatarUrl(client, user.id, contactId);
      const cacheBustedUrl = avatarUrl
        ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
        : avatarUrl;

      return { success: true, avatarUrl: cacheBustedUrl };
    },
  );

  /**
   * DELETE /api/contacts/:id/photo - Delete contact photo
   */
  fastify.delete(
    "/:id/photo",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: contactId } = request.params;

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Delete from storage
      const fileName = `${user.id}/${contactId}.jpg`;
      await client.storage.from("avatars").remove([fileName]);

      // Touch updated_at so the avatar URL cache is invalidated on next fetch
      await client
        .from("people")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", user.id);

      return { success: true };
    },
  );

  /**
   * GET /api/contacts/:id/vcard - Export contact as vCard file
   */
  fastify.get(
    "/:id/vcard",
    {
      schema: {
        params: UuidParam,
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query as any);
      const { id } = request.params;

      // Fetch contact
      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      let contactWithChannels: Contact;
      try {
        const [enrichedContact] = await attachContactExtras(client, user.id, [contact], {
          addresses: true,
          avatarOptions: avatarOpts,
        });
        contactWithChannels = enrichedContact as Contact;
      } catch (channelError) {
        fastify.log.error(
          { channelError },
          "Failed to attach contact channels/social media for vCard export",
        );
        contactWithChannels = withEmptySocialMedia(
          withEmptyChannels([contact]),
        )[0] as unknown as Contact;
      }

      let exportImportantDates: Array<{
        type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
        date: string;
      }> = [];
      let exportCategories: string[] = [];

      try {
        const [{ data: importantDates }, { data: peopleTags }] = await Promise.all([
          client
            .from("people_important_dates")
            .select("type, date")
            .eq("person_id", id)
            .eq("user_id", user.id),
          client.from("people_tags").select("tag_id").eq("person_id", id).eq("user_id", user.id),
        ]);

        exportImportantDates = (importantDates ?? [])
          .map((entry) => ({
            type: entry.type,
            date: entry.date,
          }))
          .filter(
            (
              entry,
            ): entry is {
              type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
              date: string;
            } =>
              IMPORTANT_DATE_TYPES.includes(entry.type as ImportantDateType) &&
              typeof entry.date === "string" &&
              entry.date.trim().length > 0,
          );

        const tagIds = Array.from(
          new Set((peopleTags ?? []).map((entry) => entry.tag_id).filter(Boolean)),
        );

        if (tagIds.length > 0) {
          const { data: tags } = await client
            .from("tags")
            .select("label")
            .eq("user_id", user.id)
            .in("id", tagIds);

          exportCategories = Array.from(
            new Set(
              (tags ?? []).map((entry) => entry.label).filter((label): label is string => !!label),
            ),
          );
        }
      } catch (extrasError) {
        fastify.log.warn({ extrasError }, "Failed to fetch important dates/tags for vCard export");
      }

      // Generate vCard
      let vcard: string;
      try {
        vcard = await generateVCard(contactWithChannels, {
          importantDates: exportImportantDates,
          categories: exportCategories,
        });
      } catch (vcardError) {
        fastify.log.error({ vcardError }, "Failed to generate vCard");
        return reply.status(500).send({ error: "Failed to generate vCard" });
      }

      // Create filename
      const firstName = contact.firstName || "contact";
      const lastName = contact.lastName || "";
      const filename = lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;

      // Set response headers for file download
      reply.header("Content-Type", "text/vcard; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);

      return vcard;
    },
  );

  /**
   * POST /api/contacts/:id/linkedin-data - Upsert scraped LinkedIn work history
   */
  fastify.post(
    "/:id/linkedin-data",
    { schema: { params: UuidParam, body: LinkedInDataBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof LinkedInDataBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const { workHistory = [] } = request.body;

      request.log.info(
        { personId, userId: user.id, workHistoryCount: workHistory.length, workHistory },
        "[linkedin-data] POST received",
      );

      // Verify the person belongs to the authenticated user
      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upsert people_linkedin to get the parent row id + update sync timestamp
      const { data: linkedinRow, error: linkedinUpsertError } = await client
        .from("people_linkedin")
        .upsert(
          { user_id: user.id, person_id: personId, updated_at: new Date().toISOString() },
          { onConflict: "user_id,person_id" },
        )
        .select("id")
        .single();

      if (linkedinUpsertError || !linkedinRow) {
        return reply.status(500).send({ error: "Failed to upsert LinkedIn profile" });
      }

      // Delete existing work history, then insert the new set
      const { error: deleteError } = await client
        .from("people_work_history")
        .delete()
        .eq("people_linkedin_id", linkedinRow.id)
        .eq("user_id", user.id);

      if (deleteError) {
        return reply.status(500).send({ error: deleteError.message });
      }

      if (workHistory.length > 0) {
        const rows = workHistory.map((entry) => ({
          user_id: user.id,
          people_linkedin_id: linkedinRow.id,
          company_name: entry.companyName,
          company_linkedin_id: entry.companyLinkedinId ?? null,
          title: entry.title ?? null,
          start_date: entry.startDate ?? null,
          end_date: entry.endDate ?? null,
          employment_type: entry.employmentType ?? null,
          location: entry.location ?? null,
        }));

        request.log.info({ rows }, "[linkedin-data] Inserting rows");

        const { error: insertError } = await client.from("people_work_history").insert(rows);

        if (insertError) {
          request.log.error({ insertError }, "[linkedin-data] Insert failed");
          return reply.status(500).send({ error: insertError.message });
        }
      }

      request.log.info({ personId, count: workHistory.length }, "[linkedin-data] Upsert complete");
      return reply.status(200).send({ success: true, count: workHistory.length });
    },
  );

  /**
   * POST /api/contacts/:id/enrich - Update a contact with scraped LinkedIn data.
   *
   * Work history, education, bio, and name are **overwritten** so the user can
   * intentionally refresh stale data.  Avatar, headline, and location are only
   * filled when the contact doesn't already have them (fill-if-missing).
   */
  fastify.post(
    "/:id/enrich",
    { schema: { params: UuidParam, body: EnrichContactBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof EnrichContactBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const {
        firstName,
        middleName,
        lastName,
        profileImageUrl,
        headline,
        place,
        linkedinBio,
        workHistory,
        educationHistory,
      } = request.body;

      request.log.info(
        {
          personId,
          userId: user.id,
          workHistoryCount: workHistory?.length ?? 0,
          educationCount: educationHistory?.length ?? 0,
        },
        "[enrich] POST received",
      );

      // Verify the person belongs to the authenticated user & fetch current values
      // (needed for fill-if-missing logic on headline, place)
      const { data: person, error: personError } = await client
        .from("people")
        .select("id, headline, place")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upload logos in parallel (used when inserting work/edu rows)
      const logoMap = await uploadAllLinkedInLogos(client, user.id, workHistory, educationHistory);

      // Fill-if-missing: only upload contact photo when avatar storage object is absent
      if (profileImageUrl) {
        const { data: existingFiles } = await client.storage
          .from("avatars")
          .list(user.id, { search: `${personId}.jpg`, limit: 1 });
        const hasAvatar = (existingFiles ?? []).some((f) => f.name === `${personId}.jpg`);
        if (!hasAvatar) {
          await updateContactPhoto(client, personId, user.id, profileImageUrl);
        }
      }

      // Force-update scalar fields (name always overwrites)
      const fieldUpdates: Record<string, any> = {};
      if (firstName !== undefined)
        fieldUpdates.first_name = cleanPersonName(firstName) || undefined;
      if (middleName !== undefined) fieldUpdates.middle_name = cleanPersonName(middleName) || null;
      if (lastName !== undefined) fieldUpdates.last_name = cleanPersonName(lastName) || null;

      // Fill-if-missing: headline
      if (headline && !person.headline) {
        fieldUpdates.headline = headline;
      }

      // Fill-if-missing: place / location
      if (place && !person.place) {
        fieldUpdates.place = place;
        try {
          const result = await cachedGeocodeLinkedInPlace(place);
          if (result) {
            const { geo, timezone: tz } = result;
            if (geo.formattedLabel) fieldUpdates.place = geo.formattedLabel;
            fieldUpdates.location = geo.locationEwkt;
            if (geo.city) fieldUpdates.address_city = geo.city;
            if (geo.state) fieldUpdates.address_state = geo.state;
            if (geo.stateCode) fieldUpdates.address_state_code = geo.stateCode;
            if (geo.country) fieldUpdates.address_country = geo.country;
            if (geo.countryCode) fieldUpdates.address_country_code = geo.countryCode;
            if (geo.formattedLabel) fieldUpdates.address_formatted = geo.formattedLabel;
            fieldUpdates.address_granularity = "city";
            fieldUpdates.address_geocode_source = "mapy.com";

            if (tz) fieldUpdates.timezone = tz;
          }
        } catch (err) {
          request.log.error({ err }, "[enrich] Geocode failed, continuing without coordinates");
        }
      }

      if (Object.keys(fieldUpdates).length > 0) {
        fieldUpdates.updated_at = new Date().toISOString();
        await client.from("people").update(fieldUpdates).eq("id", personId);
      }

      // Upsert people_linkedin row (bio + sync timestamp)
      const { data: linkedinRow, error: linkedinUpsertError } = await client
        .from("people_linkedin")
        .upsert(
          {
            user_id: user.id,
            person_id: personId,
            bio: linkedinBio ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,person_id" },
        )
        .select("id")
        .single();

      if (linkedinUpsertError || !linkedinRow) {
        request.log.error({ linkedinUpsertError }, "[enrich] Failed to upsert people_linkedin");
        return reply.status(500).send({ error: "Failed to save LinkedIn profile data" });
      }

      const peopleLinkedinId = linkedinRow.id;

      // Replace work history atomically (delete + insert in one transaction)
      if (workHistory && workHistory.length > 0) {
        const rows = workHistory.map((entry: ScrapedWorkHistoryEntry) => ({
          company_name: entry.companyName,
          company_linkedin_id: entry.companyLinkedinId ?? null,
          title: entry.title ?? null,
          description: entry.description ?? null,
          start_date: toPostgresDate(entry.startDate),
          end_date: toPostgresDate(entry.endDate),
          employment_type: entry.employmentType ?? null,
          location: entry.location ?? null,
        }));
        const { error: whError } = await client.rpc("replace_work_history", {
          p_people_linkedin_id: peopleLinkedinId,
          p_user_id: user.id,
          p_rows: rows,
        });
        if (whError) {
          request.log.error({ whError }, "[enrich] Failed to replace work history");
        }
      }

      // Replace education history atomically (delete + insert in one transaction)
      if (educationHistory && educationHistory.length > 0) {
        const rows = educationHistory.map((entry: ScrapedEducationEntry) => ({
          school_name: entry.schoolName,
          school_linkedin_id: entry.schoolLinkedinId ?? null,
          degree: entry.degree ?? null,
          description: entry.description ?? null,
          start_date: toPostgresDate(entry.startDate),
          end_date: toPostgresDate(entry.endDate),
        }));
        const { error: ehError } = await client.rpc("replace_education_history", {
          p_people_linkedin_id: peopleLinkedinId,
          p_user_id: user.id,
          p_rows: rows,
        });
        if (ehError) {
          request.log.error({ ehError }, "[enrich] Failed to replace education history");
        }
      }

      request.log.info({ personId }, "[enrich] Enrichment complete");
      return reply.status(200).send({ success: true });
    },
  );

  /**
   * GET /api/contacts/:id/linkedin-data - Get work history and education for a person
   */
  fastify.get(
    "/:id/linkedin-data",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      // Fetch the people_linkedin row (may not exist if never enriched)
      const { data: linkedinRow } = await client
        .from("people_linkedin")
        .select("id, bio, updated_at")
        .eq("person_id", personId)
        .eq("user_id", user.id)
        .maybeSingle();

      // No people_linkedin row → return empty data with null syncedAt
      if (!linkedinRow) {
        return { linkedinBio: null, syncedAt: null, workHistory: [], education: [] };
      }

      const [workHistoryResult, educationResult] = await Promise.all([
        client
          .from("people_work_history")
          .select("*")
          .eq("user_id", user.id)
          .eq("people_linkedin_id", linkedinRow.id)
          .order("start_date", { ascending: false }),
        client
          .from("people_education_history")
          .select("*")
          .eq("user_id", user.id)
          .eq("people_linkedin_id", linkedinRow.id)
          .order("start_date", { ascending: false }),
      ]);

      // Sort: active (null end_date) first, then finished — both groups ordered by
      // start_date DESC. DB can't express (end_date IS NULL) DESC as a primary sort
      // key via PostgREST, so we apply the two-group ordering in JS.
      const sortByActiveFirst = <T extends { end_date: string | null; start_date: string | null }>(
        rows: T[],
      ): T[] =>
        rows.sort((a, b) => {
          const aActive = a.end_date === null;
          const bActive = b.end_date === null;
          if (aActive !== bActive) return aActive ? -1 : 1;
          // Same group: most recent start_date first
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return a.start_date > b.start_date ? -1 : 1;
        });

      if (workHistoryResult.error) {
        return reply.status(500).send({ error: workHistoryResult.error.message });
      }
      if (educationResult.error) {
        return reply.status(500).send({ error: educationResult.error.message });
      }

      return {
        linkedinBio: linkedinRow.bio ?? null,
        syncedAt: linkedinRow.updated_at ?? null,
        workHistory: sortByActiveFirst(workHistoryResult.data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          peopleLinkedinId: row.people_linkedin_id,
          companyName: row.company_name,
          companyLinkedinUrl: row.company_linkedin_id
            ? `https://www.linkedin.com/company/${row.company_linkedin_id}/`
            : null,
          companyLogoUrl: row.company_linkedin_id
            ? client.storage
                .from("linkedin_logos")
                .getPublicUrl(`${user.id}/${row.company_linkedin_id}.jpg`).data.publicUrl
            : null,
          title: row.title,
          description: row.description,
          startDate: row.start_date,
          endDate: row.end_date,
          employmentType: row.employment_type,
          location: row.location,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        education: sortByActiveFirst(educationResult.data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          peopleLinkedinId: row.people_linkedin_id,
          schoolName: row.school_name,
          schoolLinkedinUrl: row.school_linkedin_id
            ? `https://www.linkedin.com/school/${row.school_linkedin_id}/`
            : null,
          schoolLogoUrl: row.school_linkedin_id
            ? client.storage
                .from("linkedin_logos")
                .getPublicUrl(`${user.id}/${row.school_linkedin_id}.jpg`).data.publicUrl
            : null,
          degree: row.degree,
          description: row.description,
          startDate: row.start_date,
          endDate: row.end_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    },
  );

  // ===========================================================================
  // ENRICH QUEUE ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/contacts/enrich-queue/eligible-count
   * Count people with a LinkedIn handle but no people_linkedin record (never synced).
   * Uses the get_linkedin_enrich_eligible RPC for a single efficient join.
   */
  fastify.get(
    "/enrich-queue/eligible-count",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { client, user } = getAuth(request);

      const { data, error } = await client.rpc("get_linkedin_enrich_eligible", {
        p_user_id: user.id,
      });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { count: (data || []).length };
    },
  );

  /**
   * GET /api/contacts/enrich-queue/status
   * Returns counts of queue items grouped by status.
   * Used for resume detection on page load.
   */
  fastify.get("/enrich-queue/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);

    const { data, error } = await client
      .from("linkedin_enrich_queue")
      .select("status")
      .eq("user_id", user.id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    const counts = { pending: 0, completed: 0, failed: 0 };
    for (const row of data || []) {
      if (row.status === "pending" || row.status === "processing") {
        counts.pending++;
      } else if (row.status === "completed") {
        counts.completed++;
      } else if (row.status === "failed") {
        counts.failed++;
      }
    }

    return counts;
  });

  /**
   * POST /api/contacts/enrich-queue/init
   * Initialize a new enrichment run.
   *
   * When `personId` is provided in the body, queues only that single contact.
   * Otherwise queues all eligible contacts (those with a LinkedIn handle but
   * no people_linkedin record yet).
   *
   * 1. Deletes all existing queue rows for the user (clears previous run).
   * 2. Finds eligible contacts (all or just one).
   * 3. Bulk-inserts them as status='pending'.
   * 4. Returns totalEligible.
   *
   * Idempotent — safe to call multiple times.
   */
  fastify.post(
    "/enrich-queue/init",
    {
      schema: {
        body: Type.Optional(
          Type.Object({
            personId: Type.Optional(Type.String()),
          }),
        ),
      },
    },
    async (
      request: FastifyRequest<{ Body?: { personId?: string } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const personId = (request.body as { personId?: string } | undefined)?.personId;

      // Clear any leftover rows from a previous run.
      await client.from("linkedin_enrich_queue").delete().eq("user_id", user.id);

      if (personId) {
        // Single-person mode: verify the contact belongs to this user, then queue just them.
        const { data: person, error: personError } = await client
          .from("people")
          .select("id")
          .eq("id", personId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (personError) {
          return reply.status(500).send({ error: personError.message });
        }

        if (!person) {
          return reply.status(404).send({ error: "Contact not found" });
        }

        const { error: insertError } = await client.from("linkedin_enrich_queue").insert({
          user_id: user.id,
          person_id: personId,
          status: "pending" as const,
        });

        if (insertError) {
          return reply.status(500).send({ error: insertError.message });
        }

        return { totalEligible: 1 };
      }

      // Batch mode: find all eligible contacts via the efficient RPC join.
      const { data: eligible, error: rpcError } = await client.rpc(
        "get_linkedin_enrich_eligible",
        {
          p_user_id: user.id,
        },
      );

      if (rpcError) {
        return reply.status(500).send({ error: rpcError.message });
      }

      const rows = eligible || [];
      const totalEligible = rows.length;

      if (totalEligible === 0) {
        return { totalEligible: 0 };
      }

      // Bulk-insert all eligible contacts as pending queue items.
      const queueRows = rows.map((r: { person_id: string }) => ({
        user_id: user.id,
        person_id: r.person_id,
        status: "pending" as const,
      }));

      const { error: insertError } = await client.from("linkedin_enrich_queue").insert(queueRows);

      if (insertError) {
        return reply.status(500).send({ error: insertError.message });
      }

      return { totalEligible };
    },
  );

  /**
   * GET /api/contacts/enrich-queue/next-batch
   * Returns the next batch of pending queue items (up to 50).
   *
   * No request body — the queue status IS the exclude list.
   * Joins with people_social_media (for handle) and people (for names).
   */
  fastify.get("/enrich-queue/next-batch", async (request: FastifyRequest, reply: FastifyReply) => {
    const BATCH_LIMIT = 50;
    const { client, user } = getAuth(request);

    // Fetch next pending queue items.
    const { data: queueItems, error: queueError } = await client
      .from("linkedin_enrich_queue")
      .select("id, person_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (queueError) {
      return reply.status(500).send({ error: queueError.message });
    }

    const items = queueItems || [];
    if (items.length === 0) {
      return { items: [] };
    }

    const personIds = items.map((i) => i.person_id);

    // Fetch handles and names in parallel.
    const [socialMediaRes, namesRes] = await Promise.all([
      client
        .from("people_social_media")
        .select("person_id, handle")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .in("person_id", personIds),
      client
        .from("people")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .in("id", personIds),
    ]);

    const handleMap = new Map(
      (socialMediaRes.data || []).map((sm) => [sm.person_id, sm.handle as string]),
    );
    const nameMap = new Map(
      (namesRes.data || []).map((p) => [
        p.id,
        { firstName: p.first_name ?? null, lastName: p.last_name ?? null },
      ]),
    );

    return {
      items: items.map((item) => ({
        queueItemId: item.id,
        personId: item.person_id,
        linkedinHandle: handleMap.get(item.person_id) ?? null,
        firstName: nameMap.get(item.person_id)?.firstName ?? null,
        lastName: nameMap.get(item.person_id)?.lastName ?? null,
      })),
    };
  });

  /**
   * PATCH /api/contacts/enrich-queue/:id
   * Update queue item status to completed or failed.
   */
  fastify.patch(
    "/enrich-queue/:id",
    {
      schema: {
        params: UuidParam,
        body: Type.Object({
          status: Type.Union([Type.Literal("completed"), Type.Literal("failed")]),
          errorMessage: Type.Optional(NullableString),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: { status: "completed" | "failed"; errorMessage?: string | null };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const { status, errorMessage } = request.body;

      const { error } = await client
        .from("linkedin_enrich_queue")
        .update({
          status,
          error_message: errorMessage ?? null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { success: true };
    },
  );

  /**
   * DELETE /api/contacts/enrich-queue
   * Delete remaining pending queue items (cancel path).
   * Completed/failed rows are preserved and cleaned up by the next init call.
   */
  fastify.delete("/enrich-queue", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);

    const { error } = await client.from("linkedin_enrich_queue").delete().eq("user_id", user.id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { success: true };
  });
}
