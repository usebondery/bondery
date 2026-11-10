import { z } from "zod";
import { makePaginatedListResponseSchema } from "../_shared/schema.js";
import { contactSchema } from "../contact/schema.js";
import type {
  DeclineMergeRecommendationResponse,
  MergeAvatarIdentityResponse,
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
  id: z.string().describe("Recommendation identifier"),
  leftPerson: contactSchema.describe("First contact in the pair"),
  reasons: z
    .array(mergeRecommendationReasonSchema)
    .describe("Signals that caused this recommendation"),
  rightPerson: contactSchema.describe("Second contact in the pair"),
  score: z.number().describe("Confidence score for this recommendation"),
}) satisfies z.ZodType<MergeRecommendation>;

export const mergeContactsRequestSchema = z.object({
  conflictResolutions: z
    .partialRecord(mergeConflictFieldSchema, mergeConflictChoiceSchema)
    .optional()
    .describe("Field-level choices when the two contacts differ"),
  leftPersonId: z.string().describe("Contact to keep"),
  rightPersonId: z.string().describe("Contact to merge into the kept contact"),
}) satisfies z.ZodType<MergeContactsRequest>;

export const mergeContactsResponseSchema = z.object({
  contact: contactSchema.nullable().describe("Merged contact record"),
  mergedFromPersonId: z.string().describe("Contact identifier that was merged away"),
  mergedIntoPersonId: z.string().describe("Contact identifier that remains"),
  personId: z.string().describe("Contact identifier of the remaining contact"),
  userId: z.string().describe("Owner account identifier"),
}) satisfies z.ZodType<MergeContactsResponse>;

export const mergeRecommendationsResponseSchema = makePaginatedListResponseSchema(
  "recommendations",
  mergeRecommendationSchema,
) satisfies z.ZodType<MergeRecommendationsResponse>;

export const declineMergeRecommendationResponseSchema = z.object({
  success: z.boolean().describe("True when the recommendation was declined"),
}) satisfies z.ZodType<DeclineMergeRecommendationResponse>;

export const mergeAvatarIdentityResponseSchema = z.object({
  identical: z.boolean().describe("True when both contacts use the same avatar"),
}) satisfies z.ZodType<MergeAvatarIdentityResponse>;

export const mergeRecommendationsCountResponseSchema = z.object({
  activeCount: z.number().int().nonnegative().describe("Number of active merge recommendations"),
}) satisfies z.ZodType<MergeRecommendationsCountResponse>;

export const refreshMergeRecommendationsResponseSchema = z.object({
  recommendations: z
    .array(mergeRecommendationSchema)
    .describe("Merge recommendations after the refresh"),
  recommendationsCount: z.number().describe("Number of active merge recommendations"),
  success: z.boolean().describe("True when the refresh completed"),
}) satisfies z.ZodType<RefreshMergeRecommendationsResponse>;
