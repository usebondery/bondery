import type { PaginationMeta } from "../_shared/types.js";

export interface ChatSession {
  createdAt: string;
  id: string;
  title: string | null;
  updatedAt: string;
  userId: string;
}

export type ChatMessageRole = "user" | "assistant";

/** Public chat model ids. The API maps each one to an Anthropic model id. */
export type ChatModelId = "auto" | "anthropic/claude-haiku-5.5" | "anthropic/claude-sonnet-5.5";

/** Why the client posts a turn. See `chatTurnIntentSchema`. */
export type ChatTurnIntent = "message" | "retry" | "approval";

/** `get_*` and `search_*` tools read. Every other tool writes. */
export type ChatToolKind = "read" | "write";

/** One short line of tool work shown above an assistant answer. */
export interface ChatToolActivity {
  displayName?: string;
  kind: ChatToolKind;
  tool: string;
}

/** Stored JSON on a chat message. Older rows are `{ text }` only. */
export interface ChatMessageContent {
  activities?: ChatToolActivity[];
  status?: "complete" | "incomplete";
  text?: string;
  /** True when a write was running when the client aborted the stream. */
  writeMayHaveLanded?: boolean;
}

export interface ChatMessage {
  content: unknown;
  createdAt: string;
  id: string;
  role: string;
  sessionId: string;
}

export interface ChatSessionsListResponse {
  pagination: PaginationMeta;
  sessions: ChatSession[];
}

export interface ChatMessagesListResponse {
  messages: ChatMessage[];
  pagination: PaginationMeta;
}

export interface ChatSessionResponse {
  session: ChatSession;
}

/** @deprecated Prefer ChatSessionResponse */
export interface ChatSessionCreated {
  createdAt: string;
  id: string;
}

export type ChatSessionCreatedResponse = ChatSessionResponse;
