import { z } from "zod";
import { contactSchema } from "./contact";
import { makePaginatedListResponseSchema } from "./_shared";

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
});

export const mergeContactsResponseSchema = z.object({
  personId: z.string(),
  userId: z.string(),
  mergedIntoPersonId: z.string(),
  mergedFromPersonId: z.string(),
  contact: contactSchema.nullable(),
});

export const mergeRecommendationsResponseSchema = makePaginatedListResponseSchema(
  "recommendations",
  mergeRecommendationSchema,
);

export const declineMergeRecommendationResponseSchema = z.object({
  success: z.boolean(),
});

export const refreshMergeRecommendationsResponseSchema = z.object({
  success: z.boolean(),
  recommendationsCount: z.number(),
  recommendations: z.array(mergeRecommendationSchema),
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
