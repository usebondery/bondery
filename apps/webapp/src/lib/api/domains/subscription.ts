import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  parseSubscriptionStatus,
  SUBSCRIPTION_API_PATH,
  type SubscriptionApiResponse,
} from "@/lib/api/resources/subscription";

export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const raw = await clientApiJson<SubscriptionApiResponse>(SUBSCRIPTION_API_PATH);

  return parseSubscriptionStatus(raw);
}

export async function syncSubscription(): Promise<void> {
  await clientApiJson(API_ROUTES.SUBSCRIPTIONS_SYNC, { method: "POST" });
}
