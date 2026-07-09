import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ChatSession } from "@bondery/schemas";
import type { UIMessage } from "ai";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";

export const CHAT_SESSIONS_LIST_PATH = `${API_ROUTES.CHAT_SESSIONS}?limit=50&offset=0`;

export function buildChatSessionMessagesPath(sessionId: string): string {
  return `${API_ROUTES.CHAT_SESSIONS}/${sessionId}/messages`;
}

export interface ChatMessageRow {
  content: { text?: string };
  createdAt: string;
  id: string;
  role: "user" | "assistant";
}

export type ChatSessionsApiResponse = Record<string, unknown>;

export function parseChatSessions(raw: ChatSessionsApiResponse): ChatSession[] {
  const { items } = normalizePaginatedList<ChatSession, "sessions">(raw, "sessions", 50);
  return items;
}

export type ChatSessionMessagesApiResponse = { messages?: ChatMessageRow[] };

export function parseChatSessionMessages(raw: ChatSessionMessagesApiResponse): ChatMessageRow[] {
  return raw.messages ?? [];
}

export function mapChatMessageRowsToUI(rows: ChatMessageRow[]): UIMessage[] {
  return rows.map((msg) => ({
    content: msg.content?.text ?? "",
    createdAt: new Date(msg.createdAt),
    id: msg.id,
    parts: [{ text: msg.content?.text ?? "", type: "text" as const }],
    role: msg.role,
  }));
}
