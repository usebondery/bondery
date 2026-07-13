import type { QueryClient } from "@tanstack/react-query";

import {
  getTagDetailServer,
  getTagMembersServer,
  getTagsListServer,
} from "@/lib/api/domains/server/tags";

import type { TagMembersParams, TagsListParams } from "@/lib/api/resources/tags";

import { tagKeys } from "@/lib/query/keys";

export async function prefetchTagsList(
  queryClient: QueryClient,

  params?: TagsListParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getTagsListServer(params),
    queryKey: tagKeys.list(params),
  });
}

export async function prefetchTagDetail(
  queryClient: QueryClient,

  tagId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getTagDetailServer(tagId),
    queryKey: tagKeys.detail(tagId),
  });
}

export async function prefetchTagMembers(
  queryClient: QueryClient,

  tagId: string,

  params?: TagMembersParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getTagMembersServer(tagId, params),
    queryKey: tagKeys.members(tagId, params),
  });
}
