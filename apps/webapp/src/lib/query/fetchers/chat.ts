import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ChatSession } from "@bondery/schemas";
import { createClientFetcher } from "./createClientFetcher";
import { normalizePaginatedList } from "./pagination";

export function createChatSessionsQueryFn() {
  const fetch = createClientFetcher();
  return async (): Promise<ChatSession[]> => {
    const raw = await fetch<Record<string, unknown>>(`${API_ROUTES.CHAT_SESSIONS}?limit=50&offset=0`);
    const { items } = normalizePaginatedList<ChatSession, "sessions">(raw, "sessions", 50);
    return items;
  };
}
