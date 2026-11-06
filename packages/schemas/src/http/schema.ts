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
  MergeAvatarIdentityQuery,
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
  id: contactIdSchema.describe("Contact identifier"),
}) satisfies z.ZodType<UuidParam>;

/** Bulk ID body: `{ ids: string[] }` with at least one element. */
export const idsRequestBodySchema = z
  .object({
    ids: z.array(contactIdSchema).min(1),
  })
  .meta({ example: EXAMPLE_IDS_REQUEST });

/** Optional pagination query params (limit: 1–200, default 50; offset: ≥0, default 0). */
export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe("Maximum number of records to return. Defaults to 50, maximum 200."),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of records to skip before returning results. Defaults to 0."),
}) satisfies z.ZodType<PaginationQuery>;

/** Optional search query param. */
export const searchQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .describe("Case-insensitive text search across the primary display fields."),
}) satisfies z.ZodType<SearchQuery>;

/** Optional avatar transform query parameters. */
export const avatarTransformQuerySchema = z.object({
  avatarQuality: avatarQualitySchema
    .optional()
    .describe("Image quality for contact avatars. Higher quality returns larger files."),
  avatarSize: avatarSizeSchema
    .optional()
    .describe("Rendered avatar size. Use `small` for dense lists and `large` for detail views."),
}) satisfies z.ZodType<AvatarTransformQuery>;

/** Public query name for the people-list tag filter. */
export const TAG_IDS_QUERY_PARAM = "tag_ids" as const;

/** Maximum number of tag ids accepted by `tag_ids` on the people list query. */
const MAX_TAG_FILTER_IDS = 20;

/**
 * One comma-separated value: `?tag_ids=a,b`.
 * A repeated `tag_ids` key is also accepted. Trims each entry and drops empties.
 */
const tagIdsQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const rawEntries = Array.isArray(value) ? value : [value];
  const parts = rawEntries.flatMap((entry) =>
    typeof entry === "string" ? entry.split(",") : [entry],
  );
  const cleaned = parts
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}, z.array(z.string().uuid()).max(MAX_TAG_FILTER_IDS).optional());

/** People list query — pagination, search, sort, keep-in-touch filter, and avatar transforms. */
export const peopleListQuerySchema = z.object({
  avatarQuality: avatarQualitySchema
    .optional()
    .describe("Image quality for contact avatars. Higher quality returns larger files."),
  avatarSize: avatarSizeSchema
    .optional()
    .describe("Rendered avatar size. Use `small` for dense lists and `large` for detail views."),
  keepInTouch: z.coerce
    .boolean()
    .optional()
    .describe("Return only contacts whose keep-in-touch reminder is due."),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe("Maximum number of records to return. Defaults to 50, maximum 200."),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of records to skip before returning results. Defaults to 0."),
  search: z
    .string()
    .optional()
    .describe("Case-insensitive text search across name, email, and phone."),
  sort: contactSortOrderSchema.optional().describe("Result ordering. Defaults to name ascending."),
  [TAG_IDS_QUERY_PARAM]: tagIdsQuerySchema.describe(
    "Filter to contacts that carry any of these tag ids. Separate ids with commas.",
  ),
}) satisfies z.ZodType<PeopleListQuery>;

/** GET /api/geocode/suggest query string. */
export const geocodeSuggestQuerySchema = z.object({
  mode: z
    .enum(["address", "place"])
    .optional()
    .default("address")
    .describe("Search mode: `address` for postal addresses, `place` for points of interest"),
  search: z.string().trim().min(3).max(200).describe("Text to look up, at least 3 characters"),
}) satisfies z.ZodType<GeocodeSuggestQuery>;

/** GET /api/geocode/timezone query string. */
export const geocodeTimezoneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).describe("Latitude in decimal degrees"),
  lon: z.coerce.number().min(-180).max(180).describe("Longitude in decimal degrees"),
}) satisfies z.ZodType<GeocodeTimezoneQuery>;

