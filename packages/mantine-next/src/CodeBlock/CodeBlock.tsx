"use client";

import { BRAND_MARKS, type BrandMarkName, THEMED_BRAND_MARKS } from "@bondery/branding";
import { CodeHighlight } from "@mantine/code-highlight";
import { Box, Group, SegmentedControl, Text } from "@mantine/core";
import { type UseOSReturnValue, useOs } from "@mantine/hooks";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { setCodeBlockPlatform } from "#CodeBlock/platformPreference.js";
import { setCodeBlockSnippet } from "#CodeBlock/snippetPreference.js";
import { useCodeBlockPlatform } from "#CodeBlock/useCodeBlockPlatform.js";
import { useCodeBlockSnippet } from "#CodeBlock/useCodeBlockSnippet.js";
import { CopyButton } from "#CopyButton/index.js";

export type CodeBlockPlatform = "windows" | "macos" | "linux";

export interface CodeBlockSnippet {
  code: string;
  icon: ReactNode;
  id: string;
  label: string;
  language: string;
}

interface CodeBlockBaseProps {
  /**
   * Extra class on the frame. The frame is full width, so set `max-width` here
   * when a page needs a narrower block.
   */
  className?: string;
  copiedLabel?: string;
  copyLabel?: string;
}

export interface CodeBlockSingleProps extends CodeBlockBaseProps {
  code: string;
  /** Pre-rendered highlight. Replaces `CodeHighlight` when set. Copy still uses `code`. */
  content?: ReactNode;
  defaultSnippetId?: never;
  icon: ReactNode;
  label?: string;
  language: string;
  platforms?: never;
  snippets?: never;
}

export interface CodeBlockMultiProps extends CodeBlockBaseProps {
  code?: never;
  defaultSnippetId?: string;
  icon?: never;
  label?: never;
  language?: never;
  platforms?: never;
  /**
   * Shared key for the reader's tab choice. Blocks with the same key follow one
   * choice across pages. Omit it to keep each block independent.
   */
  preferenceKey?: string;
  snippets: CodeBlockSnippet[];
}

export interface CodeBlockPlatformsProps extends CodeBlockBaseProps {
  code?: never;
  content?: never;
  defaultSnippetId?: never;
  icon?: never;
  label?: never;
  language?: never;
  /**
   * One command per desktop OS. Labels, marks, order, and the shared tab choice
   * come from this component, so callers pass code only.
   */
  platforms: Partial<Record<CodeBlockPlatform, string>>;
  snippets?: never;
}

export type CodeBlockProps = CodeBlockSingleProps | CodeBlockMultiProps | CodeBlockPlatformsProps;

/** Tab order is fixed so the same control looks identical on every page. */
const PLATFORM_ORDER: readonly CodeBlockPlatform[] = ["windows", "macos", "linux"];

const PLATFORM_LABELS: Record<CodeBlockPlatform, string> = {
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
};

/** Brand mark per platform. Same artwork the rest of the app uses for these OSes. */
const PLATFORM_MARKS: Record<CodeBlockPlatform, BrandMarkName> = {
  linux: "linux",
  macos: "apple",
  windows: "windows",
};

const PLATFORM_LANGUAGES: Record<CodeBlockPlatform, string> = {
  linux: "bash",
  macos: "bash",
  windows: "powershell",
};

const MARK_SIZE_PX = 14;

/** Maps a Mantine OS value to a platform tab. `undefined` means "no guess". */
function platformForOs(os: UseOSReturnValue): CodeBlockPlatform | undefined {
  switch (os) {
    case "windows":
      return "windows";
    case "macos":
    case "ios":
      return "macos";
    case "linux":
    case "android":
    case "chromeos":
      return "linux";
    default:
      return undefined;
  }
}

function PlatformMark({ platform }: { platform: CodeBlockPlatform }) {
  return <BrandMark name={PLATFORM_MARKS[platform]} />;
}

/**
 * A brand mark at icon size. Marks with a light and a dark file render both, and
 * Mantine shows the one that matches the color scheme, so a dark logo never sits
 * on a dark surface. Callers pass it as a snippet `icon`.
 */
export function BrandMark({ name }: { name: BrandMarkName }) {
  if (name in THEMED_BRAND_MARKS) {
    const themed = THEMED_BRAND_MARKS[name as keyof typeof THEMED_BRAND_MARKS];

    return (
      <>
        <MarkImage darkHidden src={themed.light} />
        <MarkImage lightHidden src={themed.dark} />
      </>
    );
  }

  return (
    <MarkImage src={BRAND_MARKS[name as Exclude<BrandMarkName, keyof typeof THEMED_BRAND_MARKS>]} />
  );
}

type MarkImageProps = {
  darkHidden?: boolean;
  lightHidden?: boolean;
  src: string;
};

