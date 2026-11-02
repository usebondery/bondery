"use client";

import { HelpButton } from "@bondery/mantine-next";
import { Box, Button, Group, Loader, Stack, Text, Title } from "@mantine/core";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import type { ChatHydratedMessage } from "@/lib/api/resources/chat";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";
import { ChatMessage } from "../message/ChatMessage";

/**
 * Thread body: the new-chat hero, or the message list with the composer footer.
 *
 * Every render-time decision about retry and confirm lives here, so the client
 * only supplies data and callbacks.
 */

export interface ChatThreadTurn {
  /** Stored activity and turn status from a reloaded message. */
  activity?: ChatHydratedMessage["activity"];
  /** The last turn, which may be retried or waiting for a confirm. */
  isLast: boolean;
  message: UIMessage;
  sentAt?: Date;
}

export interface ChatThreadViewProps {
  composer: ReactNode;
  /** A reply or a pending confirm blocks a new send. */
  composerLocked: boolean;
  /** Page header for the thread, rendered above the messages. */
  header?: ReactNode;
  helpLabel: string;
  heroPrompt: string;
  isLoading: boolean;
  /** The paused tool, when one waits for a decision. */
  onApproval?: (approved: boolean) => void;
  onRetry: () => void;
  onSuggestedPrompt: (prompt: string) => void;
  pendingApproval: boolean;
  quotaExceeded: boolean;
  retryAllowed: boolean;
  showNewChatHero: boolean;
  suggestedPrompts: string[];
  threadEndRef: React.RefObject<HTMLDivElement | null>;
  turns: ChatThreadTurn[];
  userAvatarUrl?: string | null;
  userName?: string | null;
}

export function ChatThreadView({
  composer,
  composerLocked,
  header,
  heroPrompt,
  helpLabel,
  isLoading,
  onApproval,
  onRetry,
  onSuggestedPrompt,
  pendingApproval,
  quotaExceeded,
  retryAllowed,
  showNewChatHero,
  suggestedPrompts,
  threadEndRef,
  turns,
  userAvatarUrl,
  userName,
}: ChatThreadViewProps) {
  const t = useChatPageTranslations();

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
          style={{ flex: 1, margin: "0 auto", maxWidth: 800, width: "100%" }}
        >
          <Group gap="sm" justify="center" wrap="nowrap">
            <Title order={2} ta="center">
              {heroPrompt}
            </Title>
            <HelpButton doc="concepts.chat" label={helpLabel} />
          </Group>
          {composer}
          {!quotaExceeded ? (
            <Stack gap="sm">
              <Text c="dimmed" size="sm" ta="center">
                {t("tryAskingMe")}
              </Text>
              <Group gap="sm" justify="center" wrap="wrap">
                {suggestedPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    onClick={() => onSuggestedPrompt(prompt)}
                    radius="xl"
                    size="sm"
                    variant="light"
                  >
                    {prompt}
                  </Button>
                ))}
              </Group>
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
          {header}
          <Box style={{ margin: "0 auto", maxWidth: 800, width: "100%" }}>
            <Stack gap="md">
              {turns.map((turn) => {
                const canRetry =
                  turn.isLast &&
                  retryAllowed &&
                  !composerLocked &&
                  !quotaExceeded &&
                  turn.message.role === "assistant";

                return (
                  <ChatMessage
                    activity={turn.activity}
                    approval={
                      turn.isLast && pendingApproval && !isLoading && onApproval
                        ? {
                            onCancel: () => onApproval(false),
                            onConfirm: () => onApproval(true),
                          }
                        : undefined
                    }
                    isStreaming={turn.isLast && isLoading}
                    key={turn.message.id}
                    message={turn.message}
                    onRetry={canRetry ? onRetry : undefined}
                    sentAt={turn.sentAt}
                    userAvatarUrl={userAvatarUrl}
                    userName={userName}
                  />
                );
              })}
              {isLoading && turns[turns.length - 1]?.message.role === "user" ? (
                <Box pl="md">
                  <Loader color="dimmed" size="sm" type="dots" />
                </Box>
              ) : null}
            </Stack>
            <div ref={threadEndRef} />
          </Box>
        </Stack>
      </Box>
      <ChatThreadFooter>{composer}</ChatThreadFooter>
    </>
  );
}

function ChatThreadFooter({ children }: { children: ReactNode }) {
  return (
    <Box
      px="xl"
      py="md"
      style={{
        backgroundColor: "var(--mantine-color-body)",
        paddingBottom: "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom, 0px))",
        paddingInline: "calc(var(--mantine-spacing-md) + var(--mantine-spacing-xl))",
      }}
    >
      <Box style={{ margin: "0 auto", maxWidth: 800, width: "100%" }}>{children}</Box>
    </Box>
  );
}
