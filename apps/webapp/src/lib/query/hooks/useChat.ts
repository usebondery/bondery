"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  createChatSession,
  deleteChatSession,
  getChatSessionMessagesUI,
  getChatSessions,
} from "@/lib/api/domains/chat";
import { getContactDetail } from "@/lib/api/domains/contacts";

import { getGroupDetail } from "@/lib/api/domains/groups";
import { getInteractionDetail } from "@/lib/api/domains/interactions";
import { getTagDetail } from "@/lib/api/domains/tags";
import { invalidateChatSessionMessages, invalidateChatSessions } from "@/lib/query/invalidation";
import { chatKeys, contactKeys, groupKeys, interactionKeys, tagKeys } from "@/lib/query/keys";

export function useChatSessionsQuery() {
  return useQuery({
    queryFn: getChatSessions,
    queryKey: chatKeys.sessions(),
  });
}

export function useChatSessionMessagesQuery(sessionId: string | undefined, enabled = true) {
  return useQuery({
    enabled: enabled && !!sessionId,

    queryFn: () => {
      if (!sessionId) {
        throw new Error("Chat session id is required");
      }
      return getChatSessionMessagesUI(sessionId);
    },
    queryKey: chatKeys.messages(sessionId ?? ""),
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

    onSuccess: async (_data, sessionId) => {
      await Promise.all([
        invalidateChatSessions(queryClient),

        invalidateChatSessionMessages(queryClient, sessionId),
      ]);
    },
  });
}

export function useChatContactQuery(id: string) {
  return useQuery({
    enabled: !!id,

    queryFn: () => getContactDetail(id, "small"),
    queryKey: contactKeys.detail(id),
  });
}

export function useChatTagQuery(id: string) {
  return useQuery({
    enabled: !!id,

    queryFn: () => getTagDetail(id),
    queryKey: tagKeys.detail(id),
  });
}

export function useChatGroupQuery(id: string) {
  return useQuery({
    enabled: !!id,

    queryFn: () => getGroupDetail(id),
    queryKey: groupKeys.detail(id),
  });
}

export function useChatInteractionQuery(id: string) {
  return useQuery({
    enabled: !!id,

    queryFn: () => getInteractionDetail(id),
    queryKey: interactionKeys.detail(id),
  });
}

/** Refreshes chat session list after streaming ends (sidebar title generation). */

export function useChatSessionsRefreshOnStreamEnd(
  status: string,

  getSessionId: () => string | undefined,

  onStreamComplete?: () => void,
) {
  const queryClient = useQueryClient();

  const prevStatusRef = useRef(status);

  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming";

    prevStatusRef.current = status;

    if (wasStreaming && status === "ready" && getSessionId()) {
      onStreamComplete?.();

      const timer = setTimeout(() => {
        void invalidateChatSessions(queryClient);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status, queryClient, getSessionId, onStreamComplete]);
}
