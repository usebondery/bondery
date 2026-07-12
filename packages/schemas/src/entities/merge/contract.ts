import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  declineMergeRecommendationResponseSchema,
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

type _MergeConflictChoice = Assert<
  IsEqual<MergeConflictChoice, z.infer<typeof mergeConflictChoiceSchema>>
>;
type _MergeConflictField = Assert<
  IsEqual<MergeConflictField, z.infer<typeof mergeConflictFieldSchema>>
>;
type _MergeRecommendationReason = Assert<
  IsEqual<MergeRecommendationReason, z.infer<typeof mergeRecommendationReasonSchema>>
>;
type _MergeRecommendation = Assert<
  IsEqual<MergeRecommendation, z.infer<typeof mergeRecommendationSchema>>
>;
type _MergeContactsRequest = Assert<
  IsEqual<MergeContactsRequest, z.infer<typeof mergeContactsRequestSchema>>
>;
type _MergeContactsResponse = Assert<
  IsEqual<MergeContactsResponse, z.infer<typeof mergeContactsResponseSchema>>
>;
type _MergeRecommendationsResponse = Assert<
  IsEqual<MergeRecommendationsResponse, z.infer<typeof mergeRecommendationsResponseSchema>>
>;
type _DeclineMergeRecommendationResponse = Assert<
  IsEqual<
    DeclineMergeRecommendationResponse,
    z.infer<typeof declineMergeRecommendationResponseSchema>
  >
>;
type _MergeRecommendationsCountResponse = Assert<
  IsEqual<
    MergeRecommendationsCountResponse,
    z.infer<typeof mergeRecommendationsCountResponseSchema>
  >
>;
type _RefreshMergeRecommendationsResponse = Assert<
  IsEqual<
    RefreshMergeRecommendationsResponse,
    z.infer<typeof refreshMergeRecommendationsResponseSchema>
  >
>;
