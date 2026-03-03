/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "../lib/supabase.js";
import { generateVCard } from "../lib/vcard.js";
import {
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "../lib/contact-channels.js";
import { parseAddressEntries, replaceContactAddresses } from "../lib/contact-addresses.js";
import { findPersonIdBySocialMedia, upsertContactSocialMedia } from "../lib/social-media.js";
import { attachContactExtras, type FullContactExtras } from "../lib/contact-enrichment.js";
import { GROUP_SELECT } from "./groups.js";
import { TAG_SELECT } from "./tags.js";
import type {
  Contact,
  ContactAddressEntry,
  CreateContactInput,
  UpdateContactInput,
  DeleteContactsRequest,
  EmailEntry,
  CreateContactRelationshipInput,
  PhoneEntry,
  UpdateContactRelationshipInput,
  RelationshipType,
  ImportantEventType,
  UpcomingReminder,
  Database,
  SocialMediaPlatform,
  MergeContactsRequest,
  MergeContactsResponse,
  MergeConflictField,
  MergeConflictChoice,
  MergeRecommendationReason,
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
} from "@bondery/types";

// Contact fields selection query for Supabase
export const CONTACT_SELECT = `
  id,
  userId:user_id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  headline,
  place,
  notes,
  avatar,
  lastInteraction:last_interaction,
  createdAt:created_at,
  myself,
  language,
  timezone,
  location,
  latitude,
  longitude,
  addressLine1:address_line1,
  addressLine2:address_line2,
  addressCity:address_city,
  addressPostalCode:address_postal_code,
  addressState:address_state,
  addressStateCode:address_state_code,
  addressCountry:address_country,
  addressCountryCode:address_country_code,
  addressGranularity:address_granularity,
  addressFormatted:address_formatted,
  addressGeocodeSource:address_geocode_source
`;

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
];

const IMPORTANT_EVENT_SELECT = `
  id,
  user_id,
  person_id,
  event_type,
  event_date,
  note,
  notify_on,
  notify_days_before,
  created_at,
  updated_at
`;

const IMPORTANT_EVENT_TYPES: ImportantEventType[] = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
];

const IMPORTANT_EVENT_NOTIFY_VALUES = [1, 3, 7] as const;

const LOOKUP_SOCIAL_PLATFORMS: SocialMediaPlatform[] = ["instagram", "linkedin", "facebook"];

