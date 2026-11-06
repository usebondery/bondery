"use client";

import { useSyncExternalStore } from "react";
import { getCodeBlockSnippet, subscribeCodeBlockSnippet } from "#CodeBlock/snippetPreference.js";

/** Server render has no cookie, so the first paint uses the block default. */
function getServerSnapshot(): null {
  return null;
}

/**
 * The reader's stored snippet choice for one block key. Returns `null` on the
 * server and until someone picks a tab, so a block can fall back to its default.
 *
 * The key is part of the snapshot, so every block with the same key follows one
 * choice. Blocks with different keys keep separate choices.
 */
export function useCodeBlockSnippet(key: string): string | null {
  return useSyncExternalStore(
    subscribeCodeBlockSnippet,
    () => getCodeBlockSnippet(key),
    getServerSnapshot,
  );
}
