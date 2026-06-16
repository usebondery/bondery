"use client";

import { Avatar, Box, List, ListItem, Paper, Text } from "@mantine/core";
import { IconMessageChatbot } from "@tabler/icons-react";
import { type UIMessage } from "ai";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode } from "react";
import { AnchorLink, CopyButton } from "@bondery/mantine-next";
import { parseInlineTokens, type InlineToken } from "@bondery/helpers";
import { InlineDateDisplay } from "@/app/(app)/app/person/[person_id]/components/InlineDateDisplay";
import { InlineInteractionDisplay } from "./InlineInteractionDisplay";
import { InlineGroupDisplay } from "./InlineGroupDisplay";
import { InlineTagDisplay } from "./InlineTagDisplay";
import { ChatPersonChip } from "./ChatPersonChip";
import { ChatShareCard } from "./ChatShareCard";

interface ChatMessageProps {
  message: UIMessage;
  userAvatarUrl?: string | null;
  userName?: string | null;
  sentAt?: Date;
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
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex)}</span>);
  }
  return nodes;
}

/**
 * Renders a single InlineToken as a React element.
 */
function renderToken(token: InlineToken, key: string): ReactNode {
  switch (token.type) {
    case "person":
      return <ChatPersonChip key={key} personId={token.id} />;
    case "date":
      return <InlineDateDisplay key={key} isDisplayOnly timestamp={token.iso} />;
    case "interaction":
      return <InlineInteractionDisplay key={key} id={token.id} />;
    case "group":
      return <InlineGroupDisplay key={key} id={token.id} />;
    case "tag":
      return <InlineTagDisplay key={key} id={token.id} />;
    case "action":
      return <ChatShareCard key={key} name={token.name} id={token.id} />;
    case "link":
      return (
        <AnchorLink key={key} href={token.href} target="_blank">
          {token.label}
        </AnchorLink>
      );
    case "text":
      return <span key={key}>{renderBoldSegments(token.value, key)}</span>;
  }
}

/**
 * Parses text using the shared token parser and renders all tokens.
 */
function parseTextWithChips(text: string): ReactNode[] {
  const tokens = parseInlineTokens(text);
  return tokens.map((token, i) => renderToken(token, `token-${i}`));
}

type ContentBlock =
  | { kind: "text"; content: string }
  | { kind: "list"; listType: "ordered" | "unordered"; items: string[] };

const ORDERED_RE = /^\d+\.\s+(.*)/;
const UNORDERED_RE = /^[-*]\s+(.*)/;

/**
 * Splits raw text into blocks of plain text and markdown-style lists.
 * Consecutive list lines of the same type are grouped.
 */
function parseContentBlocks(text: string): ContentBlock[] {
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let textBuffer: string[] = [];
  let currentList: { listType: "ordered" | "unordered"; items: string[] } | null = null;

  const flushText = () => {
    if (textBuffer.length > 0) {
      blocks.push({ kind: "text", content: textBuffer.join("\n") });
      textBuffer = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push({ kind: "list", ...currentList });
      currentList = null;
    }
  };

  for (const line of lines) {
    const orderedMatch = line.match(ORDERED_RE);
    const unorderedMatch = !orderedMatch ? line.match(UNORDERED_RE) : null;

    if (orderedMatch || unorderedMatch) {
      flushText();
      const listType = orderedMatch ? "ordered" : "unordered";
      const itemContent = (orderedMatch ?? unorderedMatch)![1];

      if (currentList && currentList.listType === listType) {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { listType, items: [itemContent] };
      }
    } else {
      flushList();
      textBuffer.push(line);
    }
  }
  flushList();
  flushText();
  return blocks;
}

export function ChatMessage({ message, userAvatarUrl, userName, sentAt }: ChatMessageProps) {
  const isUser = message.role === "user";
  const t = useTranslations("ChatPage");
  const formatter = useFormatter();

  const copyValue = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  // A message is still streaming if any text part has state 'streaming'
  const isStreaming = message.parts.some(
    (p) => p.type === "text" && (p as { type: "text"; state?: string }).state === "streaming",
  );

  const timeLabel = sentAt
    ? formatter.dateTime(sentAt, { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <Box
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        gap: "var(--mantine-spacing-sm)",
        alignItems: "flex-start",
      }}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "var(--mantine-primary-color-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <IconMessageChatbot size={18} color="var(--mantine-primary-color-filled)" />
        </Box>
      )}

      <Box style={{ maxWidth: "75%", minWidth: 0 }}>
        <Paper
          p="sm"
          px="md"
          radius="lg"
          style={{
            backgroundColor: isUser
              ? "var(--mantine-primary-color-filled)"
              : "var(--mantine-color-default)",
            color: isUser ? "white" : "inherit",
            border: isUser ? "none" : "1px solid var(--mantine-color-default-border)",
          }}
        >
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              const blocks = parseContentBlocks(part.text);
              return blocks.map((block, bIdx) => {
                if (block.kind === "list") {
                  return (
                    <List
                      key={`${index}-list-${bIdx}`}
                      type={block.listType}
                      size="sm"
                      spacing={4}
                      style={{ lineHeight: 1.8 }}
                    >
                      {block.items.map((item, iIdx) => (
                        <ListItem key={iIdx}>{parseTextWithChips(item)}</ListItem>
                      ))}
                    </List>
                  );
                }
                return (
                  <Box
                    key={`${index}-text-${bIdx}`}
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.8,
                      fontSize: "var(--mantine-font-size-sm)",
                    }}
                  >
                    {parseTextWithChips(block.content)}
                  </Box>
                );
              });
            }
            return null;
          })}
        </Paper>

        {!isUser && !isStreaming && (
          <Box mt={4} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CopyButton
              value={copyValue}
              copyLabel={t("copyMessage")}
              copiedLabel={t("copyMessageSuccess")}
              iconSize={12}
            />
            {timeLabel && (
              <Text size="xs" c="dimmed">
                {timeLabel}
              </Text>
            )}
          </Box>
        )}
        {isUser && timeLabel && (
          <Box mt={4} style={{ display: "flex", justifyContent: "flex-end" }}>
            <Text size="xs" c="dimmed">
              {timeLabel}
            </Text>
          </Box>
        )}
      </Box>

      {/* User avatar */}
      {isUser && (
        <Box style={{ flexShrink: 0, marginTop: 4 }}>
          <Avatar
            src={userAvatarUrl ?? undefined}
            size={32}
            radius="xl"
            name={userName ?? undefined}
            color="var(--mantine-primary-color-filled)"
          />
        </Box>
      )}
    </Box>
  );
}
