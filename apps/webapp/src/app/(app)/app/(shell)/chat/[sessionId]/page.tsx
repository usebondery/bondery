import type { Metadata } from "next";
import { getChatSessionsServer } from "@/lib/api/domains/server/chat";
import { getChatPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { entityPageTitle } from "@/lib/metadata/pageTitles";
import { getQueryClient } from "@/lib/query/client";
import { fetchChatSessionMessages } from "@/lib/query/prefetch";

/**
 * Chat session URL segment. ChatClient lives in the layout so switching
 * sessions is client navigation, not a page remount.
 *
 * The messages are fetched here so the TanStack cache is hydrated with the
 * thread. Without this the layout renders with an empty cache and the client
 * waits for a second round-trip before the conversation appears.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  const t = await getChatPageTranslations();
  const untitledSession = t("untitledSession");

  try {
    const sessions = await getChatSessionsServer();
    const session = sessions.find((entry) => entry.id === sessionId);
    return entityPageTitle(session?.title ?? untitledSession);
  } catch {
    return entityPageTitle(untitledSession);
  }
}

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // A missing or forbidden session falls through to the client, which turns a
  // 404 into `notFound()`. Prefetch failures must not replace that.
  try {
    await fetchChatSessionMessages(getQueryClient(), sessionId);
  } catch {
    // The client query retries and shows the page-level error state.
  }

  return null;
}