const MERGEABLE_SCALAR_FIELDS = {
  firstName: "first_name",
  middleName: "middle_name",
  lastName: "last_name",
  avatar: "avatar",
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
  Extract<MergeConflictField, "phones" | "emails" | "importantEvents">
> = ["phones", "emails", "importantEvents"];

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

function normalizeImportantEventSet(
  rows:
    | Array<{
        event_type: string;
        event_date: string;
        note: string | null;
        notify_days_before: number | null;
      }>
    | null
    | undefined,
): string[] {
  return (rows || [])
    .map((event) => {
      const eventType = String(event.event_type || "")
        .trim()
        .toLowerCase();
      const eventDate = String(event.event_date || "")
        .trim()
        .slice(0, 10);
      const note = String(event.note || "").trim();
      const notifyDaysBefore =
        typeof event.notify_days_before === "number" ? String(event.notify_days_before) : "";
      if (!eventType || !eventDate) {
        return "";
      }

      return `${eventType}|${eventDate}|${note}|${notifyDaysBefore}`;
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

function isImportantEventType(value: string): value is ImportantEventType {
  return IMPORTANT_EVENT_TYPES.includes(value as ImportantEventType);
}

function isValidImportantEventNotifyDaysBefore(value: unknown): value is 1 | 3 | 7 | null {
  return value === null || IMPORTANT_EVENT_NOTIFY_VALUES.includes(value as 1 | 3 | 7);
}

function toContactPreview(person: {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar: string | null;
}) {
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: person.avatar,
  };
}

function toImportantEvent(event: {
  id: string;
  user_id: string;
  person_id: string;
  event_type: string;
  event_date: string;
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
    eventType: event.event_type,
    eventDate: event.event_date,
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

function deriveReminderDateKey(event: {
  event_date: string;
  notify_on: string | null;
  notify_days_before: number | null;
}): string | null {
  if (event.notify_on) {
    return toIsoDateKey(event.notify_on);
  }

  if (event.notify_days_before === null) {
    return null;
  }

  const eventDateKey = toIsoDateKey(event.event_date);
  if (!eventDateKey) {
    return null;
  }

  const [year, month, day] = eventDateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const notificationDate = new Date(Date.UTC(year, month - 1, day));
  notificationDate.setUTCDate(notificationDate.getUTCDate() - event.notify_days_before);

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

export async function contactRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/contacts - List all contacts
   */
  fastify.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          offset?: string;
          q?: string;
          sort?:
            | "nameAsc"
            | "nameDesc"
            | "surnameAsc"
            | "surnameDesc"
            | "interactionAsc"
            | "interactionDesc";
        };
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const query = request.query || {};

      const parsedLimit = Number.parseInt(query.limit || "", 10);
      const parsedOffset = Number.parseInt(query.offset || "", 10);
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
      const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
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

      if (limit !== null) {
        peopleQuery = peopleQuery.range(offset, offset + limit - 1);
      }

      const { data: contacts, error, count } = await peopleQuery;

      if (error) {
        console.log("Error fetching contacts:", error);
        return reply.status(500).send({ error: error.message });
      }

      let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
      try {
        enrichedContacts = await attachContactExtras(client, user.id, contacts || [], {
          addresses: true,
        });
      } catch (enrichError) {
        fastify.log.error({ enrichError }, "Failed to attach contact extras for contact list");
        enrichedContacts = withEmptySocialMedia(withEmptyChannels(contacts || []));
      }

      return {
        contacts: enrichedContacts,
        totalCount: typeof count === "number" ? count : enrichedContacts.length,
        stats: {
          totalContacts: totalContactsCount || 0,
          thisMonthInteractions: monthInteractionsCount || 0,
          newContactsThisYear: newContactsYearCount || 0,
        },
      };
    },
  );

  /**
   * GET /api/contacts/important-events/upcoming - List upcoming reminders with notification configured
   */
  fastify.get(
    "/important-events/upcoming",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;

      const today = new Date();
      const startDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      const endDate = new Date(startDate);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);

      const startDateIso = startDate.toISOString().slice(0, 10);
      const endDateIso = endDate.toISOString().slice(0, 10);

      const { data: rows, error } = await client
        .from("people_important_events")
        .select(`${IMPORTANT_EVENT_SELECT}, person:people!inner(id, first_name, last_name, avatar)`)
        .eq("user_id", user.id)
        .or("notify_days_before.not.is.null,notify_on.not.is.null")
        .order("event_date", { ascending: true });

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
            event: toImportantEvent(row),
            person: toContactPreview(person),
            notificationSent: Boolean(notificationSentAt),
            notificationSentAt,
          };
        })
        .filter((value): value is UpcomingReminder => Boolean(value))
        .sort((a, b) => {
          const aReminderDate = deriveReminderDateKey({
            event_date: a.event.eventDate,
            notify_on: a.event.notifyOn,
            notify_days_before: a.event.notifyDaysBefore,
          });
          const bReminderDate = deriveReminderDateKey({
            event_date: b.event.eventDate,
            notify_on: b.event.notifyOn,
            notify_days_before: b.event.notifyDaysBefore,
          });

          if (aReminderDate && bReminderDate && aReminderDate !== bReminderDate) {
            return aReminderDate.localeCompare(bReminderDate);
          }

          return a.event.eventDate.localeCompare(b.event.eventDate);
        });

      return { reminders };
    },
  );

  /**
   * POST /api/contacts - Create a new contact
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: CreateContactInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      // Validation
      if (!body.firstName || body.firstName.trim().length === 0) {
        return reply.status(400).send({ error: "First name is required" });
      }

      if (!body.lastName || body.lastName.trim().length === 0) {
        return reply.status(400).send({ error: "Last name is required" });
      }

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
    async (request: FastifyRequest<{ Body: DeleteContactsRequest }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      let uniqueIds: string[];

      // Resolve the list of IDs to delete — either provided directly or via filter.
      if ("ids" in body && Array.isArray(body.ids)) {
        if (body.ids.length === 0) {
          return reply.status(400).send({
            error: "Invalid request body. 'ids' must be a non-empty array.",
          });
        }
        uniqueIds = Array.from(new Set(body.ids.filter(Boolean)));
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

      const { error } = await client
        .from("people")
        .delete()
        .eq("user_id", user.id)
        .in("id", uniqueIds);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Contacts deleted successfully", deletedCount: uniqueIds.length };
    },
  );

  /**
   * DELETE /api/contacts/:id - Delete a single contact
   */
  fastify.delete(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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

      return { message: "Contact deleted successfully" };
    },
  );

  /**
   * GET /api/contacts/merge-recommendations - List merge recommendations
   */
  fastify.get(
    "/merge-recommendations",
    async (
      request: FastifyRequest<{ Querystring: { declined?: string | boolean } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;

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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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
    async (request: FastifyRequest<{ Body: MergeContactsRequest }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const leftPersonId = request.body?.leftPersonId?.trim();
      const rightPersonId = request.body?.rightPersonId?.trim();
      const conflictResolutions = request.body?.conflictResolutions || {};

      if (!leftPersonId || !rightPersonId) {
        return reply.status(400).send({ error: "leftPersonId and rightPersonId are required" });
      }

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
        { data: leftImportantEvents, error: leftImportantEventsError },
        { data: rightImportantEvents, error: rightImportantEventsError },
      ] = await Promise.all([
        client
          .from("people_important_events")
          .select("event_type, event_date, note, notify_days_before")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("created_at", { ascending: true }),
        client
          .from("people_important_events")
          .select("event_type, event_date, note, notify_days_before")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("created_at", { ascending: true }),
      ]);

      if (leftImportantEventsError || rightImportantEventsError) {
        return reply
          .status(500)
          .send({ error: leftImportantEventsError?.message || rightImportantEventsError?.message });
      }

      const normalizedLeftImportantEvents = (leftImportantEvents || []).map((event) => ({
        event_type: event.event_type,
        event_date: event.event_date,
        note: event.note,
        notify_days_before: event.notify_days_before,
      }));

      const normalizedRightImportantEvents = (rightImportantEvents || []).map((event) => ({
        event_type: event.event_type,
        event_date: event.event_date,
        note: event.note,
        notify_days_before: event.notify_days_before,
      }));

      const importantEventsEqual =
        JSON.stringify(normalizeImportantEventSet(normalizedLeftImportantEvents)) ===
        JSON.stringify(normalizeImportantEventSet(normalizedRightImportantEvents));

      let mergedImportantEvents = normalizedLeftImportantEvents;
      if (!normalizedLeftImportantEvents.length && normalizedRightImportantEvents.length) {
        mergedImportantEvents = normalizedRightImportantEvents;
      } else if (
        normalizedLeftImportantEvents.length &&
        normalizedRightImportantEvents.length &&
        !importantEventsEqual
      ) {
        const choice = resolveConflictChoice(conflictResolutions, "importantEvents");
        mergedImportantEvents =
          choice === "right" ? normalizedRightImportantEvents : normalizedLeftImportantEvents;
      }

      const { error: deleteLeftImportantEventsError } = await client
        .from("people_important_events")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", leftPersonId);

      if (deleteLeftImportantEventsError) {
        return reply.status(500).send({ error: deleteLeftImportantEventsError.message });
      }

      if (mergedImportantEvents.length > 0) {
        const { error: insertImportantEventsError } = await client
          .from("people_important_events")
          .insert(
            mergedImportantEvents.map((event) => ({
              user_id: user.id,
              person_id: leftPersonId,
              event_type: event.event_type,
              event_date: event.event_date,
              note: event.note,
              notify_days_before: event.notify_days_before,
            })),
          );

        if (insertImportantEventsError) {
          return reply.status(500).send({ error: insertImportantEventsError.message });
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
    async (
      request: FastifyRequest<{
        Querystring: {
          platform?: string;
          handle?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const platform = request.query.platform?.trim() ?? "";
      const handle = request.query.handle?.trim() ?? "";

      if (!platform || !handle || !isLookupPlatform(platform)) {
        return reply.status(400).send({ error: "Invalid platform or handle" });
      }

      const personId = await findPersonIdBySocialMedia(client, user.id, platform, handle);

      if (!personId) {
        return { exists: false };
      }

      const { data: person, error } = await client
        .from("people")
        .select("id, first_name, last_name, avatar")
        .eq("user_id", user.id)
        .eq("id", personId)
        .single();

      if (error || !person) {
        return reply.status(500).send({ error: error?.message ?? "Failed to find contact" });
      }

      return {
        exists: true,
        contact: {
          id: person.id,
          firstName: person.first_name,
          lastName: person.last_name,
          avatar: person.avatar,
        },
      };
    },
  );

  /**
   * GET /api/contacts/:id - Get a single contact
   */
  fastify.get(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id } = request.params;

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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
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
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { tagId: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId } = request.params;
      const { tagId } = request.body;

      if (!tagId) {
        return reply.status(400).send({ error: "tagId is required" });
      }

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
    async (
      request: FastifyRequest<{ Params: { id: string; tagId: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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
        .select("id, first_name, last_name, avatar")
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
            sourcePerson: toContactPreview(sourcePerson),
            targetPerson: toContactPreview(targetPerson),
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
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: CreateContactRelationshipInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: sourcePersonId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId?.trim();

      if (!normalizedRelatedPersonId || normalizedRelatedPersonId.length === 0) {
        return reply.status(400).send({ error: "Related person is required" });
      }

      if (!relationshipType || !isRelationshipType(relationshipType)) {
        return reply.status(400).send({ error: "Invalid relationship type" });
      }

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
    async (
      request: FastifyRequest<{
        Params: { id: string; relationshipId: string };
        Body: UpdateContactRelationshipInput;
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId, relationshipId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId?.trim();

      if (!normalizedRelatedPersonId || normalizedRelatedPersonId.length === 0) {
        return reply.status(400).send({ error: "Related person is required" });
      }

      if (!relationshipType || !isRelationshipType(relationshipType)) {
        return reply.status(400).send({ error: "Invalid relationship type" });
      }

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
    async (
      request: FastifyRequest<{ Params: { id: string; relationshipId: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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
   * GET /api/contacts/:id/important-events - Get normalized important events for a person
   */
  fastify.get(
    "/:id/important-events",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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
        .from("people_important_events")
        .select(IMPORTANT_EVENT_SELECT)
        .eq("user_id", user.id)
        .eq("person_id", personId)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
      }

      return {
        events: (rows || []).map(toImportantEvent),
      };
    },
  );

  /**
   * PUT /api/contacts/:id/important-events - Replace normalized important events for a person
   */
  fastify.put(
    "/:id/important-events",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          events: Array<{
            id?: string;
            eventType: ImportantEventType;
            eventDate: string;
            note?: string | null;
            notifyDaysBefore?: 1 | 3 | 7 | null;
          }>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId } = request.params;
      const events = request.body?.events;

      if (!Array.isArray(events)) {
        return reply.status(400).send({ error: "events must be an array" });
      }

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      for (const event of events) {
        if (!event?.eventType || !isImportantEventType(event.eventType)) {
          return reply.status(400).send({ error: "Invalid important event type" });
        }

        if (!event?.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(event.eventDate)) {
          return reply.status(400).send({ error: "eventDate must use YYYY-MM-DD format" });
        }

        if (!isValidImportantEventNotifyDaysBefore(event.notifyDaysBefore ?? null)) {
          return reply.status(400).send({ error: "Invalid notifyDaysBefore value" });
        }
      }

      const replaceRows = events.map((event) => ({
        id: event.id,
        user_id: user.id,
        person_id: personId,
        event_type: event.eventType,
        event_date: event.eventDate,
        note: event.note?.trim() ? event.note.trim() : null,
        notify_days_before: event.notifyDaysBefore ?? null,
      }));

      const { error: deleteError } = await client
        .from("people_important_events")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", personId);

      if (deleteError) {
        return reply.status(500).send({ error: deleteError.message });
      }

      if (replaceRows.length === 0) {
        return { events: [] };
      }

      const { data: insertedRows, error: insertError } = await client
        .from("people_important_events")
        .insert(replaceRows)
        .select(IMPORTANT_EVENT_SELECT)
        .order("created_at", { ascending: true });

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Duplicate important event" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return {
        events: (insertedRows || []).map(toImportantEvent),
      };
    },
  );

  /**
   * PATCH /api/contacts/:id - Update a contact
   */
  fastify.patch(
    "/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateContactInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.firstName !== undefined) {
        if (!body.firstName || body.firstName.trim().length === 0) {
          return reply.status(400).send({ error: "First name is required" });
        }
        updates.first_name = body.firstName;
      }
      if (body.middleName !== undefined) updates.middle_name = body.middleName;
      if (body.lastName !== undefined) updates.last_name = body.lastName;
      if (body.headline !== undefined) updates.headline = body.headline;
      if (body.place !== undefined) updates.place = body.place;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.avatar !== undefined) updates.avatar = body.avatar;
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: contactId } = request.params;

      // Get uploaded file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      // Validate file
      const { validateImageUpload } = await import("../lib/config.js");
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
      const fileName = `${user.id}/${contactId}.jpg`;

      const { error: uploadError } = await client.storage.from("avatars").upload(fileName, buffer, {
        contentType: data.mimetype,
        upsert: true,
      });

      if (uploadError) {
        return reply.status(500).send({ error: "Failed to upload photo" });
      }

      // Get public URL
      const { data: urlData } = client.storage.from("avatars").getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        return reply.status(500).send({ error: "Failed to get photo URL" });
      }

      // Add cache-busting parameter
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update contact
      const { error: updateError } = await client
        .from("people")
        .update({ avatar: avatarUrl })
        .eq("id", contactId);

      if (updateError) {
        return reply.status(500).send({ error: "Failed to update contact" });
      }

      return { success: true, avatarUrl };
    },
  );

  /**
   * DELETE /api/contacts/:id/photo - Delete contact photo
   */
  fastify.delete(
    "/:id/photo",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: contactId } = request.params;

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id, avatar")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Delete from storage
      const fileName = `${user.id}/${contactId}.jpg`;
      await client.storage.from("avatars").remove([fileName]);

      // Update contact
      await client.from("people").update({ avatar: null }).eq("id", contactId);

      return { success: true };
    },
  );

  /**
   * GET /api/contacts/:id/vcard - Export contact as vCard file
   */
  fastify.get(
    "/:id/vcard",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
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

      // Generate vCard
      let vcard: string;
      try {
        vcard = await generateVCard(contactWithChannels);
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
}
