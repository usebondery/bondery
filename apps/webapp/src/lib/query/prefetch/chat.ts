import type { QueryClient } from "@tanstack/react-query";
import { getChatSessionMessagesServer, getChatSessionsServer } from "@/lib/api/domains/server/chat";
import { chatKeys } from "@/lib/query/keys";

export async function prefetchChatSessions(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getChatSessionsServer(),
    queryKey: chatKeys.sessions(),
  });
}

export async function prefetchChatSessionMessages(
  queryClient: QueryClient,
  sessionId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getChatSessionMessagesServer(sessionId),
    queryKey: chatKeys.messages(sessionId),
  });
}
