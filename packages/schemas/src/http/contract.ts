import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  avatarTransformQuerySchema,
  chatMessagesQuerySchema,
  chatSessionIdParamSchema,
  contactRelationshipIdParamSchema,
  geocodeSuggestQuerySchema,
  geocodeSuggestResponseWireSchema,
  geocodeTimezoneQuerySchema,
  geocodeTimezoneResponseWireSchema,
  importantDatesReplaceBodySchema,
  interactionsListQuerySchema,
  mergeAvatarIdentityQuerySchema,
  mergeRecommendationsQuerySchema,
  paginationQuerySchema,
  peopleListQuerySchema,
  previewListQuerySchema,
  searchQuerySchema,
  syncPullQuerySchema,
  uuidParamSchema,
} from "./schema.js";
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

export type _UuidParam = Assert<IsEqual<UuidParam, z.infer<typeof uuidParamSchema>>>;
export type _PaginationQuery = Assert<
  IsEqual<PaginationQuery, z.infer<typeof paginationQuerySchema>>
>;
export type _SearchQuery = Assert<IsEqual<SearchQuery, z.infer<typeof searchQuerySchema>>>;
export type _AvatarTransformQuery = Assert<
  IsEqual<AvatarTransformQuery, z.infer<typeof avatarTransformQuerySchema>>
>;
export type _PeopleListQuery = Assert<
  IsEqual<PeopleListQuery, z.infer<typeof peopleListQuerySchema>>
>;
export type _GeocodeSuggestQuery = Assert<
  IsEqual<GeocodeSuggestQuery, z.infer<typeof geocodeSuggestQuerySchema>>
>;
export type _GeocodeTimezoneQuery = Assert<
  IsEqual<GeocodeTimezoneQuery, z.infer<typeof geocodeTimezoneQuerySchema>>
>;
export type _PreviewListQuery = Assert<
  IsEqual<PreviewListQuery, z.infer<typeof previewListQuerySchema>>
>;
export type _InteractionsListQuery = Assert<
  IsEqual<InteractionsListQuery, z.infer<typeof interactionsListQuerySchema>>
>;
export type _ChatMessagesQuery = Assert<
  IsEqual<ChatMessagesQuery, z.infer<typeof chatMessagesQuerySchema>>
>;
export type _ChatSessionIdParam = Assert<
  IsEqual<ChatSessionIdParam, z.infer<typeof chatSessionIdParamSchema>>
>;
export type _MergeAvatarIdentityQuery = Assert<
  IsEqual<MergeAvatarIdentityQuery, z.infer<typeof mergeAvatarIdentityQuerySchema>>
>;
export type _MergeRecommendationsQuery = Assert<
  IsEqual<MergeRecommendationsQuery, z.infer<typeof mergeRecommendationsQuerySchema>>
>;
export type _SyncPullQuery = Assert<IsEqual<SyncPullQuery, z.infer<typeof syncPullQuerySchema>>>;
export type _ContactRelationshipIdParam = Assert<
  IsEqual<ContactRelationshipIdParam, z.infer<typeof contactRelationshipIdParamSchema>>
>;
export type _ImportantDatesReplaceBody = Assert<
  IsEqual<ImportantDatesReplaceBody, z.infer<typeof importantDatesReplaceBodySchema>>
>;
export type _GeocodeSuggestResponseWire = Assert<
  IsEqual<GeocodeSuggestResponseWire, z.infer<typeof geocodeSuggestResponseWireSchema>>
>;
export type _GeocodeTimezoneResponseWire = Assert<
  IsEqual<GeocodeTimezoneResponseWire, z.infer<typeof geocodeTimezoneResponseWireSchema>>
>;
