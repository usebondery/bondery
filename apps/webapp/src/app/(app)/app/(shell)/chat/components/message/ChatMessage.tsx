"use client";

import { type InlineToken, parseInlineTokens } from "@bondery/helpers";
import { ActionIconButton, CopyButton, ExternalLink } from "@bondery/mantine-next";
import { Avatar, Box, List, ListItem, Paper, Text, Tooltip } from "@mantine/core";
import { IconMessageCircle, IconRefresh } from "@tabler/icons-react";
import type { UIMessage } from "ai";
import { type ReactNode, useMemo } from "react";
import { InlineDateDisplay } from "@/app/(app)/app/(shell)/person/[personId]/components/notes/InlineDateDisplay";
import type { ChatMessageActivityRow } from "@/lib/api/resources/chat";
import {
  collectLiveToolActivities,
  findPendingApproval,
  hasRunningTool,
} from "@/lib/chat/chatActivity";
import { parseContentBlocks } from "@/lib/chat/contentBlocks";
import { useChatPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { hasSpeakableText } from "@/lib/speech/speechText";
import { useChatSpeechResolver } from "../../hooks/useChatSpeechResolver";
import { ChatMessageSpeakButton } from "./ChatMessageSpeakButton";
import { ChatPersonChip } from "./ChatPersonChip";
import { ChatShareCard } from "./ChatShareCard";
import { ChatDeleteConfirm, ChatIncompleteNotice, ChatToolSteps } from "./ChatToolSteps";
import { InlineGroupDisplay } from "./InlineGroupDisplay";
import { InlineInteractionDisplay } from "./InlineInteractionDisplay";
import { InlineTagDisplay } from "./InlineTagDisplay";

interface ChatMessageProps {
  /** Stored activity and turn status, from a reloaded message. */
  activity?: ChatMessageActivityRow;
  /** Confirm callbacks for a paused hard delete. */
  approval?: { onCancel: () => void; onConfirm: () => void; pending?: boolean };
  /** Live stream state for the turn this message belongs to. */
  isStreaming?: boolean;
  message: UIMessage;
  /** Retry the last turn when its reply never finished. */
  onRetry?: () => void;
  sentAt?: Date;
  userAvatarUrl?: string | null;
  userName?: string | null;
}

// [No old regex patterns needed — parseInlineTokens handles everything]

/**
 * Splits text on **bold** markers, returning an array of ReactNodes.
 */
function renderBoldSegments(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null = re.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
    match = re.exec(text);
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex)}</span>);
  }
  return nodes;
}

/**
 * Renders a single InlineToken as a React element.
 */
function renderToken(token: InlineToken, key: string, newTabLabel: string): ReactNode {
  switch (token.type) {
    case "person":
      return <ChatPersonChip key={key} personId={token.id} />;
    case "date":
      return <InlineDateDisplay isDisplayOnly key={key} timestamp={token.iso} />;
    case "interaction":
      return <InlineInteractionDisplay id={token.id} key={key} />;
    case "group":
      return <InlineGroupDisplay id={token.id} key={key} />;
    case "tag":
      return <InlineTagDisplay id={token.id} key={key} />;
    case "action":
      return <ChatShareCard id={token.id} key={key} name={token.name} />;
    case "link":
      return (
        <ExternalLink href={token.href} key={key} newTabLabel={newTabLabel}>
          {token.label}
        </ExternalLink>
      );
    case "text":
      return <span key={key}>{renderBoldSegments(token.value, key)}</span>;
  }
}

/**
 * Parses text using the shared token parser and renders all tokens.
 */
function parseTextWithChips(text: string, newTabLabel: string): ReactNode[] {
  const tokens = parseInlineTokens(text);
  return tokens.map((token, i) => renderToken(token, `token-${i}`, newTabLabel));
}

