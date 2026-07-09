"use client";

import { CodeHighlight } from "@mantine/code-highlight";
import { Box, Group, SegmentedControl, Text } from "@mantine/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CopyButton } from "#CopyButton/index.js";

export interface CodeBlockSnippet {
  code: string;
  icon: ReactNode;
  id: string;
  label: string;
  language: string;
}

interface CodeBlockBaseProps {
  copiedLabel?: string;
  copyLabel?: string;
}

export interface CodeBlockSingleProps extends CodeBlockBaseProps {
  code: string;
  defaultSnippetId?: never;
  icon: ReactNode;
  label?: string;
  language: string;
  snippets?: never;
}

export interface CodeBlockMultiProps extends CodeBlockBaseProps {
  code?: never;
  defaultSnippetId?: string;
  icon?: never;
  label?: never;
  language?: never;
  snippets: CodeBlockSnippet[];
}

export type CodeBlockProps = CodeBlockSingleProps | CodeBlockMultiProps;

function CodeBlockShell({
  headerLeft,
  code,
  language,
  copyLabel,
  copiedLabel,
}: {
  headerLeft: ReactNode;
  code: string;
  language: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
      }}
    >
      <Group
        gap="xs"
        justify="space-between"
        px="sm"
        py={6}
        style={{
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
        wrap="nowrap"
      >
        {headerLeft}
        <CopyButton copiedLabel={copiedLabel} copyLabel={copyLabel} value={code} />
      </Group>
      <CodeHighlight
        code={code.trim()}
        key={`${language}-${code}`}
        language={language}
        withCopyButton={false}
      />
    </Box>
  );
}

/**
 * Syntax-highlighted code with icon + label header and copy button.
 * Supports a single snippet or multiple switchable snippets (e.g. per OS).
 */
export function CodeBlock(props: CodeBlockProps) {
  const copyLabel = props.copyLabel ?? "Copy";
  const copiedLabel = props.copiedLabel ?? "Copied!";

  if (props.snippets) {
    return <MultiCodeBlock {...props} copiedLabel={copiedLabel} copyLabel={copyLabel} />;
  }

  const displayLabel = (props.label ?? props.language).toUpperCase();

  return (
    <CodeBlockShell
      copiedLabel={copiedLabel}
      copyLabel={copyLabel}
      headerLeft={
        <Group gap={6} wrap="nowrap">
          <Box component="span" style={{ display: "flex", flexShrink: 0 }}>
            {props.icon}
          </Box>
          <Text c="dimmed" fw={500} size="xs" tt="uppercase">
            {displayLabel}
          </Text>
        </Group>
      }
      language={props.language}
    />
  );
}

function MultiCodeBlock({
  snippets,
  defaultSnippetId,
  copyLabel,
  copiedLabel,
}: CodeBlockMultiProps & { copyLabel: string; copiedLabel: string }) {
  const [activeId, setActiveId] = useState(defaultSnippetId ?? snippets[0]?.id ?? "");
  const userPickedTab = useRef(false);

  useEffect(() => {
    if (userPickedTab.current || !defaultSnippetId) {
      return;
    }
    if (snippets.some((snippet) => snippet.id === defaultSnippetId)) {
      setActiveId(defaultSnippetId);
    }
  }, [defaultSnippetId, snippets]);

  const activeSnippet = snippets.find((snippet) => snippet.id === activeId) ?? snippets[0];

  if (!activeSnippet) {
    return null;
  }

  return (
    <CodeBlockShell
      code={activeSnippet.code}
      copiedLabel={copiedLabel}
      copyLabel={copyLabel}
      headerLeft={
        <SegmentedControl
          data={snippets.map((snippet) => ({
            label: (
              <Group gap={4} justify="center" wrap="nowrap">
                <Box component="span" style={{ display: "flex", flexShrink: 0 }}>
                  {snippet.icon}
                </Box>
                <span>{snippet.label}</span>
              </Group>
            ),
            value: snippet.id,
          }))}
          onChange={(value) => {
            userPickedTab.current = true;
            setActiveId(value);
          }}
          size="xs"
        />
      }
      language={activeSnippet.language}
    />
  );
}
