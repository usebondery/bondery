import { z } from "zod";
import { contactIdSchema } from "#contact-id/index.js";
import type { PaginationMeta } from "./types.js";

/** RFC 3339 datetime with timezone offset — avoids Zod `iso.datetime` (Turbopack SSR TDZ). */
const ISO_DATETIME_OFFSET_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const isoDateTimeSchema = z.string().regex(ISO_DATETIME_OFFSET_PATTERN, {
  message: "Expected ISO 8601 datetime with timezone offset",
});

export const idSchema = z.string().describe("Unique identifier");
export const userIdSchema = z.string().describe("Owner account identifier");
export const createdAtSchema = isoDateTimeSchema.describe(
  "Creation time as ISO 8601 with timezone offset",
);
export const updatedAtSchema = isoDateTimeSchema.describe(
  "Last update time as ISO 8601 with timezone offset",
);
export const nullableDateTimeSchema = createdAtSchema.nullable();

export const entityIdentitySchema = z.object({
  id: idSchema,
  userId: userIdSchema,
});

export const entityAuditSchema = z.object({
  createdAt: createdAtSchema,
  updatedAt: updatedAtSchema,
});

export const idsRequestSchema = z.object({
  ids: z.array(contactIdSchema).min(1).describe("Identifiers to operate on"),
});

export const messageSchema = z.string().describe("Human-readable result message");

export const messageResponseSchema = z.object({
  message: messageSchema,
});

export const personIdsSelectionSchema = z.object({
  personIds: z.array(contactIdSchema).min(1).describe("Contact identifiers to include"),
});

export const excludePersonIdsSchema = z
  .array(contactIdSchema)
  .optional()
  .describe("Contact identifiers to leave out");

export const paginationMetaSchema: z.ZodType<PaginationMeta> = z.object({
  hasMore: z.boolean().describe("True when more records exist after this page"),
  limit: z.number().int().positive().describe("Page size used for this response"),
  offset: z.number().int().nonnegative().describe("Number of records skipped"),
  search: z.string().nullable().describe("Search text applied to this response"),
  sort: z.string().nullable().describe("Sort order applied to this response"),
  totalCount: z.number().int().nonnegative().describe("Total records that match the query"),
});

export function labelFieldSchema(maxLength: number, fieldName = "Label") {
  return z
    .string()
    .trim()
    .min(1, { error: `${fieldName} is required` })
    .max(maxLength, {
      error: `${fieldName} must be at most ${maxLength} characters`,
    });
}

export function nullableTrimmedStringSchema(maxLength?: number) {
  return z.union([z.string(), z.null()]).transform((value, context) => {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    if (typeof maxLength === "number" && trimmed.length > maxLength) {
      context.addIssue({
        code: "custom",
        message: `Value must be at most ${maxLength} characters`,
      });
      return z.NEVER;
    }

    return trimmed || null;
  });
}

export function makeListResponseSchema<K extends string, S extends z.ZodTypeAny>(
  key: K,
  itemSchema: S,
) {
  return z.object({
    [key]: z.array(itemSchema),
    totalCount: z.number(),
  }) as z.ZodObject<Record<K, z.ZodArray<S>> & { totalCount: z.ZodNumber }>;
}

export function makePaginatedListResponseSchema<K extends string, S extends z.ZodTypeAny>(
  key: K,
  itemSchema: S,
) {
  return z.object({
    [key]: z.array(itemSchema),
    pagination: paginationMetaSchema,
  }) as z.ZodObject<Record<K, z.ZodArray<S>> & { pagination: typeof paginationMetaSchema }>;
}

export function makeCollectionResponseSchema<K extends string, S extends z.ZodTypeAny>(
  key: K,
  itemSchema: S,
) {
  return z.object({
    [key]: z.array(itemSchema),
  }) as z.ZodObject<Record<K, z.ZodArray<S>>>;
}

export function withCountAndPreviewSchema<
  S extends z.ZodObject<z.core.$ZodLooseShape>,
  P extends z.ZodTypeAny,
>(baseSchema: S, previewSchema: P) {
  return baseSchema.extend({
    contactCount: z.number(),
    previewContacts: z.array(previewSchema).optional(),
  });
}
