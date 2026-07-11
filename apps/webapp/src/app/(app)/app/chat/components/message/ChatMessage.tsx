"use client";

import { type InlineToken, parseInlineTokens } from "@bondery/helpers";
import { AnchorLink, CopyButton } from "@bondery/mantine-next";
import { Avatar, Box, List, ListItem, Paper, Text } from "@mantine/core";
import { IconMessageChatbot } from "@tabler/icons-react";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import { InlineDateDisplay } from "@/app/(app)/app/person/[personId]/components/notes/InlineDateDisplay";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { ChatPersonChip } from "./ChatPersonChip";
import { ChatShareCard } from "./ChatShareCard";
import { InlineGroupDisplay } from "./InlineGroupDisplay";
import { InlineInteractionDisplay } from "./InlineInteractionDisplay";
import { InlineTagDisplay } from "./InlineTagDisplay";

interface ChatMessageProps {
  message: UIMessage;
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
function renderToken(token: InlineToken, key: string): ReactNode {
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
        <AnchorLink href={token.href} key={key} target="_blank">
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
      blocks.push({ content: textBuffer.join("\n"), kind: "text" });
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
      const match = orderedMatch ?? unorderedMatch;
      if (!match) {
        continue;
      }
      const itemContent = match[1];

      if (currentList && currentList.listType === listType) {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { items: [itemContent], listType };
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
  const t = useWebTranslations("ChatPage");
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
          <IconMessageChatbot color="var(--mantine-primary-color-filled)" size={18} />
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
                        <ListItem key={item}>{parseTextWithChips(item)}</ListItem>
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
                    {parseTextWithChips(block.content)}
                  </Box>
                );
              });
            }
            return null;
          })}
        </Paper>

        {!isUser && !isStreaming && (
          <Box mt={4} style={{ alignItems: "center", display: "flex", gap: 4 }}>
            <CopyButton
              copiedLabel={t("copyMessageSuccess")}
              copyLabel={t("copyMessage")}
              iconSize={12}
              value={copyValue}
            />
            {timeLabel && (
              <Text c="dimmed" size="xs">
                {timeLabel}
              </Text>
            )}
          </Box>
        )}
        {isUser && timeLabel && (
          <Box mt={4} style={{ display: "flex", justifyContent: "flex-end" }}>
            <Text c="dimmed" size="xs">
              {timeLabel}
            </Text>
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
