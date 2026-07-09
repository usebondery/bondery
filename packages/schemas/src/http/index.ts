import { z } from "zod";
import { contactIdSchema, EXAMPLE_CONTACT_ID } from "#contact-id.js";
import {
  contactAddressConfidenceSchema,
  contactAddressGeocodeSourceSchema,
  contactAddressGranularitySchema,
  contactAddressTypeSchema,
} from "#entities/address.js";
import { avatarQualitySchema, avatarSizeSchema } from "#entities/api.js";
import { contactSortOrderSchema } from "#entities/contact.js";
import { replaceImportantDatesSchema } from "#entities/important-date.js";

/** Inline request examples — do not import the OpenAPI requests fixture module (SSR init cycle risk). */
const EXAMPLE_IDS_REQUEST = { ids: [EXAMPLE_CONTACT_ID] } as const;
const EXAMPLE_DATE = "2026-01-15";
const EXAMPLE_REPLACE_IMPORTANT_DATES_REQUEST = {
  dates: [
    {
      date: EXAMPLE_DATE,
      note: null,
      notifyDaysBefore: 7,
      type: "birthday" as const,
    },
  ],
} as const;

/** Inline geocode wire examples — do not import schema-examples (fixture graph). */
const EXAMPLE_GEOCODE_SUGGEST_RESPONSE = {
  addresses: [
    {
      addressCity: "London",
      addressCountry: "United Kingdom",
      addressCountryCode: "GB",
      addressFormatted: "10 Downing Street, London SW1A 2AA, UK",
      addressGeocodeSource: "mapy.com" as const,
      addressGranularity: "address" as const,
      addressLine1: "10 Downing Street",
      addressLine2: null,
      addressPostalCode: "SW1A 2AA",
      addressState: null,
      addressStateCode: null,
      geocodeConfidence: "verified" as const,
      label: null,
      latitude: 51.5034,
      longitude: -0.1276,
      timezone: "Europe/London",
      type: "home" as const,
      value: "10 Downing Street, London",
    },
  ],
} as const;

const EXAMPLE_GEOCODE_TIMEZONE_RESPONSE = {
  timezone: "Europe/London",
} as const;

export * from "#http/ids.js";

/** UUID path parameter (e.g. `:id`). */
export const uuidParamSchema = z.object({
  id: contactIdSchema,
});

/** Bulk ID body: `{ ids: string[] }` with at least one element. */
export const idsRequestBodySchema = z
  .object({
    ids: z.array(contactIdSchema).min(1),
  })
  .meta({ example: EXAMPLE_IDS_REQUEST });

/** Optional pagination query params (limit: 1–200, default 50; offset: ≥0, default 0). */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/** Optional search query param. */
export const searchQuerySchema = z.object({
  search: z.string().optional(),
});

/** Optional avatar transform query parameters. */
export const avatarTransformQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
});

/** People list query — pagination, search, sort, keep-in-touch filter, and avatar transforms. */
export const peopleListQuerySchema = paginationQuerySchema.extend(searchQuerySchema.shape).extend({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  keepInTouch: z.coerce.boolean().optional(),
  sort: contactSortOrderSchema.optional(),
});

/** GET /api/geocode/suggest query string. */
export const geocodeSuggestQuerySchema = z.object({
  mode: z.enum(["address", "place"]).optional().default("address"),
  search: z.string().trim().min(3).max(200),
});

/** GET /api/geocode/timezone query string. */
export const geocodeTimezoneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/** Tags/groups list query with optional preview limit and avatar transforms. */
export const previewListQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  previewLimit: z.string().optional(),
});

/** Interactions list query — pagination plus avatar transforms and optional contact filter. */
export const interactionsListQuerySchema = paginationQuerySchema
  .extend(avatarTransformQuerySchema.shape)
  .extend({
    contactId: contactIdSchema.optional(),
  });

/** Chat session messages list query. */
export const chatMessagesQuerySchema = paginationQuerySchema.extend({
  sort: z.literal("createdAtAsc").optional(),
});

export const chatSessionIdParamSchema = z.object({
  sessionId: z.string(),
});

/** Merge recommendations list query. */
export const mergeRecommendationsQuerySchema = paginationQuerySchema.extend({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  declined: z.string().optional(),
});

/** Sync pull long-poll query. */
export const syncPullQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  since: z.coerce.number().int().nonnegative(),
  waitMs: z.coerce.number().int().min(0).max(30_000).optional(),
});

/** Contact + relationship path params. */
export const contactRelationshipIdParamSchema = z.object({
  id: contactIdSchema,
  relationshipId: contactIdSchema,
});

/** PUT /api/contacts/:id/important-dates body. */
export const importantDatesReplaceBodySchema = z
  .object({
    dates: replaceImportantDatesSchema,
  })
  .meta({ example: EXAMPLE_REPLACE_IMPORTANT_DATES_REQUEST });

/** Wire geocode response schemas (no Zod transforms — safe for Fastify serializers). */
const geocodeSuggestAddressWireSchema = z.object({
  addressCity: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressFormatted: z.string().nullable(),
  addressGeocodeSource: contactAddressGeocodeSourceSchema.nullable(),
  addressGranularity: contactAddressGranularitySchema,
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  geocodeConfidence: contactAddressConfidenceSchema.nullable(),
  label: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  timezone: z.string().nullable(),
  type: contactAddressTypeSchema,
  value: z.string(),
});

export const geocodeSuggestResponseWireSchema = z
  .object({
    addresses: z.array(geocodeSuggestAddressWireSchema),
  })
  .meta({ example: EXAMPLE_GEOCODE_SUGGEST_RESPONSE });

export const geocodeTimezoneResponseWireSchema = z
  .object({
    timezone: z.string().nullable(),
  })
  .meta({ example: EXAMPLE_GEOCODE_TIMEZONE_RESPONSE });

export type UuidParam = z.infer<typeof uuidParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;
export type AvatarTransformQuery = z.infer<typeof avatarTransformQuerySchema>;
