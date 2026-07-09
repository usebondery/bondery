import "server-only";

import type { Tag, TagWithCount } from "@bondery/schemas";

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

import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type TagReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const TAGS_TAG = { next: { tags: ["tags"] } } satisfies ServerApiFetchOptions;

export async function getTagsListServer(
  params?: TagsListParams,

  options: TagReadOptions = {},
): Promise<TagWithCount[]> {
  const raw = await serverApiJson<{ tags?: TagWithCount[] }>(
    buildTagsListPath(params),

    undefined,

    { ...TAGS_TAG, ...options },
  );

  return parseTagsList(raw);
}

export async function getTagDetailServer(
  id: string,

  options: TagReadOptions = {},
): Promise<Tag> {
  const raw = await serverApiJson<{ tag?: Tag }>(
    buildTagDetailPath(id),

    undefined,

    { ...TAGS_TAG, ...options },
  );

  return parseTagDetail(raw);
}

export async function getTagMembersServer(
  tagId: string,

  params?: TagMembersParams,

  options: TagReadOptions = {},
): Promise<TagMembersResult> {
  const raw = await serverApiJson<Record<string, unknown>>(
    buildTagMembersPath(tagId, params),

    undefined,

    { next: { tags: ["tags", "contacts"] }, ...options },
  );

  return parseTagMembers(raw, params?.limit ?? 50);
}
