"use client";



import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addContactsToGroup,
  createGroup,
  deleteGroup,
  duplicateGroup,
  removeContactsFromGroup,
  updateGroup,
  type RemoveContactsFromGroupInput,
} from "@/lib/api/domains/groups";

import {

  createGroupDetailQueryFn,

  createGroupMembersQueryFn,

  createGroupsListQueryFn,

  type GroupMembersParams,

  type GroupsListParams,

} from "@/lib/query/fetchers/groups";

import { groupKeys } from "@/lib/query/keys";

import { invalidateContactDomain, invalidateGroupDomain } from "@/lib/query/invalidation";



export function useGroupsListQuery(params?: GroupsListParams) {

  const listParams = params ?? { previewLimit: 3 };

  return useQuery({

    queryKey: groupKeys.list(listParams),

    queryFn: createGroupsListQueryFn(listParams),

  });

}



export function useGroupDetailQuery(id: string, enabled = true) {

  return useQuery({

    queryKey: groupKeys.detail(id),

    queryFn: createGroupDetailQueryFn(id),

    enabled: enabled && !!id,

  });

}



export function useGroupMembersQuery(groupId: string, params?: GroupMembersParams, enabled = true) {

  return useQuery({

    queryKey: groupKeys.members(groupId, params),

    queryFn: createGroupMembersQueryFn(groupId, params),

    enabled: enabled && !!groupId,

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

    mutationFn: (input: RemoveContactsFromGroupInput) =>
      removeContactsFromGroup(groupId, input),

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