function MarkImage({ darkHidden, lightHidden, src }: MarkImageProps) {
  return (
    <Box
      alt=""
      component="img"
      darkHidden={darkHidden}
      height={MARK_SIZE_PX}
      lightHidden={lightHidden}
      src={src}
      // No inline `display`: it would override the Mantine rule that hides the
      // other theme's file. The parent is a flex container, so the image is
      // blockified and adds no baseline gap.
      style={{ flexShrink: 0, objectFit: "contain" }}
      width={MARK_SIZE_PX}
    />
  );
}

/** Builds the tab list in fixed order and skips platforms without code. */
function platformSnippets(
  platforms: Partial<Record<CodeBlockPlatform, string>>,
): CodeBlockSnippet[] {
  const snippets: CodeBlockSnippet[] = [];

  for (const platform of PLATFORM_ORDER) {
    const code = platforms[platform];
    if (!code) {
      continue;
    }
    snippets.push({
      code,
      icon: <PlatformMark platform={platform} />,
      id: platform,
      label: PLATFORM_LABELS[platform],
      language: PLATFORM_LANGUAGES[platform],
    });
  }

  return snippets;
}

function CodeBlockShell({
  headerLeft,
  code,
  content,
  language,
  copyLabel,
  copiedLabel,
  className,
}: {
  headerLeft: ReactNode;
  code: string;
  content?: ReactNode;
  language: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  return (
    <Box
      className={className}
      data-code-block=""
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
        width: "100%",
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
      {content ?? (
        <CodeHighlight
          code={code.trim()}
          key={`${language}-${code}`}
          language={language}
          withCopyButton={false}
        />
      )}
    </Box>
  );
}

/**
 * Syntax-highlighted code with icon + label header and copy button.
 * Supports a single snippet, switchable snippets (`snippets`), or one command per desktop OS
 * (`platforms`). The platform form owns its labels, marks, order, and the shared tab choice.
 */
export function CodeBlock(props: CodeBlockProps) {
  const copyLabel = props.copyLabel ?? "Copy";
  const copiedLabel = props.copiedLabel ?? "Copied!";

  if (props.platforms) {
    return (
      <PlatformCodeBlock
        className={props.className}
        copiedLabel={copiedLabel}
        copyLabel={copyLabel}
        platforms={props.platforms}
      />
    );
  }

  if (props.snippets) {
    return (
      <MultiCodeBlock
        className={props.className}
        copiedLabel={copiedLabel}
        copyLabel={copyLabel}
        defaultSnippetId={props.defaultSnippetId}
        preferenceKey={props.preferenceKey}
        snippets={props.snippets}
      />
    );
  }

  const displayLabel = (props.label ?? props.language).toUpperCase();

  return (
    <CodeBlockShell
      className={props.className}
      code={props.code}
      content={props.content}
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

/**
 * Platform tabs. The choice is stored in a cookie, so every block on the page and
 * every later page switches together. Until someone picks a tab, each block follows
 * the detected OS.
 */
function PlatformCodeBlock({
  platforms,
  copyLabel,
  copiedLabel,
  className,
}: CodeBlockPlatformsProps & { copyLabel: string; copiedLabel: string }) {
  const os = useOs();
  const stored = useCodeBlockPlatform();
  const snippets = platformSnippets(platforms);

  const osPlatform = platformForOs(os);
  const preferred = stored ?? osPlatform;
  const active = snippets.find((snippet) => snippet.id === preferred) ?? snippets[0];

  if (!active) {
    return null;
  }

  return (
    <CodeBlockShell
      className={className}
      code={active.code}
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
          onChange={(value) => setCodeBlockPlatform(value as CodeBlockPlatform)}
          size="xs"
          value={active.id}
        />
      }
      language={active.language}
    />
  );
}

function MultiCodeBlock({
  snippets,
  defaultSnippetId,
  preferenceKey,
  copyLabel,
  copiedLabel,
  className,
}: CodeBlockMultiProps & { copyLabel: string; copiedLabel: string }) {
  const [activeId, setActiveId] = useState(defaultSnippetId ?? snippets[0]?.id ?? "");
  const userPickedTab = useRef(false);
  const storedId = useCodeBlockSnippet(preferenceKey ?? "");

  // A stored choice outranks the default, so a reader who picked Python keeps it.
  useEffect(() => {
    if (userPickedTab.current || !preferenceKey || !storedId) {
      return;
    }
    if (snippets.some((snippet) => snippet.id === storedId)) {
      setActiveId(storedId);
    }
  }, [preferenceKey, snippets, storedId]);

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
      className={className}
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
            if (preferenceKey) {
              setCodeBlockSnippet(preferenceKey, value);
            }
          }}
          size="xs"
          value={activeSnippet.id}
        />
      }
      language={activeSnippet.language}
    />
  );
}
