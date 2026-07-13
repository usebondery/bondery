import { API_ROUTES } from "@bondery/helpers/globals/paths";

import type { ContactPreview, Tag, TagWithCount, UpdateTagInput } from "@bondery/schemas";

import { applyTransportResponsePolicy, clientApiFetch, clientApiJson } from "@/lib/api/client";

import {
  buildTagDetailPath,
  buildTagMembersPath,
  buildTagsListPath,
  parseTagDetail,
  parseTagMembers,
  parseTagsList,
  type TagMembersParams,
  type TagMembersResult,
  type TagsListParams,
} from "@/lib/api/resources/tags";

export type { TagMembersParams, TagMembersResult, TagsListParams } from "@/lib/api/resources/tags";

export async function getTagsList(params?: TagsListParams): Promise<TagWithCount[]> {
  const raw = await clientApiJson<{ tags?: TagWithCount[] }>(buildTagsListPath(params));

  return parseTagsList(raw);
}

export async function getTagDetail(id: string): Promise<Tag> {
  const raw = await clientApiJson<{ tag?: Tag }>(buildTagDetailPath(id));

  return parseTagDetail(raw);
}

export async function getTagMembers(
  tagId: string,

  params?: TagMembersParams,
): Promise<TagMembersResult> {
  const raw = await clientApiJson<Record<string, unknown>>(buildTagMembersPath(tagId, params));

  return parseTagMembers(raw, params?.limit ?? 50);
}

export async function listTags(params?: TagsListParams) {
  return clientApiJson<{ tags?: TagWithCount[] }>(buildTagsListPath(params));
}

export async function listTagMembers(tagId: string, params?: TagMembersParams) {
  return clientApiJson<{ contacts?: ContactPreview[]; totalCount?: number }>(
    buildTagMembersPath(tagId, params),
  );
}

export async function getTag(id: string) {
  return clientApiJson<{ tag?: Tag }>(`${API_ROUTES.TAGS}/${id}`);
}

export async function createTag(body: Record<string, unknown>) {
  return clientApiJson<{ tag: TagWithCount }>(API_ROUTES.TAGS, {
    body: JSON.stringify(body),

    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function updateTag(id: string, patch: UpdateTagInput) {
  return clientApiJson(`${API_ROUTES.TAGS}/${id}`, {
    body: JSON.stringify(patch),

    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function deleteTag(id: string) {
  const response = await clientApiFetch(`${API_ROUTES.TAGS}/${id}`, { method: "DELETE" });

  if (!response.ok) {
    applyTransportResponsePolicy(response);

    throw new Error("Failed to delete tag");
  }
}

export async function addTagToContact(contactId: string, tagId: string) {
  return clientApiJson<{ tag: Tag }>(`${API_ROUTES.CONTACTS}/${contactId}/tags`, {
    body: JSON.stringify({ tagId }),

    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/tags/${tagId}`, {
    method: "DELETE",
  });
}

export async function addContactsToTag(tagId: string, contactIds: string[]) {
  return clientApiJson<{ addedCount: number }>(`${API_ROUTES.TAGS}/${tagId}/contacts`, {
    body: JSON.stringify({ personIds: contactIds }),

    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function removeContactsFromTag(tagId: string, contactIds: string[]) {
  return clientApiJson<{ removedCount: number }>(`${API_ROUTES.TAGS}/${tagId}/contacts`, {
    body: JSON.stringify({ personIds: contactIds }),

    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
}
