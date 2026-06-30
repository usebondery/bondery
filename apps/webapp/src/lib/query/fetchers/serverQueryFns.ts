import "server-only";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Activity,
  ChatSession,
  Contact,
  ContactPreview,
  ContactRelationshipWithPeople,
  Group,
  GroupWithCount,
  ImportantDate,
  MergeRecommendation,
  MergeRecommendationsResponse,
  Tag,
  TagWithCount,
  UpcomingReminder,
} from "@bondery/schemas";
import type { AvatarPreset } from "@/lib/avatarParams";
import { appendAvatarParams } from "@/lib/avatarParams";
import { createServerFetcher } from "./createServerFetcher";
import {
  buildContactsListPath,
  buildMapPinsPath,
  normalizeContactsList,
  type ContactsListParams,
  type MapPinsBounds,
  type MapPinsMode,
} from "./contacts";
import { buildGroupsListPath, buildGroupMembersPath, normalizeGroupsList, type GroupMembersParams, type GroupsListParams } from "./groups";
import { buildInteractionsListPath, type InteractionsListParams } from "./interactions";
import { buildKeepInTouchPath } from "./keepInTouch";
import {
  buildMergeRecommendationsPath,
  type EnrichQueueStatus,
  type MergeRecommendationsParams,
} from "./mergeRecommendations";
import { buildUpcomingRemindersPath } from "./reminders";
import {
  buildTagMembersPath,
  buildTagsListPath,
  type TagMembersParams,
  type TagsListParams,
} from "./tags";
import { normalizePaginatedList } from "./pagination";

const fetch = createServerFetcher();

export function createContactsListQueryFn(params: ContactsListParams) {
  const path = buildContactsListPath(params);
  return async () =>
    normalizeContactsList(
      await fetch(path, undefined, {
        next: { tags: ["contacts"] },
      }),
    );
}

export function createContactDetailQueryFn(id: string, avatarPreset: AvatarPreset = "large") {
  const params = new URLSearchParams();
  appendAvatarParams(params, avatarPreset);
  const path = `${API_ROUTES.CONTACTS}/${id}?${params.toString()}`;
  return async (): Promise<Contact> => {
    const raw = await fetch<{ contact?: Contact }>(path, undefined, {
      next: { tags: ["contacts"] },
    });
    if (!raw.contact) throw new Error("Contact not found");
    return raw.contact;
  };
}

export function createContactRelationshipsQueryFn(id: string, avatarPreset: AvatarPreset = "small") {
  const params = new URLSearchParams();
  appendAvatarParams(params, avatarPreset);
  const path = `${API_ROUTES.CONTACTS}/${id}/relationships?${params.toString()}`;
  return async (): Promise<ContactRelationshipWithPeople[]> => {
    const raw = await fetch<{ relationships?: ContactRelationshipWithPeople[] }>(path, undefined, {
      next: { tags: ["relationships", "contacts"] },
    });
    return raw.relationships ?? [];
  };
}

export function createContactImportantDatesQueryFn(id: string) {
  const path = `${API_ROUTES.CONTACTS}/${id}/important-dates`;
  return async (): Promise<ImportantDate[]> => {
    const raw = await fetch<{ dates?: ImportantDate[] }>(path, undefined, {
      next: { tags: ["important-dates", "contacts"] },
    });
    return raw.dates ?? [];
  };
}

export function createMapPinsQueryFn(mode: MapPinsMode, bounds: MapPinsBounds) {
  const path = buildMapPinsPath(mode, bounds);
  return async (): Promise<{ pins: unknown[] }> => {
    const raw = await fetch<{ pins?: unknown[] }>(path, undefined, {
      next: { tags: ["contacts"] },
    });
    return { pins: raw.pins ?? [] };
  };
}

export function createContactGroupsQueryFn(contactId: string) {
  const path = `${API_ROUTES.CONTACTS}/${contactId}/groups`;
  return async (): Promise<GroupWithCount[]> => {
    const raw = await fetch<{ groups?: GroupWithCount[] }>(path, undefined, {
      next: { tags: ["groups", "contacts"] },
    });
    return raw.groups ?? [];
  };
}

export function createKeepInTouchQueryFn() {
  const path = buildKeepInTouchPath();
  return async (): Promise<{ contacts: Contact[] }> => {
    const raw = await fetch<{ contacts?: Contact[] }>(path, undefined, {
      next: { tags: ["contacts"] },
    });
    return { contacts: (raw.contacts ?? []) as Contact[] };
  };
}

export function createGroupsListQueryFn(params?: GroupsListParams) {
  const path = buildGroupsListPath(params);
  return async () =>
    normalizeGroupsList(
      await fetch<{ groups?: GroupWithCount[]; totalCount?: number }>(path, undefined, {
        next: { tags: ["groups"] },
      }),
    );
}

