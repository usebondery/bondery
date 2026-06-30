"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconMessageChatbot, IconSend } from "@tabler/icons-react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "./ChatMessage";
import { ChatQuotaAlert } from "./ChatQuotaAlert";
import { ChatQuotaBadge } from "./ChatQuotaBadge";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { WEBSITE_URL } from "@/lib/config";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";
import { useChatSessions } from "./ChatSessionsContext";
import { useCreateChatSessionMutation } from "@/lib/query/hooks/useChat";
import { invalidateChatSessions } from "@/lib/query/invalidation";

const SUGGESTED_PROMPT_KEYS = [
  "NotTalkedInAWhile",
  "ContactsInNewYork",
  "CoffeeWithBlake",
  "WhoSpeaksSpanish",
  "CreateNewContact",
  "InteractionsThisWeek",
] as const;

export function ChatView({
  sessionId,
  initialMessages,
  userAvatarUrl,
  userName,
  subscriptionStatus,
}: {
  sessionId?: string;
  initialMessages?: UIMessage[];
  userAvatarUrl?: string | null;
  userName?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
}) {
  const t = useTranslations("ChatPage");
  const suggestedPrompts = useMemo(
    () => SUGGESTED_PROMPT_KEYS.map((key) => t(`SuggestedPrompts.${key}`)),
    [t],
  );
  const { chatResetKey } = useChatSessions();
  const queryClient = useQueryClient();
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

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: useMemo(
      () =>
        new DefaultChatTransport({
          api: "/api/chat",
          body: () =>
            sessionIdRef.current ? { sessionId: sessionIdRef.current } : {},
        }),
      [],
    ),
    messages: initialMessages,
    onError: (error) => {
      // Handle 403 quota exceeded from API — extract resetAt if present
      if (error.message?.includes("403")) {
        setQuotaExceeded(true);
        try {
          const body = JSON.parse(error.message.replace(/^.*?({.*}).*$/, "$1"));
          if (body?.resetAt) setServerResetAt(body.resetAt);
        } catch {
          /* ignore parse errors */
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const prevStatusRef = useRef(status);

  // Reset chat state when sidebar "new chat" is clicked (chatResetKey changes)
  const prevResetKeyRef = useRef(chatResetKey);
  useEffect(() => {
    if (chatResetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = chatResetKey;
      setMessages([]);
      setInputValue("");
      setMessagesSent(0);
      setServerResetAt(null);
      setQuotaExceeded(
        subscriptionStatus ? !subscriptionStatus.canUseChat : false,
      );
      messageDatesRef.current.clear();
      sessionIdRef.current = undefined;
    }
  }, [chatResetKey, setMessages, subscriptionStatus]);

  // After streaming finishes, fetch session title and update sidebar
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming";
    prevStatusRef.current = status;

    if (wasStreaming && status === "ready" && sessionIdRef.current) {
      setMessagesSent((n) => n + 1);
      const timer = setTimeout(() => {
        void invalidateChatSessions(queryClient);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, queryClient]);

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
    if (!text || isLoading) return;

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
    if (!subscriptionStatus || messagesSent === 0)
      return subscriptionStatus ?? null;
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
    if (!adjustedSubscriptionStatus) return;
    if (!adjustedSubscriptionStatus.canUseChat) {
      setQuotaExceeded(true);
    }
  }, [adjustedSubscriptionStatus]);

  return (
    <Box
      style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
    >
      {/* Header + messages in natural flow */}
      <Box p="xl" pb="md" style={{ flex: 1 }}>
        <Stack gap="xl">
          <PageHeader
            title={t("title")}
            icon={IconMessageChatbot}
            helpHref={`${WEBSITE_URL}/docs/concepts/chat`}
            helpLabel={t("description")}
          />
          <Box style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
            <Stack gap="md">
              {messages.length === 0 ? (
                <Box py="xl">
                  <Text c="dimmed" ta="center" mb="lg">
                    {t("emptyState")}
                  </Text>
                  <Group justify="center" gap="sm" wrap="wrap">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="light"
                        radius="xl"
                        size="sm"
                        onClick={() => handleSuggestedPrompt(prompt)}
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
                    userAvatarUrl={userAvatarUrl}
                    userName={userName}
                    sentAt={messageDatesRef.current.get(message.id)}
                  />
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <Box pl="md">
                  <Text size="sm" c="dimmed" fs="italic">
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
          position: "sticky",
          bottom: 0,
          backgroundColor: "var(--mantine-color-body)",
          borderTop: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Box style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
          {quotaExceeded ? (
            <ChatQuotaAlert
              onSuccess={handleUpgradeSuccess}
              variant={
                subscriptionStatus?.plan === "premium" ? "premium" : "free"
              }
              resetAt={serverResetAt ?? subscriptionStatus?.aiMonthlyResetAt}
            />
          ) : (
            <>
              {adjustedSubscriptionStatus && (
                <Box
                  mb="xs"
                  style={{ display: "flex", justifyContent: "center" }}
                >
                  <ChatQuotaBadge
                    subscriptionStatus={adjustedSubscriptionStatus}
                  />
                </Box>
              )}
              <form onSubmit={handleSubmit}>
                <Group gap="sm" align="flex-end">
                  <TextInput
                    flex={1}
                    placeholder={t("inputPlaceholder")}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                    disabled={isLoading}
                    size="md"
                    radius="xl"
                    rightSection={
                      <ActionIcon
                        type="submit"
                        variant="filled"
                        radius="xl"
                        size="md"
                        disabled={isLoading || !inputValue.trim()}
                        aria-label={t("send")}
                      >
                        <IconSend size={16} />
                      </ActionIcon>
                    }
                    rightSectionWidth={42}
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
