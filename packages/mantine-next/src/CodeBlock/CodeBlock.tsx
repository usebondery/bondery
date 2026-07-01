"use client";

import { Box, Group, SegmentedControl, Text } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CopyButton } from "#CopyButton/index.js";

export interface CodeBlockSnippet {
  id: string;
  label: string;
  code: string;
  language: string;
  icon: ReactNode;
}

interface CodeBlockBaseProps {
  copyLabel?: string;
  copiedLabel?: string;
}

export interface CodeBlockSingleProps extends CodeBlockBaseProps {
  icon: ReactNode;
  language: string;
  code: string;
  label?: string;
  snippets?: never;
  defaultSnippetId?: never;
}

export interface CodeBlockMultiProps extends CodeBlockBaseProps {
  snippets: CodeBlockSnippet[];
  defaultSnippetId?: string;
  icon?: never;
  language?: never;
  code?: never;
  label?: never;
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
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
        border: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Group
        justify="space-between"
        px="sm"
        py={6}
        gap="xs"
        wrap="nowrap"
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
        }}
      >
        {headerLeft}
        <CopyButton value={code} copyLabel={copyLabel} copiedLabel={copiedLabel} />
      </Group>
      <CodeHighlight key={`${language}-${code}`} code={code.trim()} language={language} withCopyButton={false} />
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
    return <MultiCodeBlock {...props} copyLabel={copyLabel} copiedLabel={copiedLabel} />;
  }

  const displayLabel = (props.label ?? props.language).toUpperCase();

  return (
    <CodeBlockShell
      headerLeft={
        <Group gap={6} wrap="nowrap">
          <Box component="span" style={{ display: "flex", flexShrink: 0 }}>
            {props.icon}
          </Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
            {displayLabel}
          </Text>
        </Group>
      }
      code={props.code}
      language={props.language}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
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
    if (userPickedTab.current || !defaultSnippetId) return;
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
      headerLeft={
        <SegmentedControl
          size="xs"
          value={activeId}
          onChange={(value) => {
            userPickedTab.current = true;
            setActiveId(value);
          }}
          data={snippets.map((snippet) => ({
            value: snippet.id,
            label: (
              <Group gap={4} wrap="nowrap" justify="center">
                <Box component="span" style={{ display: "flex", flexShrink: 0 }}>
                  {snippet.icon}
                </Box>
                <span>{snippet.label}</span>
              </Group>
            ),
          }))}
        />
      }
      code={activeSnippet.code}
      language={activeSnippet.language}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
    />
  );
}
