import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query/client";

import { prefetchChatSessionMessages } from "@/lib/query/prefetch";
import { ChatView } from "./components/ChatView";

interface ChatSessionLoaderProps {
  sessionId: string;
}

export async function ChatSessionLoader({ sessionId }: ChatSessionLoaderProps) {
  const queryClient = getQueryClient();

  try {
    await prefetchChatSessionMessages(queryClient, sessionId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatView sessionId={sessionId} />
    </HydrationBoundary>
  );
}