export function createGroupDetailQueryFn(id: string) {
  return async (): Promise<Group> => {
    const raw = await fetch<{ group?: Group }>(`${API_ROUTES.GROUPS}/${id}`, undefined, {
      next: { tags: ["groups"] },
    });
    if (!raw.group) throw new Error("Group not found");
    return raw.group;
  };
}

export function createGroupMembersQueryFn(groupId: string, params?: GroupMembersParams) {
  const path = buildGroupMembersPath(groupId, params);
  return async () => {
    const raw = await fetch<Record<string, unknown>>(path, undefined, {
      next: { tags: ["groups", "contacts"] },
    });
    const { items, pagination } = normalizePaginatedList<Contact, "contacts">(
      raw,
      "contacts",
      params?.limit ?? 50,
    );
    return {
      contacts: items,
      pagination,
    };
  };
}

export function createMergeRecommendationsQueryFn(params?: MergeRecommendationsParams) {
  const path = buildMergeRecommendationsPath(params);
  return async (): Promise<MergeRecommendation[]> => {
    const raw = await fetch<MergeRecommendationsResponse>(path, undefined, {
      next: { tags: ["merge-recommendations"] },
    });
    const { items } = normalizePaginatedList<MergeRecommendation, "recommendations">(
      raw,
      "recommendations",
      200,
    );
    return items;
  };
}

export function createEnrichEligibleCountQueryFn() {
  return async (): Promise<number> => {
    const raw = await fetch<{ count?: number }>(
      `${API_ROUTES.CONTACTS}/enrich-queue/eligible-count`,
      undefined,
      { next: { tags: ["merge-recommendations"] } },
    );
    return raw.count ?? 0;
  };
}

export function createEnrichQueueStatusQueryFn() {
  return async (): Promise<EnrichQueueStatus | null> => {
    const raw = await fetch<EnrichQueueStatus>(
      `${API_ROUTES.CONTACTS}/enrich-queue/status`,
      undefined,
      { next: { tags: ["merge-recommendations"] } },
    );
    if (!raw || raw.pending <= 0) return null;
    return raw;
  };
}

export function createInteractionsListQueryFn(params?: InteractionsListParams) {
  const path = buildInteractionsListPath(params);
  return async () => {
    const raw = await fetch<Record<string, unknown>>(path, undefined, {
      next: { tags: ["interactions"] },
    });
    const { items, pagination } = normalizePaginatedList<Activity, "interactions">(
      raw,
      "interactions",
      params?.limit ?? 50,
    );
    return { activities: items, pagination };
  };
}

export function createInteractionDetailQueryFn(id: string) {
  return async (): Promise<Activity> => {
    const raw = await fetch<{ interaction?: Activity }>(`${API_ROUTES.INTERACTIONS}/${id}`, undefined, {
      next: { tags: ["interactions"] },
    });
    if (!raw.interaction) throw new Error("Interaction not found");
    return raw.interaction;
  };
}

export function createUpcomingRemindersQueryFn() {
  const path = buildUpcomingRemindersPath();
  return async (): Promise<UpcomingReminder[]> => {
    const raw = await fetch<{ reminders?: UpcomingReminder[] }>(path, undefined, {
      next: { tags: ["reminders", "contacts"] },
    });
    return raw.reminders ?? [];
  };
}

export function createChatSessionsQueryFn() {
  return async (): Promise<ChatSession[]> => {
    const raw = await fetch<Record<string, unknown>>(`${API_ROUTES.CHAT_SESSIONS}?limit=50&offset=0`, undefined, {
      cache: "no-store",
    });
    const { items } = normalizePaginatedList<ChatSession, "sessions">(raw, "sessions", 50);
    return items;
  };
}

export function createTagDetailQueryFn(id: string) {
  return async (): Promise<Tag> => {
    const raw = await fetch<{ tag?: Tag }>(`${API_ROUTES.TAGS}/${id}`, undefined, {
      next: { tags: ["tags"] },
    });
    if (!raw.tag) throw new Error("Tag not found");
    return raw.tag;
  };
}

export function createTagsListQueryFn(params?: TagsListParams) {
  const path = buildTagsListPath(params);
  return async (): Promise<TagWithCount[]> => {
    const raw = await fetch<{ tags?: TagWithCount[] }>(path, undefined, {
      next: { tags: ["tags"] },
    });
    return raw.tags ?? [];
  };
}

export function createTagMembersQueryFn(tagId: string, params?: TagMembersParams) {
  const path = buildTagMembersPath(tagId, params);
  return async (): Promise<ContactPreview[]> => {
    const raw = await fetch<{ contacts?: ContactPreview[] }>(path, undefined, {
      next: { tags: ["tags", "contacts"] },
    });
    return raw.contacts ?? [];
  };
}
