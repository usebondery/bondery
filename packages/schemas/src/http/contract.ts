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
  MergeRecommendationsQuery,
  PaginationQuery,
  PeopleListQuery,
  PreviewListQuery,
  SearchQuery,
  SyncPullQuery,
  UuidParam,
} from "./types.js";

type _UuidParam = Assert<IsEqual<UuidParam, z.infer<typeof uuidParamSchema>>>;
type _PaginationQuery = Assert<IsEqual<PaginationQuery, z.infer<typeof paginationQuerySchema>>>;
type _SearchQuery = Assert<IsEqual<SearchQuery, z.infer<typeof searchQuerySchema>>>;
type _AvatarTransformQuery = Assert<
  IsEqual<AvatarTransformQuery, z.infer<typeof avatarTransformQuerySchema>>
>;
type _PeopleListQuery = Assert<IsEqual<PeopleListQuery, z.infer<typeof peopleListQuerySchema>>>;
type _GeocodeSuggestQuery = Assert<
  IsEqual<GeocodeSuggestQuery, z.infer<typeof geocodeSuggestQuerySchema>>
>;
type _GeocodeTimezoneQuery = Assert<
  IsEqual<GeocodeTimezoneQuery, z.infer<typeof geocodeTimezoneQuerySchema>>
>;
type _PreviewListQuery = Assert<IsEqual<PreviewListQuery, z.infer<typeof previewListQuerySchema>>>;
type _InteractionsListQuery = Assert<
  IsEqual<InteractionsListQuery, z.infer<typeof interactionsListQuerySchema>>
>;
type _ChatMessagesQuery = Assert<
  IsEqual<ChatMessagesQuery, z.infer<typeof chatMessagesQuerySchema>>
>;
type _ChatSessionIdParam = Assert<
  IsEqual<ChatSessionIdParam, z.infer<typeof chatSessionIdParamSchema>>
>;
type _MergeRecommendationsQuery = Assert<
  IsEqual<MergeRecommendationsQuery, z.infer<typeof mergeRecommendationsQuerySchema>>
>;
type _SyncPullQuery = Assert<IsEqual<SyncPullQuery, z.infer<typeof syncPullQuerySchema>>>;
type _ContactRelationshipIdParam = Assert<
  IsEqual<ContactRelationshipIdParam, z.infer<typeof contactRelationshipIdParamSchema>>
>;
type _ImportantDatesReplaceBody = Assert<
  IsEqual<ImportantDatesReplaceBody, z.infer<typeof importantDatesReplaceBodySchema>>
>;
type _GeocodeSuggestResponseWire = Assert<
  IsEqual<GeocodeSuggestResponseWire, z.infer<typeof geocodeSuggestResponseWireSchema>>
>;
type _GeocodeTimezoneResponseWire = Assert<
  IsEqual<GeocodeTimezoneResponseWire, z.infer<typeof geocodeTimezoneResponseWireSchema>>
>;
