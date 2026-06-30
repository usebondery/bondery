"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createChatSession, deleteChatSession } from "@/lib/api/domains/chat";
import { createChatSessionsQueryFn } from "@/lib/query/fetchers/chat";
import { createGroupDetailQueryFn } from "@/lib/query/fetchers/groups";
import { createInteractionDetailQueryFn } from "@/lib/query/fetchers/interactions";
import { createTagDetailQueryFn } from "@/lib/query/fetchers/tags";
import { createContactDetailQueryFn } from "@/lib/query/fetchers/contacts";
import { chatKeys, contactKeys, groupKeys, interactionKeys, tagKeys } from "@/lib/query/keys";
import { invalidateChatSessions } from "@/lib/query/invalidation";

export function useChatSessionsQuery() {
  return useQuery({
    queryKey: chatKeys.sessions(),
    queryFn: createChatSessionsQueryFn(),
  });
}

export function useCreateChatSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChatSession,
    onSuccess: async () => {
      await invalidateChatSessions(queryClient);
    },
  });
}

export function useDeleteChatSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChatSession,
    onSuccess: async () => {
      await invalidateChatSessions(queryClient);
    },
  });
}

export function useChatContactQuery(id: string) {

  return useQuery({

    queryKey: contactKeys.detail(id),

    queryFn: createContactDetailQueryFn(id, "small"),

    enabled: !!id,

  });

}



export function useChatTagQuery(id: string) {

  return useQuery({

    queryKey: tagKeys.detail(id),

    queryFn: createTagDetailQueryFn(id),

    enabled: !!id,

  });

}



export function useChatGroupQuery(id: string) {

  return useQuery({

    queryKey: groupKeys.detail(id),

    queryFn: createGroupDetailQueryFn(id),

    enabled: !!id,

  });

}



export function useChatInteractionQuery(id: string) {

  return useQuery({

    queryKey: interactionKeys.detail(id),

    queryFn: createInteractionDetailQueryFn(id),

    enabled: !!id,

  });

}


