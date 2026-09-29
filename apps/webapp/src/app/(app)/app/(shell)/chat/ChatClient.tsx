"use client";

import { useChat } from "@ai-sdk/react";
import {
  buildApiErrorFromResponse,
  extractApiErrorFields,
  getUserFacingError,
  isApiError,
} from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ActionIconButton, errorNotificationTemplate, HelpButton } from "@bondery/mantine-next";
import { Box, Button, Group, Stack, Text, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMessageCircle, IconSend } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { notFound, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ShellMainFooter } from "@/components/shell/ShellMainFooter";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import { useChatSessions } from "@/lib/chat/ChatSessionsContext";
import { pickRandomItems } from "@/lib/chat/pickRandomItems";
import { useConfirmDeleteChatSession } from "@/lib/chat/useConfirmDeleteChatSession";
import { usePatchDocumentTitle } from "@/lib/documentTitle";
import { useChatPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import {
  useChatSessionMessagesQuery,
  useChatSessionsQuery,
  useChatSessionsRefreshOnStreamEnd,
  useCreateChatSessionMutation,
} from "@/lib/query/hooks/useChat";
import { useSubscriptionQuery } from "@/lib/query/hooks/useSubscription";
import { chatKeys } from "@/lib/query/keys";
import { ChatSessionActionMenu } from "./components/chrome/ChatSessionActionMenu";
import { ChatMessage } from "./components/message/ChatMessage";
import { ChatQuotaAlert } from "./components/quota/ChatQuotaAlert";
import { ChatQuotaBadge } from "./components/quota/ChatQuotaBadge";

const SUGGESTED_PROMPT_KEYS = [
  "AddAnniversary",
  "BirthdaysThisMonth",
  "CoffeeWithBlake",
  "ContactsInBerlin",
  "ContactsInNewYork",
  "CreateNewContact",
  "InteractionsThisWeek",
  "LastTalkedToSam",
  "LogCallYesterday",
  "NotTalkedInAWhile",
  "OverdueFollowUps",
  "PeopleInFamilyGroup",
  "SameCompanyAsAlex",
  "TaggedCollegeFriends",
  "WhoSpeaksSpanish",
  "WhoWorksInDesign",
] as const;

const NEW_CHAT_VISIBLE_PROMPT_COUNT = 5;

function chatSessionIdFromPathname(pathname: string): string | undefined {
  const prefix = `${WEBAPP_ROUTES.CHAT}/`;
  if (!pathname.startsWith(prefix)) {
    return undefined;
  }

  const sessionId = pathname.slice(prefix.length).split("/")[0];
  return sessionId || undefined;
}

function jsonPayloadFromTransportError(error: unknown): string {
  let bodyText: string;
  if (error instanceof Error) {
    bodyText = error.message;
  } else {
    bodyText = String(error);
  }
  const jsonStart = bodyText.indexOf("{");
  const jsonEnd = bodyText.lastIndexOf("}");
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return bodyText.slice(jsonStart, jsonEnd + 1);
  }
  return bodyText;
}

function chatTransportErrorToApiError(error: unknown) {
  const bodyText = jsonPayloadFromTransportError(error);
  const fields = extractApiErrorFields(bodyText);
  if (!fields.code) {
    return error;
  }
  const status =
    fields.code === "chat_quota_exceeded" ? 403 : fields.code === "service_unavailable" ? 503 : 500;
  return buildApiErrorFromResponse({ bodyText, status });
}

