import type { QueryClient } from "@tanstack/react-query";
import { getSubscriptionStatusServer } from "@/lib/api/domains/server/subscription";
import { settingsKeys } from "@/lib/query/keys";

export async function prefetchSubscription(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getSubscriptionStatusServer(),
    queryKey: settingsKeys.subscription(),
  });
}
