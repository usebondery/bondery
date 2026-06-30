import type { SortOrder, MapPinsBounds } from "@/lib/query/fetchers/contacts";
export type ContactsListParams = {
  search?: string;
  sort?: SortOrder;
  limit?: number;
  offset?: number;
};

export const contactKeys = {
  all: ["contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (params: ContactsListParams) => [...contactKeys.lists(), params] as const,
  /** Nested under `lists()` so `invalidateContactLists` also refreshes infinite queries. */
  infinite: (params: Omit<ContactsListParams, "offset">) =>
    [...contactKeys.lists(), "infinite", params] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  groups: (id: string) => [...contactKeys.detail(id), "groups"] as const,
  relationships: (id: string) => [...contactKeys.detail(id), "relationships"] as const,
  importantDates: (id: string) => [...contactKeys.detail(id), "important-dates"] as const,
  tags: (id: string) => [...contactKeys.detail(id), "tags"] as const,
  linkedin: (id: string) => [...contactKeys.detail(id), "linkedin"] as const,
  stats: () => [...contactKeys.all, "stats"] as const,
  mapPins: (mode: "address" | "contact", bounds?: MapPinsBounds) =>
    [...contactKeys.all, "map-pins", mode, bounds ?? {}] as const,
  keepInTouch: (params?: { endDate?: string }) =>
    [...contactKeys.all, "keep-in-touch", params ?? {}] as const,
  search: (search: string) => [...contactKeys.all, "search", search] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  me: () => [...settingsKeys.all, "me"] as const,
  subscription: () => [...settingsKeys.all, "subscription"] as const,
  apiKeys: () => [...settingsKeys.all, "api-keys"] as const,
};

export const tagKeys = {
  all: ["tags"] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  list: (params?: { previewLimit?: number }) => [...tagKeys.lists(), params ?? {}] as const,
  details: () => [...tagKeys.all, "detail"] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
  members: (tagId: string, params?: { limit?: number }) =>
    [...tagKeys.detail(tagId), "members", params ?? {}] as const,
};

export const interactionKeys = {
  all: ["interactions"] as const,
  lists: () => [...interactionKeys.all, "list"] as const,
  list: (params?: { limit?: number; offset?: number }) =>
    [...interactionKeys.lists(), params ?? {}] as const,
  details: () => [...interactionKeys.all, "detail"] as const,
  detail: (id: string) => [...interactionKeys.details(), id] as const,
};

export const groupKeys = {
  all: ["groups"] as const,
  lists: () => [...groupKeys.all, "list"] as const,
  list: (params?: { previewLimit?: number }) => [...groupKeys.lists(), params ?? {}] as const,
  details: () => [...groupKeys.all, "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  members: (id: string, params?: { limit?: number; offset?: number }) =>
    [...groupKeys.detail(id), "members", params ?? {}] as const,
};

export const mergeRecommendationKeys = {
  all: ["merge-recommendations"] as const,
  list: (params?: { declined?: boolean }) =>
    [...mergeRecommendationKeys.all, "list", params ?? {}] as const,
  enrichEligibleCount: () => [...mergeRecommendationKeys.all, "enrich-eligible-count"] as const,
  enrichQueueStatus: () => [...mergeRecommendationKeys.all, "enrich-queue-status"] as const,
};

export const reminderKeys = {
  all: ["reminders"] as const,
  upcoming: () => [...reminderKeys.all, "upcoming"] as const,
};

export const chatKeys = {
  all: ["chat"] as const,
  sessions: () => [...chatKeys.all, "sessions"] as const,
  session: (id: string) => [...chatKeys.sessions(), id] as const,
};

export const statsKeys = {
  all: ["admin-stats"] as const,
  dashboard: () => [...statsKeys.all, "dashboard"] as const,
};
