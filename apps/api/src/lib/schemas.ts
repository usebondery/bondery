/**
 * Shared TypeBox schema fragments used across multiple route files.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { AvatarTransformOptions } from "@bondery/types";

// ── Reusable TypeBox helpers ─────────────────────────────────────────────────

/** Nullable string: `string | null` */
export const NullableString = Type.Union([Type.String(), Type.Null()]);

/** Nullable number: `number | null` */
export const NullableNumber = Type.Union([Type.Number(), Type.Null()]);

// ── Shared type aliases ──────────────────────────────────────────────────────

/** Minimal contact reference — used across channels, addresses, enrichment, social-media */
export type ContactWithId = { id: string; updatedAt?: string | null };

/** File received from a multipart upload */
export type UploadFile = {
  fileName: string;
  content: Buffer;
};

// ── Supabase select fragments ────────────────────────────────────────────────

/** Contact fields selection query for Supabase */
export const CONTACT_SELECT = `
  id,
  userId:user_id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  headline,
  location,
  notes,
  notesUpdatedAt:notes_updated_at,
  lastInteraction:last_interaction,
  createdAt:created_at,
  myself,
  language,
  timezone,
  gisPoint:gis_point,
  latitude,
  longitude,
  updatedAt:updated_at
`;

/** Group fields selection query for Supabase */
export const GROUP_SELECT = `
  id,
  userId:user_id,
  label,
  emoji,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

/** Tag fields selection query for Supabase */
export const TAG_SELECT = `
  id,
  userId:user_id,
  label,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

// ── Schema fragments ─────────────────────────────────────────────────────────

/** UUID path parameter (e.g. `:id`) */
export const UuidParam = Type.Object({
  id: Type.String({ format: "uuid" }),
});
export type UuidParamType = Static<typeof UuidParam>;

/** Bulk ID body: `{ ids: string[] }` with at least one element */
export const IdsBody = Type.Object({
  ids: Type.Array(Type.String(), { minItems: 1 }),
});
export type IdsBodyType = Static<typeof IdsBody>;

/** Optional pagination query params (limit: 1–200, default 50; offset: ≥0, default 0) */
export const PaginationQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});
export type PaginationQueryType = Static<typeof PaginationQuery>;

// ── Avatar transform query params ────────────────────────────────────────────

/** TypeBox enum for avatar quality presets */
export const AvatarQualityEnum = Type.Union([
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
]);

/** TypeBox enum for avatar size presets */
export const AvatarSizeEnum = Type.Union([
  Type.Literal("small"),
  Type.Literal("medium"),
  Type.Literal("large"),
]);

/** Optional avatar transform query parameters — spread into route query schemas */
export const AvatarTransformQuery = Type.Object({
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});
export type AvatarTransformQueryType = Static<typeof AvatarTransformQuery>;

/**
 * Extracts avatar transform options from a parsed query object.
 * Returns `undefined` when neither param is present (no-op for callers).
 */
export function extractAvatarOptions(
  query: Partial<AvatarTransformQueryType>,
): AvatarTransformOptions | undefined {
  const { avatarQuality, avatarSize } = query;
  if (!avatarQuality && !avatarSize) return undefined;
  return {
    ...(avatarQuality ? { quality: avatarQuality } : {}),
    ...(avatarSize ? { size: avatarSize } : {}),
  };
}

/** Contacts filter used by delete-by-filter and group membership operations */
export const ContactsFilterSchema = Type.Object({
  q: Type.Optional(Type.String()),
});

/** Sort order enum used by contact and group listing */
export const ContactSortEnum = Type.Union([
  Type.Literal("nameAsc"),
  Type.Literal("nameDesc"),
  Type.Literal("surnameAsc"),
  Type.Literal("surnameDesc"),
  Type.Literal("interactionAsc"),
  Type.Literal("interactionDesc"),
]);

/** Standard error response shape */
export const ErrorResponse = Type.Object({
  error: Type.String(),
});

/** Sub-schema: phone entry for contact update */
export const PhoneEntrySchema = Type.Object({
  prefix: Type.Optional(Type.String()),
  value: Type.String(),
  type: Type.Optional(Type.String()),
  preferred: Type.Optional(Type.Boolean()),
});

/** Sub-schema: email entry for contact update */
export const EmailEntrySchema = Type.Object({
  value: Type.String(),
  type: Type.Optional(Type.String()),
  preferred: Type.Optional(Type.Boolean()),
});

/** Sub-schema: address entry for contact update */
export const ContactAddressEntrySchema = Type.Object({
  type: Type.Optional(Type.String()),
  value: Type.Optional(Type.String()),
  addressLine1: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressLine2: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressCity: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressPostalCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressState: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressStateCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressCountry: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressCountryCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressGranularity: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressFormatted: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  addressGeocodeSource: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  latitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});

/** Sub-schema: scraped work history entry */
export const ScrapedWorkHistoryEntrySchema = Type.Object({
  companyName: Type.String(),
  companyLinkedinId: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  startDate: Type.Optional(Type.String()),
  endDate: Type.Optional(Type.String()),
  employmentType: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
});

/** Sub-schema: scraped education entry */
export const ScrapedEducationEntrySchema = Type.Object({
  schoolName: Type.String(),
  schoolLinkedinId: Type.Optional(Type.String()),
  degree: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  startDate: Type.Optional(Type.String()),
  endDate: Type.Optional(Type.String()),
});

/** Sub-schema: important date for PUT /:id/important-dates */
export const ImportantDateInputSchema = Type.Object({
  id: Type.Optional(Type.String()),
  type: Type.String(),
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  note: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  notifyDaysBefore: Type.Optional(
    Type.Union([Type.Literal(1), Type.Literal(3), Type.Literal(7), Type.Null()]),
  ),
});
