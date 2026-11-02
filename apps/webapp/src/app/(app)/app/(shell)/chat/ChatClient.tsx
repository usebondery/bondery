// biome-ignore-all lint/nursery/useReactCompiler: chat session refs and transport read sessionId during render
"use client";

import { getUserFacingError, isApiError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { ChatModelId } from "@bondery/schemas";
import { Box } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMessageCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { notFound, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import { type ChatHydratedMessage, messageSentAt } from "@/lib/api/resources/chat";
import { useChatSessions } from "@/lib/chat/ChatSessionsContext";
import {
  findPendingApproval,
  isToolPart,
  resolveToolKind,
  toolNameFromPart,
} from "@/lib/chat/chatActivity";
import {
  DEFAULT_CHAT_MODEL_ID,
  readChatModelPreference,
  writeChatModelPreference,
} from "@/lib/chat/chatModelPreference";
import { pickRandomItems } from "@/lib/chat/pickRandomItems";
import {
  NEW_CHAT_VISIBLE_PROMPT_COUNT,
  SUGGESTED_PROMPT_KEYS,
} from "@/lib/chat/suggestedPromptKeys";
import { useChatSession } from "@/lib/chat/useChatSession";
import { useConfirmDeleteChatSession } from "@/lib/chat/useConfirmDeleteChatSession";
import { usePatchDocumentTitle } from "@/lib/documentTitle";
import { useChatPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { routeChatSession } from "@/lib/navigation/route/chat";
import {
  useChatSessionMessagesQuery,
  useChatSessionsQuery,
  useChatSessionsRefreshOnStreamEnd,
  useCreateChatSessionMutation,
} from "@/lib/query/hooks/useChat";
import { useSubscriptionQuery } from "@/lib/query/hooks/useSubscription";
import { chatKeys } from "@/lib/query/keys";
import { ChatSessionActionMenu } from "./components/chrome/ChatSessionActionMenu";
import { ChatThreadView } from "./components/chrome/ChatThreadView";
import { ChatComposer } from "./components/composer/ChatComposer";
import { ChatQuotaAlert } from "./components/quota/ChatQuotaAlert";
import { ChatQuotaBadge } from "./components/quota/ChatQuotaBadge";

function chatSessionIdFromPathname(pathname: string): string | undefined {
  const prefix = `${WEBAPP_ROUTES.CHAT}/`;
  if (!pathname.startsWith(prefix)) {
    return undefined;
  }

  const sessionId = pathname.slice(prefix.length).split("/")[0];
  return sessionId || undefined;
}

/** True when this turn changed CRM data, live or stored. Blocks a retry. */
function turnHasWrite(activity: ChatHydratedMessage["activity"], parts: UIMessage["parts"]) {
  if (activity?.writeMayHaveLanded) {
    return true;
  }

  if ((activity?.activities ?? []).some((entry) => entry.kind === "write")) {
    return true;
  }

  return parts.some(
    (part) =>
      isToolPart(part) &&
      resolveToolKind(toolNameFromPart(part)) === "write" &&
      (part as { state?: string }).state !== "approval-requested",
  );
}

export function ChatClient() {
  const t = useChatPageTranslations();
  const tCommon = useCommonTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const routeSessionId = chatSessionIdFromPathname(pathname);
  const { avatarUrl: userAvatarUrl, displayName: userName } = useUserSession();
  const { data: subscriptionStatus = null } = useSubscriptionQuery();
  const {
    data: hydratedMessages,
    error: messagesError,
    isError: isMessagesError,
    isSuccess: isMessagesSuccess,
  } = useChatSessionMessagesQuery(routeSessionId, !!routeSessionId);
  const { data: sessions = [] } = useChatSessionsQuery();
  const sessionDisplayTitle = routeSessionId
    ? (sessions.find((session) => session.id === routeSessionId)?.title ?? t("untitledSession"))
    : undefined;
  const pageHeaderTitle = sessionDisplayTitle ?? t("title");
  usePatchDocumentTitle(sessionDisplayTitle);
  const [visiblePromptKeys, setVisiblePromptKeys] = useState(() =>
    pickRandomItems(SUGGESTED_PROMPT_KEYS, NEW_CHAT_VISIBLE_PROMPT_COUNT),
  );
  const suggestedPrompts = visiblePromptKeys.map((key) => t(`SuggestedPrompts.${key}`));
  const { chatResetKey, setHighlightedSessionId } = useChatSessions();
  const confirmDeleteChatSession = useConfirmDeleteChatSession();
  const createChatSessionMutation = useCreateChatSessionMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [messagesSent, setMessagesSent] = useState(0);
  // resetAt captured from a 403 response — more up-to-date than the SSR prop.
  const [serverResetAt, setServerResetAt] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(
    subscriptionStatus ? !subscriptionStatus.canUseChat : false,
  );
  // Tracks the active session ID — can be set after lazy creation
  const sessionIdRef = useRef<string | undefined>(routeSessionId);
  const createdSessionIdRef = useRef<string | undefined>(undefined);

  const notifyChatErrorRef = useRef<(error: unknown) => void>(() => {});
  notifyChatErrorRef.current = (error: unknown) => {
    notifications.show(
      errorNotificationTemplate({
        description: getUserFacingError(error, tCommon),
        title: tCommon("feedback.errorTitle"),
      }),
    );
  };

  const chat = useChatSession({
    getSessionId: () => sessionIdRef.current,
    initialModelId: readChatModelPreference(routeSessionId ?? undefined),
    onError: (error) => notifyChatErrorRef.current(error),
    onQuotaExceeded: (resetAt) => {
      setQuotaExceeded(true);
      if (resetAt) {
        setServerResetAt(resetAt);
      }
    },
  });

  const { messages, sendMessage, status, setMessages, stop, regenerate, addToolApprovalResponse } =
    chat;
  const { modelId, selectModel, turnOutcomes, withRetryIntent } = chat;

  const isLoading = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const pendingApproval =
    lastMessage?.role === "assistant" ? findPendingApproval(lastMessage.parts) : undefined;
  const composerLocked = isLoading || pendingApproval !== undefined;
  const canStop = status === "submitted" || status === "streaming";
  const hydratedById = new Map<string, ChatHydratedMessage>(
    (hydratedMessages ?? []).map((message) => [message.id, message]),
  );
  const turns = messages.map((message, index) => {
    const stored = hydratedById.get(message.id)?.activity;
    const liveOutcome = turnOutcomes.get(message.id);

    return {
      activity: liveOutcome
        ? {
            activities: stored?.activities ?? [],
            status: liveOutcome,
            writeMayHaveLanded: stored?.writeMayHaveLanded ?? false,
          }
        : stored,
      isLast: index === messages.length - 1,
      message,
      sentAt: messageSentAt(message),
    };
  });

  const getSessionId = () => sessionIdRef.current;

  useChatSessionsRefreshOnStreamEnd(status, getSessionId, () => {
    setMessagesSent((n) => n + 1);
  });

  useEffect(() => {
    if (createdSessionIdRef.current && createdSessionIdRef.current === routeSessionId) {
      return;
    }

    if (!routeSessionId) {
      if (createdSessionIdRef.current) {
        return;
      }

      sessionIdRef.current = undefined;
      setMessages([]);
      setInputValue("");
      return;
    }

    if (createdSessionIdRef.current && createdSessionIdRef.current !== routeSessionId) {
      createdSessionIdRef.current = undefined;
    }

    sessionIdRef.current = routeSessionId;

    if (!isMessagesSuccess) {
      return;
    }

    setMessages(hydratedMessages ?? []);
  }, [hydratedMessages, isMessagesSuccess, routeSessionId, setMessages]);

  // Reset chat state when sidebar "new chat" is clicked (chatResetKey changes)
  const prevResetKeyRef = useRef(chatResetKey);
  useEffect(() => {
    if (chatResetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = chatResetKey;
      createdSessionIdRef.current = undefined;
      setMessages([]);
      setInputValue("");
      setMessagesSent(0);
      setServerResetAt(null);
      setQuotaExceeded(subscriptionStatus ? !subscriptionStatus.canUseChat : false);
      sessionIdRef.current = undefined;
      selectModel(DEFAULT_CHAT_MODEL_ID);
      setVisiblePromptKeys(pickRandomItems(SUGGESTED_PROMPT_KEYS, NEW_CHAT_VISIBLE_PROMPT_COUNT));
    }
  }, [chatResetKey, selectModel, setMessages, subscriptionStatus]);

  // Each session keeps its own model choice. A new chat starts on the default.
  // Read only when the route changes. `selectModel` stays out of the deps so a
  // picker change is not replaced by the stored value on the next render.
  const selectModelRef = useRef(selectModel);
  selectModelRef.current = selectModel;
  useEffect(() => {
    selectModelRef.current(readChatModelPreference(routeSessionId));
  }, [routeSessionId]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      return;
    }

    const createdId = createdSessionIdRef.current;
    if (!createdId) {
      return;
    }

    const targetPath = routeChatSession(createdId);
    if (pathname === targetPath) {
      return;
    }

    if (pathname !== WEBAPP_ROUTES.CHAT) {
      return;
    }

    queryClient.setQueryData(chatKeys.messages(createdId), messages);
    router.replace(targetPath);
  }, [messages, pathname, queryClient, router, status]);

  // Keep the newest turn in view, including while a reply streams.
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSuggestedPrompt(prompt: string) {
    setInputValue(prompt);
    inputRef.current?.focus();
  }

  /** Stop the reply. The user turn and any partial answer stay in the thread. */
  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // Escape stops a running reply. The textarea is disabled while a turn runs,
  // so the listener lives on the window.
  useEffect(() => {
    if (!canStop) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleStop();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canStop, handleStop]);

  const handleModelChange = (nextModelId: ChatModelId) => {
    selectModel(nextModelId);

    const activeSessionId = sessionIdRef.current;
    if (activeSessionId) {
      writeChatModelPreference(activeSessionId, nextModelId);
    }
  };

  /** Resume a paused delete. The tool has not run until this point. */
  async function handleApproval(approved: boolean) {
    if (!pendingApproval) {
      return;
    }

    await addToolApprovalResponse({ approved, id: pendingApproval.approvalId });
  }

  /** Ask for a new reply to the last turn. Reuses that turn and costs one message. */
  async function handleRetry() {
    if (composerLocked || quotaExceeded) {
      return;
    }

    try {
      await withRetryIntent(async () => {
        await regenerate();
      });
    } catch (error) {
      notifyChatErrorRef.current(error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || composerLocked) {
      return;
    }

    // Create the session first, then send. Do not change the URL until the
    // stream settles — Next.js treats /app/chat → /app/chat/[id] as a real
    // navigation and would abort POST /api/chat.
    if (!sessionIdRef.current) {
      try {
        const sessionId = await createChatSessionMutation.mutateAsync();
        createdSessionIdRef.current = sessionId;
        sessionIdRef.current = sessionId;
        setHighlightedSessionId(sessionId);
        writeChatModelPreference(sessionId, modelId);
      } catch (error) {
        notifyChatErrorRef.current(error);
        return;
      }
    }

    // The server stamps `createdAt` when it stores the row. Live turns carry the
    // same field so the time shows before the list is refetched.
    sendMessage({ metadata: { createdAt: new Date().toISOString() }, text });
    setInputValue("");
  }

  // Called by the checkout hook's success event to clear the quota-exceeded state.
  const handleUpgradeSuccess = () => {
    setQuotaExceeded(false);
  }; // Compute adjusted subscription status with client-side message count
  const adjustedSubscriptionStatus = (() => {
    if (!subscriptionStatus || messagesSent === 0) {
      return subscriptionStatus ?? null;
    }
    const updatedUsed = subscriptionStatus.aiMessagesUsed + messagesSent;
    return {
      ...subscriptionStatus,
      aiMessagesUsed: updatedUsed,
      canUseChat: updatedUsed < subscriptionStatus.aiMessageLimit,
    };
  })();

  // Derive quotaExceeded from the optimistic counter so the input blocks
  // immediately without waiting for a server round-trip.
  useEffect(() => {
    if (!adjustedSubscriptionStatus) {
      return;
    }
    if (!adjustedSubscriptionStatus.canUseChat) {
      setQuotaExceeded(true);
    }
  }, [adjustedSubscriptionStatus]);

  useEffect(() => {
    if (quotaExceeded) {
      return;
    }
    // Retrigger-only: focus when the session route or sidebar "new chat" reset changes.
    void chatResetKey;
    void routeSessionId;
    inputRef.current?.focus();
  }, [chatResetKey, quotaExceeded, routeSessionId]);

  if (
    routeSessionId &&
    isMessagesError &&
    hydratedMessages === undefined &&
    isApiError(messagesError) &&
    messagesError.status === 404
  ) {
    notFound();
  }

  const showNewChatHero = messages.length === 0 && !routeSessionId;

  const composer = quotaExceeded ? (
    <ChatQuotaAlert
      onSuccess={handleUpgradeSuccess}
      resetAt={serverResetAt ?? subscriptionStatus?.aiMonthlyResetAt}
      variant={subscriptionStatus?.plan === "premium" ? "premium" : "free"}
    />
  ) : (
    <>
      {adjustedSubscriptionStatus && (
        <Box mb="xs" style={{ display: "flex", justifyContent: "center" }}>
          <ChatQuotaBadge subscriptionStatus={adjustedSubscriptionStatus} />
        </Box>
      )}
      <ChatComposer
        canStop={canStop}
        dictationResetKey={`${routeSessionId ?? "new"}:${chatResetKey}`}
        disabled={composerLocked}
        inputRef={inputRef}
        isNewChat={showNewChatHero}
        modelId={modelId}
        onModelChange={handleModelChange}
        onStop={handleStop}
        onSubmit={handleSubmit}
        setValue={setInputValue}
        value={inputValue}
      />
    </>
  );
  // Retry is offered only for the last turn, and only when nothing was written.
  // A finished reply keeps its text, so a retry needs the stored status; a
  // stopped or failed one keeps its live parts.
  const lastTurn = turns[turns.length - 1];
  const retryAllowed =
    lastTurn?.message.role === "assistant" &&
    lastTurn.activity?.status !== "complete" &&
    !turnHasWrite(lastTurn.activity, lastTurn.message.parts);

  const header = (
    <PageHeader
      action={
        routeSessionId ? (
          <ChatSessionActionMenu onDelete={() => confirmDeleteChatSession(routeSessionId)} />
        ) : undefined
      }
      helpDoc="concepts.chat"
      helpLabel={t("description")}
      icon={IconMessageCircle}
      title={pageHeaderTitle}
    />
  );

  return (
    <ChatThreadView
      composer={composer}
      composerLocked={composerLocked}
      header={header}
      helpLabel={t("description")}
      heroPrompt={t("heroPrompt")}
      isLoading={isLoading}
      onApproval={(approved) => void handleApproval(approved)}
      onRetry={() => void handleRetry()}
      onSuggestedPrompt={handleSuggestedPrompt}
      pendingApproval={pendingApproval !== undefined}
      quotaExceeded={quotaExceeded}
      retryAllowed={retryAllowed}
      showNewChatHero={showNewChatHero}
      suggestedPrompts={suggestedPrompts}
      threadEndRef={messagesEndRef}
      turns={turns}
      userAvatarUrl={userAvatarUrl}
      userName={userName}
    />
  );
}
