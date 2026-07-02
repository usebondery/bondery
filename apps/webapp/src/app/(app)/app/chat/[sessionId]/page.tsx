import { ChatView } from "../ChatView";
import { serverApiFetch } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { redirect } from "next/navigation";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { UIMessage } from "ai";
import type { SubscriptionStatus } from "@bondery/schemas";

interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: { text?: string };
  createdAt: string;
}

/**
 * Dynamic chat session page — loads existing messages and renders the chat view.
 */
export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Fetch user settings for avatar
  let avatarUrl: string | null = null;
  let userName: string | null = null;
  let subscriptionStatus: SubscriptionStatus | null = null;

  try {
    const [settingsRes, subscriptionRes] = await Promise.all([
      serverApiFetch(API_ROUTES.ME_SETTINGS, undefined, { next: { tags: ["settings"] } }),
      serverApiFetch(API_ROUTES.SUBSCRIPTIONS, undefined, { cache: "no-store" }),
    ]);

    if (settingsRes.ok) {
      const result = await settingsRes.json();
      avatarUrl = result?.data?.avatarUrl ?? null;
      userName = result?.data?.name ?? null;
    }

    if (subscriptionRes.ok) {
      const result = await subscriptionRes.json();
      subscriptionStatus = result?.data ?? null;
    }

    // Fire-and-forget sync: bootstraps subscription for pre-existing Polar customers
    if (subscriptionStatus?.plan !== "premium") {
      serverApiFetch(API_ROUTES.SUBSCRIPTIONS_SYNC, { method: "POST" }).catch(() => {});
    }
  } catch {}

  // Fetch existing messages for this session
  let initialMessages: UIMessage[] = [];

  try {
    const messagesRes = await serverApiFetch(
      `${API_ROUTES.CHAT_SESSIONS}/${sessionId}/messages`,
      undefined,
      { cache: "no-store" },
    );

    if (messagesRes.status === 404) {
      redirect(WEBAPP_ROUTES.CHAT);
    }

    if (messagesRes.ok) {
      const { messages } = (await messagesRes.json()) as { messages: ChatMessageRow[] };
      initialMessages = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content?.text ?? "",
        parts: [{ type: "text" as const, text: msg.content?.text ?? "" }],
        createdAt: new Date(msg.createdAt),
      }));
    }
  } catch {}

  return (
    <ChatView
      key={sessionId}
      sessionId={sessionId}
      initialMessages={initialMessages}
      userAvatarUrl={avatarUrl}
      userName={userName}
      subscriptionStatus={subscriptionStatus}
    />
  );
}
