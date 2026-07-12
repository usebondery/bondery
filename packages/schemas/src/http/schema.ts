import { z } from "zod";
import { contactIdSchema, EXAMPLE_CONTACT_ID } from "#contact-id/index.js";
import { contactAddressReadSchema } from "#entities/address/schema.js";
import { avatarQualitySchema, avatarSizeSchema } from "#entities/api/index.js";
import { contactSortOrderSchema } from "#entities/contact/index.js";
import { replaceImportantDatesSchema } from "#entities/important-date/index.js";
import type {
  AvatarTransformQuery,
  ChatMessagesQuery,
  ChatSessionIdParam,
  ContactRelationshipIdParam,
  GeocodeSuggestQuery,
  GeocodeSuggestResponseWire,
  GeocodeTimezoneQuery,
  GeocodeTimezoneResponseWire,
  ImportantDatesReplaceBody,
  InteractionsListQuery,
  MergeRecommendationsQuery,
  PaginationQuery,
  PeopleListQuery,
  PreviewListQuery,
  SearchQuery,
  SyncPullQuery,
  UuidParam,
} from "./types.js";

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

/** UUID path parameter (e.g. `:id`). */
export const uuidParamSchema = z.object({
  id: contactIdSchema,
}) satisfies z.ZodType<UuidParam>;

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
}) satisfies z.ZodType<PaginationQuery>;

/** Optional search query param. */
export const searchQuerySchema = z.object({
  search: z.string().optional(),
}) satisfies z.ZodType<SearchQuery>;

/** Optional avatar transform query parameters. */
export const avatarTransformQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
}) satisfies z.ZodType<AvatarTransformQuery>;

/** People list query — pagination, search, sort, keep-in-touch filter, and avatar transforms. */
export const peopleListQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  keepInTouch: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().optional(),
  sort: contactSortOrderSchema.optional(),
}) satisfies z.ZodType<PeopleListQuery>;

/** GET /api/geocode/suggest query string. */
export const geocodeSuggestQuerySchema = z.object({
  mode: z.enum(["address", "place"]).optional().default("address"),
  search: z.string().trim().min(3).max(200),
}) satisfies z.ZodType<GeocodeSuggestQuery>;

/** GET /api/geocode/timezone query string. */
export const geocodeTimezoneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
}) satisfies z.ZodType<GeocodeTimezoneQuery>;

/** Tags/groups list query with optional preview limit and avatar transforms. */
export const previewListQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  previewLimit: z.string().optional(),
}) satisfies z.ZodType<PreviewListQuery>;

/** Interactions list query — pagination plus avatar transforms and optional contact filter. */
export const interactionsListQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  contactId: contactIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}) satisfies z.ZodType<InteractionsListQuery>;

/** Chat session messages list query. */
export const chatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sort: z.literal("createdAtAsc").optional(),
}) satisfies z.ZodType<ChatMessagesQuery>;

export const chatSessionIdParamSchema = z.object({
  sessionId: z.string(),
}) satisfies z.ZodType<ChatSessionIdParam>;

/** Merge recommendations list query. */
export const mergeRecommendationsQuerySchema = z.object({
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
  declined: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
}) satisfies z.ZodType<MergeRecommendationsQuery>;

/** Sync pull long-poll query. */
export const syncPullQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  since: z.coerce.number().int().nonnegative(),
  waitMs: z.coerce.number().int().min(0).max(30_000).optional(),
}) satisfies z.ZodType<SyncPullQuery>;

/** Contact + relationship path params. */
export const contactRelationshipIdParamSchema = z.object({
  id: contactIdSchema,
  relationshipId: contactIdSchema,
}) satisfies z.ZodType<ContactRelationshipIdParam>;

/** PUT /api/contacts/:id/important-dates body. */
export const importantDatesReplaceBodySchema = z
  .object({
    dates: replaceImportantDatesSchema,
  })
  .meta({
    example: EXAMPLE_REPLACE_IMPORTANT_DATES_REQUEST,
  }) satisfies z.ZodType<ImportantDatesReplaceBody>;

/** Wire geocode response schemas (no Zod transforms — safe for Fastify serializers). */
export const geocodeSuggestResponseWireSchema = z
  .object({
    addresses: z.array(contactAddressReadSchema),
  })
  .meta({
    example: EXAMPLE_GEOCODE_SUGGEST_RESPONSE,
  }) satisfies z.ZodType<GeocodeSuggestResponseWire>;

export const geocodeTimezoneResponseWireSchema = z
  .object({
    timezone: z.string().nullable(),
  })
  .meta({
    example: EXAMPLE_GEOCODE_TIMEZONE_RESPONSE,
  }) satisfies z.ZodType<GeocodeTimezoneResponseWire>;
