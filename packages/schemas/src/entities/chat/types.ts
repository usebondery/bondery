import type { PaginationMeta } from "../_shared/types.js";

export interface ChatSession {
  createdAt: string;
  id: string;
  title: string | null;
  updatedAt: string;
  userId: string;
}

export type ChatMessageRole = "user" | "assistant";

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
