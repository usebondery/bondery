import { CodeBlock, type CodeBlockPlatform } from "@bondery/mantine-next";
import { IconTerminal } from "@tabler/icons-react";

type DocsCodeBlockCommonProps = {
  /** Extra class on the frame. Use it to cap the width of a wide block. */
  className?: string;
  label?: string;
};

type DocsCodeBlockFenceProps = DocsCodeBlockCommonProps & {
  code: string;
  language: string;
  platforms?: never;
};

type DocsCodeBlockPlatformsProps = DocsCodeBlockCommonProps & {
  code?: never;
  language?: never;
  platforms: Partial<Record<CodeBlockPlatform, string>>;
};

type DocsCodeBlockProps = DocsCodeBlockFenceProps | DocsCodeBlockPlatformsProps;

function isPlatformsBlock(props: DocsCodeBlockProps): props is DocsCodeBlockPlatformsProps {
  return props.platforms !== undefined;
}

const LANGUAGE_ALIAS: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  md: "plaintext",
  mdx: "plaintext",
  plaintext: "plaintext",
  sh: "bash",
  shell: "bash",
  text: "plaintext",
  ts: "typescript",
  tsx: "typescript",
  txt: "plaintext",
  yml: "yaml",
  zsh: "bash",
};

function highlightLanguage(language: string): string {
  return LANGUAGE_ALIAS[language] ?? language;
}

/**
 * Docs code in the shared `CodeBlock` frame. Highlighting matches the webapp.
 * A `platforms` block shows the Windows / macOS / Linux switch and skips the fence header.
 * Every block is full width; a narrow one takes a `max-width` through `className`.
 */
export function DocsCodeBlock(props: DocsCodeBlockProps) {
  if (isPlatformsBlock(props)) {
    return <CodeBlock className={props.className} platforms={props.platforms} />;
  }

  const resolved = highlightLanguage(props.language);

  return (
    <CodeBlock
      className={props.className}
      code={props.code.trim()}
      icon={<IconTerminal size={14} />}
      label={props.label ?? resolved}
      language={resolved}
    />
  );
}
