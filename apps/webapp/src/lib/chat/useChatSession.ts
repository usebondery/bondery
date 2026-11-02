"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatModelId } from "@bondery/schemas";
import type { UIMessage } from "ai";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from "react";
import { resolveRequestIntent } from "./chatRequestIntent";
import {
  chatQuotaResetAt,
  chatTransportErrorToApiError,
  isChatQuotaError,
} from "./chatTransportError";

/** Turn outcome for a reply that finished in this browser session. */
export type ChatTurnOutcome = "complete" | "incomplete";

export interface UseChatSessionOptions {
  getSessionId: () => string | undefined;
  initialModelId: ChatModelId;
  onError: (error: unknown) => void;
  onQuotaExceeded: (resetAt: string | undefined) => void;
}

/**
 * Wraps `useChat` with the turn kind, the model choice, and turn outcomes.
 *
 * The transport reads refs at send time, so a picker change or a retry flag
 * applies to the request without rebuilding the chat instance.
 */
export function useChatSession({
  getSessionId,
  initialModelId,
  onError,
  onQuotaExceeded,
}: UseChatSessionOptions) {
  const modelIdRef = useRef<ChatModelId>(initialModelId);
  const isRetryRef = useRef(false);
  const messagesRef = useRef<UIMessage[]>([]);
  // The chat setter is needed inside `onFinish`, which runs before `chat` exists.
  const setMessagesRef = useRef<Dispatch<SetStateAction<UIMessage[]>>>(() => {});
  const [modelId, setModelId] = useState<ChatModelId>(initialModelId);
  const [turnOutcomes, setTurnOutcomes] = useState<Map<string, ChatTurnOutcome>>(new Map());

  const chat = useChat({
    onError: (error) => {
      if (isChatQuotaError(error)) {
        onQuotaExceeded(chatQuotaResetAt(error));
        return;
      }

      onError(chatTransportErrorToApiError(error));
    },
    onFinish: ({ isAbort, isError, message }) => {
      if (message.role !== "assistant") {
        return;
      }

      const outcome: ChatTurnOutcome = isAbort || isError ? "incomplete" : "complete";
      setTurnOutcomes((current) => new Map(current).set(message.id, outcome));

      // The reply has no stored time yet. Stamp it once so the clock shows
      // without waiting for a refetch.
      if (!message.metadata) {
        setMessagesRef.current((current) =>
          current.map((entry) =>
            entry.id === message.id
              ? { ...entry, metadata: { createdAt: new Date().toISOString() } }
              : entry,
          ),
        );
      }
    },
    // Approving or denying a paused tool resumes the same turn automatically.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => {
        const sessionId = getSessionId();

        return {
          ...(sessionId ? { sessionId } : {}),
          intent: resolveRequestIntent(messagesRef.current, isRetryRef.current),
          model: modelIdRef.current,
        };
      },
    }),
  });

  setMessagesRef.current = chat.setMessages;
  messagesRef.current = chat.messages;

  const selectModel = useCallback((nextModelId: ChatModelId) => {
    modelIdRef.current = nextModelId;
    setModelId(nextModelId);
  }, []);

  /** Run a function with the retry intent set for the next request only. */
  const withRetryIntent = async (run: () => Promise<void>) => {
    isRetryRef.current = true;
    try {
      await run();
    } finally {
      isRetryRef.current = false;
    }
  };

  return {
    ...chat,
    modelId,
    selectModel,
    turnOutcomes,
    withRetryIntent,
  };
}
