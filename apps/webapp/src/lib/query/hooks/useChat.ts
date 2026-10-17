// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import type { ChatSession } from "@bondery/schemas";
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
import { invalidateChatSessions } from "@/lib/query/invalidation";
import { chatKeys, contactKeys, groupKeys, interactionKeys, tagKeys } from "@/lib/query/keys";
import { throwIfPageCannotRender } from "@/lib/query/pageLoadFailure";

const TITLE_REFRESH_DELAY_MS = 3000;

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
    throwOnError: throwIfPageCannotRender,
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
      queryClient.setQueryData<ChatSession[]>(chatKeys.sessions(), (current) =>
        current?.filter((session) => session.id !== sessionId),
      );
      queryClient.removeQueries({ queryKey: chatKeys.messages(sessionId) });
      await queryClient.invalidateQueries(
        { exact: true, queryKey: chatKeys.sessions() },
        { throwOnError: false },
      );
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
  const wasInFlightRef = useRef(false);
  const titleRefreshTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onStreamCompleteRef = useRef(onStreamComplete);
  onStreamCompleteRef.current = onStreamComplete;

  useEffect(() => {
    return () => {
      if (titleRefreshTimerRef.current) {
        clearTimeout(titleRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const inFlight = status === "submitted" || status === "streaming";
    if (inFlight) {
      wasInFlightRef.current = true;
      return;
    }

    if (status !== "ready" || !wasInFlightRef.current || !getSessionId()) {
      return;
    }

    wasInFlightRef.current = false;
    onStreamCompleteRef.current?.();
    void invalidateChatSessions(queryClient);

    if (titleRefreshTimerRef.current) {
      clearTimeout(titleRefreshTimerRef.current);
    }
    titleRefreshTimerRef.current = setTimeout(() => {
      titleRefreshTimerRef.current = undefined;
      void invalidateChatSessions(queryClient);
    }, TITLE_REFRESH_DELAY_MS);
  }, [status, queryClient, getSessionId]);
}
