import { z } from "zod";
import { makePaginatedListResponseSchema } from "../_shared/schema.js";
import { contactSchema } from "../contact/schema.js";
import type {
  DeclineMergeRecommendationResponse,
  MergeConflictChoice,
  MergeConflictField,
  MergeContactsRequest,
  MergeContactsResponse,
  MergeRecommendation,
  MergeRecommendationReason,
  MergeRecommendationsCountResponse,
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
} from "./types.js";

export const mergeConflictChoiceSchema = z.enum([
  "left",
  "right",
]) satisfies z.ZodType<MergeConflictChoice>;

export const mergeConflictFieldSchema = z.enum([
  "firstName",
  "middleName",
  "lastName",
  "avatar",
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
]) satisfies z.ZodType<MergeConflictField>;

export const mergeRecommendationReasonSchema = z.enum([
  "fullName",
  "email",
  "phone",
]) satisfies z.ZodType<MergeRecommendationReason>;

export const mergeRecommendationSchema = z.object({
  id: z.string(),
  leftPerson: contactSchema,
  reasons: z.array(mergeRecommendationReasonSchema),
  rightPerson: contactSchema,
  score: z.number(),
}) satisfies z.ZodType<MergeRecommendation>;

export const mergeContactsRequestSchema = z.object({
  conflictResolutions: z
    .partialRecord(mergeConflictFieldSchema, mergeConflictChoiceSchema)
    .optional(),
  leftPersonId: z.string(),
  rightPersonId: z.string(),
}) satisfies z.ZodType<MergeContactsRequest>;

export const mergeContactsResponseSchema = z.object({
  contact: contactSchema.nullable(),
  mergedFromPersonId: z.string(),
  mergedIntoPersonId: z.string(),
  personId: z.string(),
  userId: z.string(),
}) satisfies z.ZodType<MergeContactsResponse>;

export const mergeRecommendationsResponseSchema = makePaginatedListResponseSchema(
  "recommendations",
  mergeRecommendationSchema,
) satisfies z.ZodType<MergeRecommendationsResponse>;

export const declineMergeRecommendationResponseSchema = z.object({
  success: z.boolean(),
}) satisfies z.ZodType<DeclineMergeRecommendationResponse>;

export const mergeRecommendationsCountResponseSchema = z.object({
  activeCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<MergeRecommendationsCountResponse>;

export const refreshMergeRecommendationsResponseSchema = z.object({
  recommendations: z.array(mergeRecommendationSchema),
  recommendationsCount: z.number(),
  success: z.boolean(),
}) satisfies z.ZodType<RefreshMergeRecommendationsResponse>;
