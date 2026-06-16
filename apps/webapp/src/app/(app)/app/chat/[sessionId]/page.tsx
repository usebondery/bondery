import { ChatView } from "../ChatView";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/lib/config";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { redirect } from "next/navigation";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { UIMessage } from "ai";
import type { SubscriptionStatus } from "@bondery/types";

interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: { text?: string };
  created_at: string;
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
  const headers = await getAuthHeaders();

  // Fetch user settings for avatar
  let avatarUrl: string | null = null;
  let userName: string | null = null;
  let subscriptionStatus: SubscriptionStatus | null = null;

  try {
    const [settingsRes, subscriptionRes] = await Promise.all([
      fetch(`${API_URL}${API_ROUTES.ME_SETTINGS}`, {
        next: { tags: ["settings"] },
        headers,
      }),
      fetch(`${API_URL}${API_ROUTES.SUBSCRIPTIONS}`, {
        cache: "no-store",
        headers,
      }),
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
      fetch(`${API_URL}${API_ROUTES.SUBSCRIPTIONS_SYNC}`, {
        method: "POST",
        headers,
      }).catch(() => {});
    }
  } catch {}

  // Fetch existing messages for this session
  let initialMessages: UIMessage[] = [];

  try {
    const messagesRes = await fetch(
      `${API_URL}${API_ROUTES.CHAT_SESSIONS}/${sessionId}/messages`,
      {
        headers,
        cache: "no-store",
      },
    );

    if (messagesRes.status === 404) {
      redirect(WEBAPP_ROUTES.CHAT);
    }

    if (messagesRes.ok) {
      const { data } = (await messagesRes.json()) as { data: ChatMessageRow[] };
      initialMessages = data.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content?.text ?? "",
        parts: [{ type: "text" as const, text: msg.content?.text ?? "" }],
        createdAt: new Date(msg.created_at),
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