function chatQuotaResetAt(error: unknown): string | undefined {
  const bodyText = jsonPayloadFromTransportError(error);
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { details?: { resetAt?: unknown } };
    };
    return typeof parsed.error?.details?.resetAt === "string"
      ? parsed.error.details.resetAt
      : undefined;
  } catch {
    return undefined;
  }
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
  const suggestedPrompts = useMemo(
    () => visiblePromptKeys.map((key) => t(`SuggestedPrompts.${key}`)),
    [t, visiblePromptKeys],
  );
  const { chatResetKey, setHighlightedSessionId } = useChatSessions();
  const confirmDeleteChatSession = useConfirmDeleteChatSession();
  const createChatSessionMutation = useCreateChatSessionMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageDatesRef = useRef<Map<string, Date>>(new Map());
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

  const { messages, sendMessage, status, setMessages } = useChat({
    onError: (error) => {
      const apiError = chatTransportErrorToApiError(error);

      if (
        (isApiError(apiError) &&
          (apiError.code === "chat_quota_exceeded" || apiError.status === 403)) ||
        (error instanceof Error && error.message.includes("403"))
      ) {
        setQuotaExceeded(true);
        const resetAt = chatQuotaResetAt(error);
        if (resetAt) {
          setServerResetAt(resetAt);
        }
        return;
      }

      notifyChatErrorRef.current(apiError);
    },
    transport: useMemo(
      () =>
        new DefaultChatTransport({
          api: "/api/chat",
          body: () => (sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
        }),
      [],
    ),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const getSessionId = useCallback(() => sessionIdRef.current, []);

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
      messageDatesRef.current.clear();
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
    messageDatesRef.current.clear();
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
      messageDatesRef.current.clear();
      sessionIdRef.current = undefined;
      setVisiblePromptKeys(pickRandomItems(SUGGESTED_PROMPT_KEYS, NEW_CHAT_VISIBLE_PROMPT_COUNT));
    }
  }, [chatResetKey, setMessages, subscriptionStatus]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      return;
    }

    const createdId = createdSessionIdRef.current;
    if (!createdId) {
      return;
    }

    const targetPath = `${WEBAPP_ROUTES.CHAT}/${createdId}`;
    if (pathname === targetPath) {
      return;
    }

    if (pathname !== WEBAPP_ROUTES.CHAT) {
      return;
    }

    queryClient.setQueryData(chatKeys.messages(createdId), messages);
    router.replace(targetPath);
  }, [messages, pathname, queryClient, router, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Stamp any newly-seen messages with the current time
    const now = new Date();
    for (const msg of messages) {
      if (!messageDatesRef.current.has(msg.id)) {
        messageDatesRef.current.set(msg.id, now);
      }
    }
  }, [messages]);

  function handleSuggestedPrompt(prompt: string) {
    setInputValue(prompt);
    inputRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) {
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
      } catch (error) {
        notifyChatErrorRef.current(error);
        return;
      }
    }

    sendMessage({ text });
    setInputValue("");
  }

  // Called by the checkout hook's success event to clear the quota-exceeded state.
  const handleUpgradeSuccess = useCallback(() => {
    setQuotaExceeded(false);
  }, []);

  // Compute adjusted subscription status with client-side message count
  const adjustedSubscriptionStatus = useMemo(() => {
    if (!subscriptionStatus || messagesSent === 0) {
      return subscriptionStatus ?? null;
    }
    const updatedUsed = subscriptionStatus.aiMessagesUsed + messagesSent;
    return {
      ...subscriptionStatus,
      aiMessagesUsed: updatedUsed,
      canUseChat: updatedUsed < subscriptionStatus.aiMessageLimit,
    };
  }, [subscriptionStatus, messagesSent]);

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
      <form onSubmit={handleSubmit}>
        <Group align="flex-end" gap="sm">
          <Textarea
            aria-label={showNewChatHero ? t("inputPlaceholder") : t("followUpPlaceholder")}
            autoFocus
            autosize
            disabled={isLoading}
            flex={1}
            maxRows={8}
            minRows={1}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
                return;
              }
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }}
            placeholder={showNewChatHero ? t("inputPlaceholder") : t("followUpPlaceholder")}
            radius="xl"
            ref={inputRef}
            resize="none"
            rightSection={
              <ActionIconButton
                aria-label={t("send")}
                disabled={isLoading || !inputValue.trim()}
                icon={<IconSend />}
                radius="xl"
                size="md"
                type="submit"
                variant="filled"
              />
            }
            rightSectionWidth={42}
            value={inputValue}
          />
        </Group>
      </form>
    </>
  );

  const suggestedPromptButtons = (
    <Group gap="sm" justify="center" wrap="wrap">
      {suggestedPrompts.map((prompt) => (
        <Button
          key={prompt}
          onClick={() => handleSuggestedPrompt(prompt)}
          radius="xl"
          size="sm"
          variant="light"
        >
          {prompt}
        </Button>
      ))}
    </Group>
  );

  if (showNewChatHero) {
    return (
      <Box
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Stack
          align="stretch"
          gap="lg"
          justify="center"
          px="xl"
          py="xl"
          style={{
            flex: 1,
            margin: "0 auto",
            maxWidth: 800,
            width: "100%",
          }}
        >
          <Group gap="sm" justify="center" wrap="nowrap">
            <Title order={2} ta="center">
              {t("heroPrompt")}
            </Title>
            <HelpButton doc="concepts.chat" label={t("description")} />
          </Group>
          {composer}
          {!quotaExceeded ? (
            <Stack gap="sm">
              <Text c="dimmed" size="sm" ta="center">
                {t("tryAskingMe")}
              </Text>
              {suggestedPromptButtons}
            </Stack>
          ) : null}
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Box p="xl" pb="md">
        <Stack gap="xl">
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
          <Box style={{ margin: "0 auto", maxWidth: 800, width: "100%" }}>
            <Stack gap="md">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  sentAt={messageDatesRef.current.get(message.id)}
                  userAvatarUrl={userAvatarUrl}
                  userName={userName}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <Box pl="md">
                  <Text c="dimmed" fs="italic" size="sm">
                    {t("thinking")}
                  </Text>
                </Box>
              )}
            </Stack>
            <div ref={messagesEndRef} />
          </Box>
        </Stack>
      </Box>
      <ShellMainFooter>
        <Box
          px="xl"
          py="md"
          style={{
            backgroundColor: "var(--mantine-color-body)",
            paddingBottom: "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom, 0px))",
            paddingInline: "calc(var(--mantine-spacing-md) + var(--mantine-spacing-xl))",
          }}
        >
          <Box style={{ margin: "0 auto", maxWidth: 800, width: "100%" }}>{composer}</Box>
        </Box>
      </ShellMainFooter>
    </>
  );
}
