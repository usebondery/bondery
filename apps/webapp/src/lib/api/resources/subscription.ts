import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";

export const SUBSCRIPTION_API_PATH = API_ROUTES.SUBSCRIPTIONS;

export type SubscriptionApiResponse = { data?: SubscriptionStatus | null };

export function parseSubscriptionStatus(raw: SubscriptionApiResponse): SubscriptionStatus | null {
  return raw.data ?? null;
}
