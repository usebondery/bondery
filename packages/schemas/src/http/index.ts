import { z } from "zod";
import { contactIdSchema } from "../contact-id.js";
import { avatarQualitySchema, avatarSizeSchema } from "../entities/api.js";
import { contactSortOrderSchema } from "../entities/contact.js";
import {
  contactAddressConfidenceSchema,
  contactAddressGeocodeSourceSchema,
  contactAddressGranularitySchema,
  contactAddressTypeSchema,
} from "../entities/address.js";
import { replaceImportantDatesSchema } from "../entities/important-date.js";

export * from "./ids.js";
export * from "./responses.js";

/** UUID path parameter (e.g. `:id`). */
export const uuidParamSchema = z.object({
  id: contactIdSchema,
});

/** Bulk ID body: `{ ids: string[] }` with at least one element. */
export const idsRequestBodySchema = z.object({
  ids: z.array(contactIdSchema).min(1),
});

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
export const peopleListQuerySchema = paginationQuerySchema
  .extend(searchQuerySchema.shape)
  .extend({
    sort: contactSortOrderSchema.optional(),
    keepInTouch: z.coerce.boolean().optional(),
    avatarQuality: avatarQualitySchema.optional(),
    avatarSize: avatarSizeSchema.optional(),
  });

/** GET /api/geocode/suggest query string. */
export const geocodeSuggestQuerySchema = z.object({
  search: z.string().trim().min(3).max(200),
  mode: z.enum(["address", "place"]).optional().default("address"),
});

/** GET /api/geocode/timezone query string. */
export const geocodeTimezoneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/** Tags/groups list query with optional preview limit and avatar transforms. */
export const previewListQuerySchema = z.object({
  previewLimit: z.string().optional(),
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
});

/** Interactions list query — pagination plus avatar transforms. */
export const interactionsListQuerySchema = paginationQuerySchema.extend(
  avatarTransformQuerySchema.shape,
);

/** Chat session messages list query. */
export const chatMessagesQuerySchema = paginationQuerySchema.extend({
  sort: z.literal("createdAtAsc").optional(),
});

export const chatSessionIdParamSchema = z.object({
  sessionId: z.string(),
});

/** Merge recommendations list query. */
export const mergeRecommendationsQuerySchema = paginationQuerySchema.extend({
  declined: z.string().optional(),
  avatarQuality: avatarQualitySchema.optional(),
  avatarSize: avatarSizeSchema.optional(),
});

/** Sync pull long-poll query. */
export const syncPullQuerySchema = z.object({
  since: z.coerce.number().int().nonnegative(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  waitMs: z.coerce.number().int().min(0).max(30_000).optional(),
});

/** Contact + relationship path params. */
export const contactRelationshipIdParamSchema = z.object({
  id: contactIdSchema,
  relationshipId: contactIdSchema,
});

/** PUT /api/contacts/:id/important-dates body. */
export const importantDatesReplaceBodySchema = z.object({
  dates: replaceImportantDatesSchema,
});

/** Wire geocode response schemas (no Zod transforms — safe for Fastify serializers). */
const geocodeSuggestAddressWireSchema = z.object({
  value: z.string(),
  type: contactAddressTypeSchema,
  label: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressGranularity: contactAddressGranularitySchema,
  addressFormatted: z.string().nullable(),
  addressGeocodeSource: contactAddressGeocodeSourceSchema.nullable(),
  geocodeConfidence: contactAddressConfidenceSchema.nullable(),
  timezone: z.string().nullable(),
});

export const geocodeSuggestResponseWireSchema = z.object({
  addresses: z.array(geocodeSuggestAddressWireSchema),
});

export const geocodeTimezoneResponseWireSchema = z.object({
  timezone: z.string().nullable(),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;
export type AvatarTransformQuery = z.infer<typeof avatarTransformQuerySchema>;
