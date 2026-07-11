import { z } from "zod";
import { makePaginatedListResponseSchema } from "#entities/_shared.js";
import { contactSchema } from "#entities/contact.js";

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
  reasons: z.array(mergeRecommendationReasonSchema),
  rightPerson: contactSchema,
  score: z.number(),
});

export const mergeContactsRequestSchema = z.object({
  conflictResolutions: z
    .partialRecord(mergeConflictFieldSchema, mergeConflictChoiceSchema)
    .optional(),
  leftPersonId: z.string(),
  rightPersonId: z.string(),
});

export const mergeContactsResponseSchema = z.object({
  contact: contactSchema.nullable(),
  mergedFromPersonId: z.string(),
  mergedIntoPersonId: z.string(),
  personId: z.string(),
  userId: z.string(),
});

export const mergeRecommendationsResponseSchema = makePaginatedListResponseSchema(
  "recommendations",
  mergeRecommendationSchema,
);

export const declineMergeRecommendationResponseSchema = z.object({
  success: z.boolean(),
});

export const mergeRecommendationsCountResponseSchema = z.object({
  activeCount: z.number().int().nonnegative(),
});

export const refreshMergeRecommendationsResponseSchema = z.object({
  recommendations: z.array(mergeRecommendationSchema),
  recommendationsCount: z.number(),
  success: z.boolean(),
});

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
export type MergeRecommendationsCountResponse = z.infer<
  typeof mergeRecommendationsCountResponseSchema
>;
