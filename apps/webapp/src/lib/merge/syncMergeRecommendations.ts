import type { QueryClient } from "@tanstack/react-query";
import { refreshMergeRecommendations } from "@/lib/api/domains/mergeRecommendations";
import { invalidateContactsAttention } from "@/lib/query/invalidation";

export interface SyncMergeRecommendationsOptions {
  /** When true, POST /refresh before invalidating (Fix page Scan / bootstrap). */
  requestRefresh?: boolean;
}

/** Invalidate attention counts; optionally trigger explicit merge refresh first. */
export async function syncMergeRecommendationsAfterChange(
  queryClient: QueryClient,
  options: SyncMergeRecommendationsOptions = {},
): Promise<void> {
  if (options.requestRefresh) {
    try {
      await refreshMergeRecommendations();
    } catch {
      // Hop-down: still invalidate so Fix can recover. 401 already ran transport policy.
    }
  }

  await invalidateContactsAttention(queryClient);
}
