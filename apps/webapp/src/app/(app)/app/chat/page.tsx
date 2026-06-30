import { serverApiFetch } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { ChatView } from "./ChatView";
import type { SubscriptionStatus } from "@bondery/schemas";

/**
 * Chat index page — shows an empty chat interface.
 * A new session is only created when the user sends their first message.
 */
export default async function ChatPage() {
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

  return (
    <ChatView
      key="new-chat"
      userAvatarUrl={avatarUrl}
      userName={userName}
      subscriptionStatus={subscriptionStatus}
    />
  );
}
