"use client";

import { useChat } from "@ai-sdk/react";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ActionIcon, Box, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconMessageChatbot, IconSend } from "@tabler/icons-react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import {
  useChatSessionMessagesQuery,
  useChatSessionsRefreshOnStreamEnd,
  useCreateChatSessionMutation,
} from "@/lib/query/hooks/useChat";
import { useSubscriptionQuery } from "@/lib/query/hooks/useSubscription";
import { ChatMessage } from "./components/message/ChatMessage";
import { ChatQuotaAlert } from "./components/quota/ChatQuotaAlert";
import { ChatQuotaBadge } from "./components/quota/ChatQuotaBadge";
import { useChatSessions } from "./hooks/ChatSessionsContext";

const SUGGESTED_PROMPT_KEYS = [
  "NotTalkedInAWhile",
  "ContactsInNewYork",
  "CoffeeWithBlake",
  "WhoSpeaksSpanish",
  "CreateNewContact",
  "InteractionsThisWeek",
] as const;

export function ChatClient({ sessionId }: { sessionId?: string }) {
  const t = useWebTranslations("ChatPage");
  const { avatarUrl: userAvatarUrl, displayName: userName } = useUserSession();
  const { data: subscriptionStatus = null } = useSubscriptionQuery();
  const { data: hydratedMessages = [] } = useChatSessionMessagesQuery(sessionId, !!sessionId);
  const suggestedPrompts = useMemo(
    () => SUGGESTED_PROMPT_KEYS.map((key) => t(`SuggestedPrompts.${key}`)),
    [t],
  );
  const { chatResetKey } = useChatSessions();
  const createChatSessionMutation = useCreateChatSessionMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageDatesRef = useRef<Map<string, Date>>(new Map());
  const [inputValue, setInputValue] = useState("");
  const [messagesSent, setMessagesSent] = useState(0);
  // resetAt captured from a 403 response — more up-to-date than the SSR prop.
  const [serverResetAt, setServerResetAt] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(
    subscriptionStatus ? !subscriptionStatus.canUseChat : false,
  );
  // Tracks the active session ID — can be set after lazy creation
  const sessionIdRef = useRef<string | undefined>(sessionId);
  // Keep ref in sync if the prop changes (e.g. parent re-renders without remount)
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const { messages, sendMessage, status, setMessages } = useChat({
    messages: sessionId ? hydratedMessages : undefined,
    onError: (error) => {
      // Handle 403 quota exceeded from API — extract resetAt if present
      if (error.message?.includes("403")) {
        setQuotaExceeded(true);
        try {
          const body = JSON.parse(error.message.replace(/^.*?({.*}).*$/, "$1"));
          if (body?.resetAt) {
            setServerResetAt(body.resetAt);
          }
        } catch {
          /* ignore parse errors */
        }
      }
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

  // Reset chat state when sidebar "new chat" is clicked (chatResetKey changes)
  const prevResetKeyRef = useRef(chatResetKey);
  useEffect(() => {
    if (chatResetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = chatResetKey;
      setMessages([]);
      setInputValue("");
      setMessagesSent(0);
      setServerResetAt(null);
      setQuotaExceeded(subscriptionStatus ? !subscriptionStatus.canUseChat : false);
      messageDatesRef.current.clear();
      sessionIdRef.current = undefined;
    }
  }, [chatResetKey, setMessages, subscriptionStatus]);

  // Auto-scroll to bottom on new messages
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) {
      return;
    }

    // No session yet — create one, update URL silently, send immediately in this instance
    if (!sessionIdRef.current) {
      try {
        const sessionId = await createChatSessionMutation.mutateAsync();
        sessionIdRef.current = sessionId;
        window.history.pushState(null, "", `${WEBAPP_ROUTES.CHAT}/${sessionId}`);
      } catch {
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

  return (
    <Box style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header + messages in natural flow */}
      <Box p="xl" pb="md" style={{ flex: 1 }}>
        <Stack gap="xl">
          <PageHeader
            helpDoc="concepts.chat"
            helpLabel={t("description")}
            icon={IconMessageChatbot}
            title={t("title")}
          />
          <Box style={{ margin: "0 auto", maxWidth: 800, width: "100%" }}>
            <Stack gap="md">
              {messages.length === 0 ? (
                <Box py="xl">
                  <Text c="dimmed" mb="lg" ta="center">
                    {t("emptyState")}
                  </Text>
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
                </Box>
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    sentAt={messageDatesRef.current.get(message.id)}
                    userAvatarUrl={userAvatarUrl}
                    userName={userName}
                  />
                ))
              )}
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

      {/* Sticky input — stays at bottom of the scroll container */}
      <Box
        px="xl"
        py="md"
        style={{
          backgroundColor: "var(--mantine-color-body)",
          borderTop: "1px solid var(--mantine-color-default-border)",
          bottom: 0,
          position: "sticky",
        }}
      >
        <Box style={{ margin: "0 auto", maxWidth: 800, width: "100%" }}>
          {quotaExceeded ? (
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
                  <TextInput
                    disabled={isLoading}
                    flex={1}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                    placeholder={t("inputPlaceholder")}
                    radius="xl"
                    rightSection={
                      <ActionIcon
                        aria-label={t("send")}
                        disabled={isLoading || !inputValue.trim()}
                        radius="xl"
                        size="md"
                        type="submit"
                        variant="filled"
                      >
                        <IconSend size={16} />
                      </ActionIcon>
                    }
                    rightSectionWidth={42}
                    value={inputValue}
                  />
                </Group>
              </form>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