/** Tags/groups list query with optional preview limit and avatar transforms. */
export const previewListQuerySchema = z.object({
  avatarQuality: avatarQualitySchema
    .optional()
    .describe("Image quality for contact avatars. Higher quality returns larger files."),
  avatarSize: avatarSizeSchema
    .optional()
    .describe("Rendered avatar size. Use `small` for dense lists and `large` for detail views."),
  previewLimit: z.string().optional().describe("Number of preview members to include on each row"),
}) satisfies z.ZodType<PreviewListQuery>;

/** RFC 3339 datetime with timezone offset. Avoid Zod `iso.datetime` (Turbopack SSR TDZ). */
const ISO_DATETIME_OFFSET_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const interactionInstantSchema = z.string().regex(ISO_DATETIME_OFFSET_PATTERN, {
  error: "Expected ISO 8601 datetime with timezone offset",
});

/** Interactions list query — pagination, text search, inclusive date range, and avatar transforms. */
export const interactionsListQuerySchema = z
  .object({
    avatarQuality: avatarQualitySchema.optional().describe("Image quality for participant avatars"),
    avatarSize: avatarSizeSchema.optional().describe("Rendered avatar size for participants"),
    contactId: contactIdSchema
      .optional()
      .describe("Return only interactions that include this contact"),
    end_date: interactionInstantSchema
      .optional()
      .describe("Inclusive upper bound on the interaction date, as ISO 8601 with offset"),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe("Maximum number of records to return. Defaults to 50, maximum 200."),
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe("Number of records to skip before returning results. Defaults to 0."),
    search: z
      .string()
      .trim()
      .optional()
      .describe("Case-insensitive search across interaction title and description."),
    start_date: interactionInstantSchema
      .optional()
      .describe("Inclusive lower bound on the interaction date, as ISO 8601 with offset"),
  })
  .superRefine((value, ctx) => {
    if (!value.start_date || !value.end_date) {
      return;
    }
    if (Date.parse(value.start_date) > Date.parse(value.end_date)) {
      ctx.addIssue({
        code: "custom",
        message: "start_date must not be after end_date",
        path: ["start_date"],
      });
    }
  }) satisfies z.ZodType<InteractionsListQuery>;

/** Chat session messages list query. */
export const chatMessagesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe("Maximum number of messages to return. Defaults to 50, maximum 200."),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of messages to skip before returning results. Defaults to 0."),
  sort: z
    .literal("createdAtAsc")
    .optional()
    .describe("Message ordering. Oldest first is the only supported order."),
}) satisfies z.ZodType<ChatMessagesQuery>;

export const chatSessionIdParamSchema = z.object({
  sessionId: z.string().describe("Chat session identifier"),
}) satisfies z.ZodType<ChatSessionIdParam>;

/** Merge recommendations list query. */
export const mergeRecommendationsQuerySchema = z.object({
  avatarQuality: avatarQualitySchema
    .optional()
    .describe("Image quality for contact avatars. Higher quality returns larger files."),
  avatarSize: avatarSizeSchema
    .optional()
    .describe("Rendered avatar size. Use `small` for dense lists and `large` for detail views."),
  declined: z.string().optional().describe("Set to `1` to include declined recommendations"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe("Maximum number of records to return. Defaults to 50, maximum 200."),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Number of records to skip before returning results. Defaults to 0."),
}) satisfies z.ZodType<MergeRecommendationsQuery>;

/** GET /api/contacts/merge/avatars query. */
export const mergeAvatarIdentityQuerySchema = z.object({
  leftPersonId: contactIdSchema.describe("First contact to compare"),
  rightPersonId: contactIdSchema.describe("Second contact to compare"),
}) satisfies z.ZodType<MergeAvatarIdentityQuery>;

/** Sync pull long-poll query. */
export const syncPullQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of changes to return in this batch"),
  since: z.coerce
    .number()
    .int()
    .nonnegative()
    .describe("Last server sequence the client has applied"),
  waitMs: z.coerce
    .number()
    .int()
    .min(0)
    .max(30_000)
    .optional()
    .describe("Long-poll window in milliseconds. Zero returns immediately."),
}) satisfies z.ZodType<SyncPullQuery>;

/** Contact + relationship path params. */
export const contactRelationshipIdParamSchema = z.object({
  id: contactIdSchema.describe("Contact identifier"),
  relationshipId: contactIdSchema.describe("Relationship identifier"),
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
