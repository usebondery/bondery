"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addContactsToGroup,
  createGroup,
  deleteGroup,
  duplicateGroup,
  getGroupDetail,
  getGroupMembers,
  getGroupsList,
  type RemoveContactsFromGroupInput,
  removeContactsFromGroup,
  updateGroup,
} from "@/lib/api/domains/groups";

import type { GroupMembersParams, GroupsListParams } from "@/lib/api/resources/groups";

import type { ContactsListFilterParams } from "@/lib/query/contactsListParams";

import { GROUP_MEMBERS_PAGE_SIZE } from "@/lib/query/groupDetailQueryParams";
import { invalidateContactDomain, invalidateGroupDomain } from "@/lib/query/invalidation";
import { groupKeys } from "@/lib/query/keys";

export function useGroupsListQuery(params?: GroupsListParams) {
  const listParams = params ?? { previewLimit: 3 };

  return useQuery({
    queryFn: () => getGroupsList(listParams),
    queryKey: groupKeys.list(listParams),
  });
}

export function useGroupDetailQuery(id: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!id,

    queryFn: () => getGroupDetail(id),
    queryKey: groupKeys.detail(id),
  });
}

export function useGroupMembersQuery(groupId: string, params?: GroupMembersParams, enabled = true) {
  return useQuery({
    enabled: enabled && !!groupId,

    queryFn: () => getGroupMembers(groupId, params),
    queryKey: groupKeys.members(groupId, params),
  });
}

export function useGroupMembersInfiniteQuery(groupId: string, filter: ContactsListFilterParams) {
  const infiniteParams = {
    limit: GROUP_MEMBERS_PAGE_SIZE,
    search: filter.search,

    sort: filter.sort,
  };

  return useInfiniteQuery({
    enabled: !!groupId,

    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasMore) {
        return undefined;
      }

      return lastPage.pagination.offset + lastPage.pagination.limit;
    },

    initialPageParam: 0,

    queryFn: async ({ pageParam }) =>
      getGroupMembers(groupId, {
        ...filter,

        limit: GROUP_MEMBERS_PAGE_SIZE,

        offset: pageParam as number,
      }),
    queryKey: groupKeys.membersInfinite(groupId, infiniteParams),
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,

    onSuccess: async () => {
      await invalidateGroupDomain(queryClient);
    },
  });
}

export function useDuplicateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceGroupId,

      input,
    }: {
      sourceGroupId: string;

      input: Parameters<typeof duplicateGroup>[1];
    }) => duplicateGroup(sourceGroupId, input),

    onSuccess: async () => {
      await Promise.all([
        invalidateGroupDomain(queryClient),

        invalidateContactDomain(queryClient),
      ]);
    },
  });
}

export function useUpdateGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Parameters<typeof updateGroup>[1]) => updateGroup(groupId, patch),

    onSuccess: async () => {
      await invalidateGroupDomain(queryClient);
    },
  });
}

export function useDeleteGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroup,

    onSuccess: async () => {
      await invalidateGroupDomain(queryClient);
    },
  });
}

export function useAddContactsToGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactIds: string[]) => addContactsToGroup(groupId, contactIds),

    onSuccess: async () => {
      await Promise.all([
        invalidateGroupDomain(queryClient),

        invalidateContactDomain(queryClient),
      ]);
    },
  });
}

export function useRemoveContactsFromGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveContactsFromGroupInput) => removeContactsFromGroup(groupId, input),

    onSuccess: async () => {
      await Promise.all([
        invalidateGroupDomain(queryClient),

        invalidateContactDomain(queryClient),
      ]);
    },
  });
}

export function useAddContactsToGroupByIdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, contactIds }: { groupId: string; contactIds: string[] }) =>
      addContactsToGroup(groupId, contactIds),

    onSuccess: async () => {
      await Promise.all([
        invalidateGroupDomain(queryClient),

        invalidateContactDomain(queryClient),
      ]);
    },
  });
}

export function useSyncContactGroupMembershipsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      personIds,

      addToGroupIds,

      removeFromGroupIds,
    }: {
      personIds: string[];

      addToGroupIds: string[];

      removeFromGroupIds: string[];
    }) => {
      const addResults = await Promise.all(
        addToGroupIds.map((groupId) => addContactsToGroup(groupId, personIds)),
      );

      await Promise.all(
        removeFromGroupIds.map((groupId) => removeContactsFromGroup(groupId, personIds)),
      );

      return addResults;
    },

    onSuccess: async () => {
      await Promise.all([
        invalidateGroupDomain(queryClient),

        invalidateContactDomain(queryClient),
      ]);
    },
  });
}
