import "server-only";

import type { SubscriptionStatus } from "@bondery/schemas";
import {
  parseSubscriptionStatus,
  SUBSCRIPTION_API_PATH,
  type SubscriptionApiResponse,
} from "@/lib/api/resources/subscription";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const DEFAULT_OPTIONS: ServerApiFetchOptions = {
  cache: "no-store",
};

export async function getSubscriptionStatusServer(
  options: ReadOptions = {},
): Promise<SubscriptionStatus | null> {
  const raw = await serverApiJson<SubscriptionApiResponse>(SUBSCRIPTION_API_PATH, undefined, {
    ...DEFAULT_OPTIONS,
    ...options,
  });
  return parseSubscriptionStatus(raw);
}
