import "server-only";

import type { ChatSession } from "@bondery/schemas";
import type { UIMessage } from "ai";
import {
  buildChatSessionMessagesPath,
  CHAT_SESSIONS_LIST_PATH,
  type ChatSessionMessagesApiResponse,
  type ChatSessionsApiResponse,
  mapChatMessageRowsToUI,
  parseChatSessionMessages,
  parseChatSessions,
} from "@/lib/api/resources/chat";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const NO_STORE: ServerApiFetchOptions = { cache: "no-store" };

export async function getChatSessionsServer(options: ReadOptions = {}): Promise<ChatSession[]> {
  const raw = await serverApiJson<ChatSessionsApiResponse>(CHAT_SESSIONS_LIST_PATH, undefined, {
    ...NO_STORE,
    ...options,
  });
  return parseChatSessions(raw);
}

export async function getChatSessionMessagesServer(
  sessionId: string,
  options: ReadOptions = {},
): Promise<UIMessage[]> {
  const raw = await serverApiJson<ChatSessionMessagesApiResponse>(
    buildChatSessionMessagesPath(sessionId),
    undefined,
    { ...NO_STORE, ...options },
  );
  return mapChatMessageRowsToUI(parseChatSessionMessages(raw));
}
