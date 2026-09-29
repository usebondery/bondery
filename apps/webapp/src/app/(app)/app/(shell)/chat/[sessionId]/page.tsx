import type { Metadata } from "next";
import { getChatSessionsServer } from "@/lib/api/domains/server/chat";
import { getChatPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { entityPageTitle } from "@/lib/metadata/pageTitles";

/**
 * Chat session URL segment. ChatClient lives in the layout so switching
 * sessions is client navigation, not a page remount. Messages load in
 * ChatClient via TanStack Query.
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

export default function ChatSessionPage() {
  return null;
}