export function ChatMessage({
  message,
  userAvatarUrl,
  userName,
  sentAt,
  isStreaming = false,
  activity,
  approval,
  onRetry,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const t = useChatPageTranslations();
  const tCommon = useCommonTranslations("a11y");
  const formatter = useFormatter();
  const speech = useChatSpeechResolver();
  const newTabLabel = tCommon("opensInNewTab");

  const copyValue = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  const textParts = message.parts.filter(
    (p): p is { type: "text"; text: string } => p.type === "text",
  );
  const hasText = textParts.some((part) => part.text.trim().length > 0);

  // Tool work from the live stream, in the order the model called it.
  const liveActivities = isUser ? [] : collectLiveToolActivities(message.parts);
  const storedActivities = activity?.activities ?? [];
  const showLive = liveActivities.length > 0;
  const pendingApproval = isUser ? undefined : findPendingApproval(message.parts);

  const stepsRunning =
    isStreaming && (hasRunningTool(message.parts) || pendingApproval !== undefined);
  const collapseReads = pendingApproval === undefined && (hasText || !isStreaming);

  // A stored message always has a time. Live turns carry one from send or finish.
  const sentDate = sentAt ?? new Date();
  const timeLabel = formatter.dateTime(sentDate, { hour: "numeric", minute: "2-digit" });
  const fullTimeLabel = formatter.dateTime(sentDate, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const showStoppedNotice =
    !isUser && activity?.status === "incomplete" && !isStreaming && !pendingApproval;
  const showRetry = Boolean(onRetry) && !isStreaming && !pendingApproval;

  // Built once, so `toSpeechText` runs inside the click and not on every render.
  const prepareSpeech = useMemo(() => () => speech.prepare(textParts), [speech, textParts]);

  // Speak is for the reply only. A user knows what they just wrote. The speech
  // text decides the gate, so a message of chips alone still offers the button.
  const canSpeak = !isUser && !isStreaming && hasText && hasSpeakableText(textParts);

  // Copy works for both roles. Your own text is final at send time, so a user
  // message can be copied while the reply still streams.
  const canCopy = hasText && (isUser || !isStreaming);

  // A user message keeps its time while the reply streams. An assistant reply
  // shows a time only after the stream settles.
  const showTime = isUser || !isStreaming;

  const isEmptyAssistant =
    !isUser && !hasText && liveActivities.length === 0 && storedActivities.length === 0;

  // An assistant row with no text and no work is hidden, unless it still owns a
  // confirm or a retry control the user needs to reach.
  if (isEmptyAssistant && !pendingApproval && !showRetry) {
    return null;
  }

  return (
    <Box
      style={{
        alignItems: "flex-start",
        display: "flex",
        gap: "var(--mantine-spacing-sm)",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <Box
          style={{
            alignItems: "center",
            backgroundColor: "var(--mantine-primary-color-light)",
            borderRadius: "50%",
            display: "flex",
            flexShrink: 0,
            height: 32,
            justifyContent: "center",
            marginTop: 4,
            width: 32,
          }}
        >
          <IconMessageCircle color="var(--mantine-primary-color-filled)" size={18} />
        </Box>
      )}

      <Box style={{ maxWidth: "75%", minWidth: 0 }}>
        {!isUser && (showLive || storedActivities.length > 0) && (
          <ChatToolSteps
            activities={showLive ? liveActivities : storedActivities}
            collapseReads={collapseReads}
            running={stepsRunning}
          />
        )}
        {pendingApproval && approval && (
          <ChatDeleteConfirm
            onCancel={approval.onCancel}
            onConfirm={approval.onConfirm}
            pending={approval.pending}
            toolName={pendingApproval.toolName}
          />
        )}
        {isEmptyAssistant ? null : (
          <Paper
            p="sm"
            px="md"
            radius="lg"
            style={{
              backgroundColor: isUser
                ? "var(--mantine-primary-color-filled)"
                : "var(--mantine-color-default)",
              border: isUser ? "none" : "1px solid var(--mantine-color-default-border)",
              color: isUser ? "white" : "inherit",
            }}
          >
            {message.parts.map((part) => {
              if (part.type === "text") {
                const partKey = part.text.slice(0, 40);
                const blocks = parseContentBlocks(part.text);
                return blocks.map((block) => {
                  if (block.kind === "list") {
                    return (
                      <List
                        key={`list-${partKey}-${block.listType}-${block.items.join("|")}`}
                        size="sm"
                        spacing={4}
                        style={{ lineHeight: 1.8 }}
                        type={block.listType}
                      >
                        {block.items.map((item) => (
                          <ListItem key={item}>{parseTextWithChips(item, newTabLabel)}</ListItem>
                        ))}
                      </List>
                    );
                  }
                  return (
                    <Box
                      key={`text-${partKey}-${block.content.slice(0, 40)}`}
                      style={{
                        fontSize: "var(--mantine-font-size-sm)",
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {parseTextWithChips(block.content, newTabLabel)}
                    </Box>
                  );
                });
              }
              return null;
            })}
          </Paper>
        )}

        {showStoppedNotice && (
          <ChatIncompleteNotice mayHaveSaved={activity?.writeMayHaveLanded === true} />
        )}

        {(showTime || showRetry || canCopy || canSpeak) && (
          <Box
            mt={4}
            style={{
              alignItems: "center",
              display: "flex",
              gap: 4,
              justifyContent: isUser ? "flex-end" : "flex-start",
            }}
          >
            {canCopy && (
              <CopyButton
                className="no-scale"
                copiedLabel={t("copyMessageSuccess")}
                copyLabel={t("copyMessage")}
                value={copyValue}
              />
            )}
            {canSpeak && <ChatMessageSpeakButton messageId={message.id} prepare={prepareSpeech} />}
            {showRetry && (
              <Tooltip label={t("activity.regenerate")}>
                <ActionIconButton
                  aria-label={t("activity.regenerate")}
                  className="no-scale"
                  color="gray"
                  icon={<IconRefresh />}
                  onClick={onRetry}
                  size="xs"
                  variant="subtle"
                />
              </Tooltip>
            )}
            {showTime && (
              <Tooltip label={fullTimeLabel}>
                <Text c="dimmed" size="xs">
                  {timeLabel}
                </Text>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {/* User avatar */}
      {isUser && (
        <Box style={{ flexShrink: 0, marginTop: 4 }}>
          <Avatar
            color="var(--mantine-primary-color-filled)"
            name={userName ?? undefined}
            radius="xl"
            size={32}
            src={userAvatarUrl ?? undefined}
          />
        </Box>
      )}
    </Box>
  );
}
