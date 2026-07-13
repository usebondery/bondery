import type { MapPinsBounds, SortOrder } from "@/lib/api/resources/contacts";
export type ContactsListParams = {
  search?: string;
  sort?: SortOrder;
  limit?: number;
  offset?: number;
};

export const contactKeys = {
  all: ["contacts"] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  groups: (id: string) => [...contactKeys.detail(id), "groups"] as const,
  importantDates: (id: string) => [...contactKeys.detail(id), "important-dates"] as const,
  /** Nested under `lists()` so `invalidateContactLists` also refreshes infinite queries. */
  infinite: (params: Omit<ContactsListParams, "offset">) =>
    [...contactKeys.lists(), "infinite", params] as const,
  interactions: (id: string, params?: { limit?: number; offset?: number }) =>
    [...contactKeys.detail(id), "interactions", params ?? {}] as const,
  interactionsInfinite: (id: string, params: { limit?: number }) =>
    [...contactKeys.detail(id), "interactions", "infinite", params] as const,
  keepInTouch: (params?: { endDate?: string }) =>
    [...contactKeys.all, "keep-in-touch", params ?? {}] as const,
  keepInTouchCount: () => [...contactKeys.all, "keep-in-touch-count"] as const,
  linkedin: (id: string) => [...contactKeys.detail(id), "linkedin"] as const,
  list: (params: ContactsListParams) => [...contactKeys.lists(), params] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  mapPins: (mode: "address" | "contact", bounds?: MapPinsBounds) =>
    [...contactKeys.all, "map-pins", mode, bounds ?? {}] as const,
  relationships: (id: string) => [...contactKeys.detail(id), "relationships"] as const,
  search: (search: string) => [...contactKeys.all, "search", search] as const,
  selectable: {
    all: () => [...contactKeys.all, "selectable"] as const,
    list: (params: ContactsListParams) => [...contactKeys.selectable.lists(), params] as const,
    lists: () => [...contactKeys.selectable.all(), "list"] as const,
    search: (search: string) => [...contactKeys.selectable.all(), "search", search] as const,
  },
  stats: () => [...contactKeys.all, "stats"] as const,
  tags: (id: string) => [...contactKeys.detail(id), "tags"] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  apiKeys: () => [...settingsKeys.all, "api-keys"] as const,
  me: () => [...settingsKeys.all, "me"] as const,
  mePerson: (avatarPreset = "small") => [...settingsKeys.all, "me-person", avatarPreset] as const,
  subscription: () => [...settingsKeys.all, "subscription"] as const,
};

export const tagKeys = {
  all: ["tags"] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
  details: () => [...tagKeys.all, "detail"] as const,
  list: (params?: { previewLimit?: number }) => [...tagKeys.lists(), params ?? {}] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  members: (tagId: string, params?: { limit?: number }) =>
    [...tagKeys.detail(tagId), "members", params ?? {}] as const,
};

export const interactionKeys = {
  all: ["interactions"] as const,
  detail: (id: string) => [...interactionKeys.details(), id] as const,
  details: () => [...interactionKeys.all, "detail"] as const,
  infinite: (params: { limit?: number; contactId?: string }) =>
    [...interactionKeys.lists(), "infinite", params] as const,
  list: (params?: { limit?: number; offset?: number; contactId?: string }) =>
    [...interactionKeys.lists(), params ?? {}] as const,
  lists: () => [...interactionKeys.all, "list"] as const,
};

export const groupKeys = {
  all: ["groups"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  details: () => [...groupKeys.all, "detail"] as const,
  list: (params?: { previewLimit?: number }) => [...groupKeys.lists(), params ?? {}] as const,
  lists: () => [...groupKeys.all, "list"] as const,
  members: (
    id: string,
    params?: { limit?: number; offset?: number; search?: string; sort?: string },
  ) => [...groupKeys.detail(id), "members", params ?? {}] as const,
  membersInfinite: (id: string, params: { search?: string; sort?: string; limit?: number }) =>
    [...groupKeys.detail(id), "members", "infinite", params] as const,
};

export const mergeRecommendationKeys = {
  all: ["merge-recommendations"] as const,
  count: () => [...mergeRecommendationKeys.all, "count"] as const,
  list: (params?: { declined?: boolean }) =>
    [...mergeRecommendationKeys.all, "list", params ?? {}] as const,
};

export const enrichQueueKeys = {
  all: ["enrich-queue"] as const,
  count: () => [...enrichQueueKeys.all, "count"] as const,
  status: () => [...enrichQueueKeys.all, "status"] as const,
};

export const reminderKeys = {
  all: ["reminders"] as const,
  upcoming: () => [...reminderKeys.all, "upcoming"] as const,
};

export const chatKeys = {
  all: ["chat"] as const,
  messages: (sessionId: string) => [...chatKeys.session(sessionId), "messages"] as const,
  session: (id: string) => [...chatKeys.sessions(), id] as const,
  sessions: () => [...chatKeys.all, "sessions"] as const,
};

export const statsKeys = {
  all: ["admin-stats"] as const,
  dashboard: () => [...statsKeys.all, "dashboard"] as const,
};
