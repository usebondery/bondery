import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/lib/config";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { ChatView } from "./ChatView";
import type { SubscriptionStatus } from "@bondery/schemas";

/**
 * Chat index page — shows an empty chat interface.
 * A new session is only created when the user sends their first message.
 */
export default async function ChatPage() {
  const headers = await getAuthHeaders();

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

  return (
    <ChatView
      key="new-chat"
      userAvatarUrl={avatarUrl}
      userName={userName}
      subscriptionStatus={subscriptionStatus}
    />
  );
}
