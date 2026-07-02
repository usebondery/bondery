import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactPreview, Tag, TagWithCount, UpdateTagInput } from "@bondery/schemas";
import { clientApiFetch, clientApiJson, applyTransportResponsePolicy } from "@/lib/api/client";
import {
  buildTagMembersPath,
  buildTagsListPath,
  type TagMembersParams,
  type TagsListParams,
} from "@/lib/query/fetchers/tags";

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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateTag(id: string, patch: UpdateTagInput) {
  return clientApiJson(`${API_ROUTES.TAGS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
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
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId }),
  });
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/tags/${tagId}`, {
    method: "DELETE",
  });
}

export async function addContactsToTag(tagId: string, contactIds: string[]) {
  await clientApiJson(`${API_ROUTES.TAGS}/${tagId}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personIds: contactIds }),
  });
}

export async function removeContactsFromTag(tagId: string, contactIds: string[]) {
  await clientApiJson(`${API_ROUTES.TAGS}/${tagId}/contacts`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personIds: contactIds }),
  });
}
