import { z } from "zod";
import { contactSchema } from "#entities/contact.js";
import { makePaginatedListResponseSchema } from "#entities/_shared.js";
import {
  EXAMPLE_DECLINE_MERGE_RECOMMENDATION_RESPONSE,
  EXAMPLE_MERGE_CONTACTS_RESPONSE,
  EXAMPLE_MERGE_RECOMMENDATIONS_RESPONSE,
  EXAMPLE_REFRESH_MERGE_RECOMMENDATIONS_RESPONSE,
} from "#openapi/fixtures/schema-examples.js";
import { EXAMPLE_MERGE_CONTACTS_REQUEST } from "#openapi/fixtures/requests.js";

export const mergeConflictChoiceSchema = z.enum(["left", "right"]);

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
]);

export const mergeRecommendationReasonSchema = z.enum(["fullName", "email", "phone"]);

export const mergeRecommendationSchema = z.object({
  id: z.string(),
  leftPerson: contactSchema,
  rightPerson: contactSchema,
  score: z.number(),
  reasons: z.array(mergeRecommendationReasonSchema),
});

export const mergeContactsRequestSchema = z.object({
  leftPersonId: z.string(),
  rightPersonId: z.string(),
  conflictResolutions: z.partialRecord(mergeConflictFieldSchema, mergeConflictChoiceSchema).optional(),
}).meta({ example: EXAMPLE_MERGE_CONTACTS_REQUEST });

export const mergeContactsResponseSchema = z
  .object({
    personId: z.string(),
    userId: z.string(),
    mergedIntoPersonId: z.string(),
    mergedFromPersonId: z.string(),
    contact: contactSchema.nullable(),
  })
  .meta({ example: EXAMPLE_MERGE_CONTACTS_RESPONSE });

export const mergeRecommendationsResponseSchema = makePaginatedListResponseSchema(
  "recommendations",
  mergeRecommendationSchema,
).meta({ example: EXAMPLE_MERGE_RECOMMENDATIONS_RESPONSE });

export const declineMergeRecommendationResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .meta({ example: EXAMPLE_DECLINE_MERGE_RECOMMENDATION_RESPONSE });

export const refreshMergeRecommendationsResponseSchema = z
  .object({
    success: z.boolean(),
    recommendationsCount: z.number(),
    recommendations: z.array(mergeRecommendationSchema),
  })
  .meta({ example: EXAMPLE_REFRESH_MERGE_RECOMMENDATIONS_RESPONSE });

export type MergeConflictChoice = z.infer<typeof mergeConflictChoiceSchema>;
export type MergeConflictField = z.infer<typeof mergeConflictFieldSchema>;
export type MergeRecommendationReason = z.infer<typeof mergeRecommendationReasonSchema>;
export type MergeRecommendation = z.infer<typeof mergeRecommendationSchema>;
export type MergeContactsRequest = z.infer<typeof mergeContactsRequestSchema>;
export type MergeContactsResponse = z.infer<typeof mergeContactsResponseSchema>;
export type MergeRecommendationsResponse = z.infer<typeof mergeRecommendationsResponseSchema>;
export type DeclineMergeRecommendationResponse = z.infer<
  typeof declineMergeRecommendationResponseSchema
>;
export type RefreshMergeRecommendationsResponse = z.infer<
  typeof refreshMergeRecommendationsResponseSchema
>;
