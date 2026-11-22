import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  declineMergeRecommendationResponseSchema,
  mergeAvatarIdentityResponseSchema,
  mergeConflictChoiceSchema,
  mergeConflictFieldSchema,
  mergeContactsRequestSchema,
  mergeContactsResponseSchema,
  mergeRecommendationReasonSchema,
  mergeRecommendationSchema,
  mergeRecommendationsCountResponseSchema,
  mergeRecommendationsResponseSchema,
  refreshMergeRecommendationsResponseSchema,
} from "./schema.js";
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

export type _MergeConflictChoice = Assert<
  IsEqual<MergeConflictChoice, z.infer<typeof mergeConflictChoiceSchema>>
>;
export type _MergeConflictField = Assert<
  IsEqual<MergeConflictField, z.infer<typeof mergeConflictFieldSchema>>
>;
export type _MergeRecommendationReason = Assert<
  IsEqual<MergeRecommendationReason, z.infer<typeof mergeRecommendationReasonSchema>>
>;
export type _MergeRecommendation = Assert<
  IsEqual<MergeRecommendation, z.infer<typeof mergeRecommendationSchema>>
>;
export type _MergeContactsRequest = Assert<
  IsEqual<MergeContactsRequest, z.infer<typeof mergeContactsRequestSchema>>
>;
export type _MergeContactsResponse = Assert<
  IsEqual<MergeContactsResponse, z.infer<typeof mergeContactsResponseSchema>>
>;
export type _MergeRecommendationsResponse = Assert<
  IsEqual<MergeRecommendationsResponse, z.infer<typeof mergeRecommendationsResponseSchema>>
>;
export type _MergeAvatarIdentityResponse = Assert<
  IsEqual<MergeAvatarIdentityResponse, z.infer<typeof mergeAvatarIdentityResponseSchema>>
>;
export type _DeclineMergeRecommendationResponse = Assert<
  IsEqual<
    DeclineMergeRecommendationResponse,
    z.infer<typeof declineMergeRecommendationResponseSchema>
  >
>;
export type _MergeRecommendationsCountResponse = Assert<
  IsEqual<
    MergeRecommendationsCountResponse,
    z.infer<typeof mergeRecommendationsCountResponseSchema>
  >
>;
export type _RefreshMergeRecommendationsResponse = Assert<
  IsEqual<
    RefreshMergeRecommendationsResponse,
    z.infer<typeof refreshMergeRecommendationsResponseSchema>
  >
>;
