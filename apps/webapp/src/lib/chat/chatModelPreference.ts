import type { ChatModelId } from "@bondery/schemas";

/**
 * Remembers the model choice per chat session.
 *
 * The choice is a browser convenience, not a saved preference. A new chat
 * starts on Auto, and an unknown stored value falls back to it.
 */

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "auto";

export interface ChatModelOption {
  id: ChatModelId;
  /** Dimmed version after the name. `auto` has none. */
  version?: string;
}

export const CHAT_MODEL_OPTIONS: readonly ChatModelOption[] = [
  { id: "auto" },
  { id: "anthropic/claude-haiku-5.5", version: "5.5" },
  { id: "anthropic/claude-sonnet-5.5", version: "5.5" },
];

const STORAGE_PREFIX = "bondery.chatModel:v1";

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}:${sessionId}`;
}

export function isChatModelId(value: string): value is ChatModelId {
  return CHAT_MODEL_OPTIONS.some((option) => option.id === value);
}

export function readChatModelPreference(sessionId: string | undefined): ChatModelId {
  if (!sessionId) {
    return DEFAULT_CHAT_MODEL_ID;
  }

  try {
    const stored = window.localStorage.getItem(storageKey(sessionId));
    return stored && isChatModelId(stored) ? stored : DEFAULT_CHAT_MODEL_ID;
  } catch {
    return DEFAULT_CHAT_MODEL_ID;
  }
}

export function writeChatModelPreference(sessionId: string, modelId: ChatModelId): void {
  try {
    window.localStorage.setItem(storageKey(sessionId), modelId);
  } catch {
    // Private mode or a full quota. The session keeps the in-memory choice.
  }
}
