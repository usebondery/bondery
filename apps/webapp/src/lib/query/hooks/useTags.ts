"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTagInput } from "@bondery/schemas";
import {
  addContactsToTag,
  addTagToContact,
  createTag,
  deleteTag,
  removeContactsFromTag,
  removeTagFromContact,
  updateTag,
} from "@/lib/api/domains/tags";
import {
  createTagDetailQueryFn,
  createTagMembersQueryFn,
  createTagsListQueryFn,
  type TagMembersParams,
  type TagsListParams,
} from "@/lib/query/fetchers/tags";
import { tagKeys } from "@/lib/query/keys";
import {
  invalidateContactDetail,
  invalidateContactDomain,
  invalidateTagDomain,
} from "@/lib/query/invalidation";

export function useTagsListQuery(params?: TagsListParams) {
  const listParams = params ?? { previewLimit: 3 };
  return useQuery({
    queryKey: tagKeys.list(listParams),
    queryFn: createTagsListQueryFn(listParams),
  });
}

export function useTagDetailQuery(tagId: string, enabled = true) {
  return useQuery({
    queryKey: tagKeys.detail(tagId),
    queryFn: createTagDetailQueryFn(tagId),
    enabled: enabled && !!tagId,
  });
}

export function useTagMembersQuery(
  tagId: string,
  params?: TagMembersParams,
  enabled = true,
) {
  return useQuery({
    queryKey: tagKeys.members(tagId, params),
    queryFn: createTagMembersQueryFn(tagId, params),
    enabled: enabled && !!tagId,
  });
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      await invalidateTagDomain(queryClient);
    },
  });
}

export function useUpdateTagMutation(tagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateTagInput) => updateTag(tagId, patch),
    onSuccess: async () => {
      await invalidateTagDomain(queryClient);
    },
  });
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await invalidateTagDomain(queryClient);
    },
  });
}

export function useAddTagToContactMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => addTagToContact(contactId, tagId),
    onSuccess: async () => {
      await Promise.all([
        invalidateTagDomain(queryClient),
        invalidateContactDetail(queryClient, contactId),
      ]);
    },
  });
}

export function useRemoveTagFromContactMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => removeTagFromContact(contactId, tagId),
    onSuccess: async () => {
      await Promise.all([
        invalidateTagDomain(queryClient),
        invalidateContactDetail(queryClient, contactId),
      ]);
    },
  });
}

export function useSyncTagContactsMutation(tagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      toAdd,
      toRemove,
    }: {
      toAdd: string[];
      toRemove: string[];
    }) => {
      if (toAdd.length > 0) {
        await addContactsToTag(tagId, toAdd);
      }
      if (toRemove.length > 0) {
        await removeContactsFromTag(tagId, toRemove);
      }
    },
    onSuccess: async () => {
      await invalidateTagDomain(queryClient);
    },
  });
}

export function useUpdateTagByIdMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, patch }: { tagId: string; patch: UpdateTagInput }) =>
      updateTag(tagId, patch),
    onSuccess: async () => {
      await invalidateTagDomain(queryClient);
    },
  });
}

export function useSyncTagContactsByIdMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tagId,
      toAdd,
      toRemove,
    }: {
      tagId: string;
      toAdd: string[];
      toRemove: string[];
    }) => {
      if (toAdd.length > 0) {
        await addContactsToTag(tagId, toAdd);
      }
      if (toRemove.length > 0) {
        await removeContactsFromTag(tagId, toRemove);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateTagDomain(queryClient),
        invalidateContactDomain(queryClient),
      ]);
    },
  });
}
