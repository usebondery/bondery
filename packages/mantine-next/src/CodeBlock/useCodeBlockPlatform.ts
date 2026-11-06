"use client";

import { useSyncExternalStore } from "react";
import type { CodeBlockPlatform } from "#CodeBlock/CodeBlock.js";
import { getCodeBlockPlatform, subscribeCodeBlockPlatform } from "#CodeBlock/platformPreference.js";

/** Server render has no cookie, so the first paint follows the detected OS. */
function getServerSnapshot(): null {
  return null;
}

/**
 * The reader's stored platform choice. Returns `null` on the server and until
 * someone picks a tab, so a block can fall back to the detected OS.
 *
 * Kept apart from the store so a server component can import the store without a
 * client boundary.
 */
export function useCodeBlockPlatform(): CodeBlockPlatform | null {
  return useSyncExternalStore(subscribeCodeBlockPlatform, getCodeBlockPlatform, getServerSnapshot);
}
