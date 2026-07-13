import type { ContactAddressRead } from "#entities/address/types.js";
import type { ContactSortOrder } from "#entities/contact/types.js";
import type { ReplaceImportantDatesInput } from "#entities/important-date/types.js";

export interface UuidParam {
  id: string;
}

export interface PaginationQuery {
  limit: number;
  offset: number;
}

export interface SearchQuery {
  search?: string;
}

export interface AvatarTransformQuery {
  avatarQuality?: "low" | "medium" | "high";
  avatarSize?: "small" | "medium" | "large";
}

export interface PeopleListQuery extends PaginationQuery {
  avatarQuality?: "low" | "medium" | "high";
  avatarSize?: "small" | "medium" | "large";
  keepInTouch?: boolean;
  search?: string;
  sort?: ContactSortOrder;
}

export interface GeocodeSuggestQuery {
  mode: "address" | "place";
  search: string;
}

export interface GeocodeTimezoneQuery {
  lat: number;
  lon: number;
}

export interface PreviewListQuery {
  avatarQuality?: "low" | "medium" | "high";
  avatarSize?: "small" | "medium" | "large";
  previewLimit?: string;
}

export interface InteractionsListQuery extends PaginationQuery {
  avatarQuality?: "low" | "medium" | "high";
  avatarSize?: "small" | "medium" | "large";
  contactId?: string;
}

export interface ChatMessagesQuery extends PaginationQuery {
  sort?: "createdAtAsc";
}

export interface ChatSessionIdParam {
  sessionId: string;
}

export interface MergeRecommendationsQuery extends PaginationQuery {
  avatarQuality?: "low" | "medium" | "high";
  avatarSize?: "small" | "medium" | "large";
  declined?: string;
}

export interface SyncPullQuery {
  limit?: number;
  since: number;
  waitMs?: number;
}

export interface ContactRelationshipIdParam {
  id: string;
  relationshipId: string;
}

export interface ImportantDatesReplaceBody {
  dates: ReplaceImportantDatesInput;
}

export interface GeocodeSuggestResponseWire {
  addresses: ContactAddressRead[];
}

export interface GeocodeTimezoneResponseWire {
  timezone: string | null;
}
