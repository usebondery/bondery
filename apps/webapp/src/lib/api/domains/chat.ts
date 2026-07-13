import type { ChatSession } from "@bondery/schemas";
import type { UIMessage } from "ai";
import { clientApiJson } from "@/lib/api/client";

import {
  buildChatSessionMessagesPath,
  CHAT_SESSIONS_LIST_PATH,
  type ChatMessageRow,
  type ChatSessionMessagesApiResponse,
  type ChatSessionsApiResponse,
  mapChatMessageRowsToUI,
  parseChatSessionMessages,
  parseChatSessions,
} from "@/lib/api/resources/chat";

export type { ChatMessageRow };

export async function createChatSession(): Promise<string> {
  const { session } = await clientApiJson<{ session: ChatSession }>("/api/chat/sessions", {
    method: "POST",
  });

  if (!session?.id) {
    throw new Error("Chat session was created but response did not include id");
  }

  return session.id;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await clientApiJson(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const raw = await clientApiJson<ChatSessionsApiResponse>(CHAT_SESSIONS_LIST_PATH);

  return parseChatSessions(raw);
}

export async function getChatSessionMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const raw = await clientApiJson<ChatSessionMessagesApiResponse>(
    buildChatSessionMessagesPath(sessionId),
  );

  return parseChatSessionMessages(raw);
}

export async function getChatSessionMessagesUI(sessionId: string): Promise<UIMessage[]> {
  const rows = await getChatSessionMessages(sessionId);

  return mapChatMessageRowsToUI(rows);
}
