import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ChatSessionSidebar } from "./ChatSessionSidebar";
import { ChatSessionsProvider } from "./ChatSessionsContext";
import { Box } from "@mantine/core";
import { createChatSessionsQueryFn } from "@/lib/query/fetchers/serverQueryFns";
import { chatKeys } from "@/lib/query/keys";
import { getQueryClient } from "@/lib/query/client";

/**
 * Chat layout — prefetches sessions into TanStack Query, then renders the sidebar.
 */
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: chatKeys.sessions(),
      queryFn: createChatSessionsQueryFn(),
    });
  } catch {}

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatSessionsProvider>
        <Box
          style={{
            display: "flex",
            height: "100dvh",
            marginTop: "calc(-1 * var(--mantine-spacing-md))",
            marginBottom: "calc(-1 * var(--mantine-spacing-md))",
            marginLeft: "calc(-1 * var(--mantine-spacing-md))",
            overflow: "hidden",
          }}
        >
          <ChatSessionSidebar />
          <Box style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</Box>
        </Box>
      </ChatSessionsProvider>
    </HydrationBoundary>
  );
}
