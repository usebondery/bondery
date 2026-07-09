import type { QueryClient } from "@tanstack/react-query";

import {
  getGroupDetailServer,
  getGroupMembersServer,
  getGroupsListServer,
} from "@/lib/api/domains/server/groups";

import type { GroupMembersParams, GroupsListParams } from "@/lib/api/resources/groups";

import { groupKeys } from "@/lib/query/keys";

export async function prefetchGroupsList(
  queryClient: QueryClient,

  params?: GroupsListParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getGroupsListServer(params),
    queryKey: groupKeys.list(params),
  });
}

export async function prefetchGroupDetail(
  queryClient: QueryClient,

  groupId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getGroupDetailServer(groupId),
    queryKey: groupKeys.detail(groupId),
  });
}

export async function prefetchGroupMembers(
  queryClient: QueryClient,

  groupId: string,

  params?: GroupMembersParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getGroupMembersServer(groupId, params),
    queryKey: groupKeys.members(groupId, params),
  });
}

export async function prefetchGroupMembersInfinite(
  queryClient: QueryClient,

  groupId: string,

  params: GroupMembersParams,
): Promise<void> {
  const infiniteParams = {
    limit: params.limit,
    search: params.search,

    sort: params.sort,
  };

  await queryClient.prefetchInfiniteQuery({
    initialPageParam: 0,

    queryFn: async ({ pageParam }) =>
      getGroupMembersServer(groupId, {
        ...params,

        offset: pageParam as number,
      }),
    queryKey: groupKeys.membersInfinite(groupId, infiniteParams),
  });
}
