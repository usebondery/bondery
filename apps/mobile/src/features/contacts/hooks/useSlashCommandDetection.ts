import { useCallback, useRef, useState } from "react";

const SLASH_TOKEN_RE = /(^|\s)\/([^\s]*)$/;

export interface SlashCommandState {
  isActive: boolean;
  query: string;
  tokenStart: number;
}

export function detectSlashCommand(plainText: string, cursor: number): SlashCommandState | null {
  const beforeCursor = plainText.slice(0, cursor);
  const match = beforeCursor.match(SLASH_TOKEN_RE);

  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  const tokenStart = beforeCursor.length - query.length - 1;

  return {
    isActive: true,
    query,
    tokenStart,
  };
}

export function removeSlashTokenFromPlainText(
  plainText: string,
  tokenStart: number,
  cursor: number,
): {
  text: string;
  cursor: number;
} {
  const nextText = plainText.slice(0, tokenStart) + plainText.slice(cursor);
  return {
    cursor: tokenStart,
    text: nextText,
  };
}

/**
 * Removes a trailing slash command from markdown when it matches the active query.
 */
export function removeSlashTokenFromMarkdown(markdown: string, query: string): string {
  const needle = `/${query}`;
  const idx = markdown.lastIndexOf(needle);

  if (idx === -1) {
    return markdown;
  }

  if (idx > 0) {
    const before = markdown[idx - 1];
    if (before !== " " && before !== "\n") {
      return markdown;
    }
  }

  return markdown.slice(0, idx) + markdown.slice(idx + needle.length);
}

export function useSlashCommandDetection() {
  const [slashState, setSlashState] = useState<SlashCommandState | null>(null);
  const plainTextRef = useRef("");
  const selectionRef = useRef({ end: 0, start: 0 });

  const updateSlashState = useCallback((text: string, cursor: number) => {
    const detected = detectSlashCommand(text, cursor);
    setSlashState(detected);
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      plainTextRef.current = text;
      updateSlashState(text, selectionRef.current.start);
    },
    [updateSlashState],
  );

  const handleChangeSelection = useCallback(
    (selection: { start: number; end: number }) => {
      selectionRef.current = selection;
      updateSlashState(plainTextRef.current, selection.start);
    },
    [updateSlashState],
  );

  const clearSlash = useCallback(() => {
    setSlashState(null);
  }, []);

  return {
    clearSlash,
    handleChangeSelection,
    handleChangeText,
    plainTextRef,
    selectionRef,
    slashState,
  };
}
