import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { QueryClient } from "@tanstack/react-query";
import { clientApiFetch } from "@/lib/api/client";
import { invalidateContactsAttention } from "@/lib/query/invalidation";

export interface SyncMergeRecommendationsOptions {
  /** When true, POST /refresh before invalidating (Fix page Scan / bootstrap). */
  requestRefresh?: boolean;
}

async function requestMergeRecommendationsRefresh(): Promise<void> {
  await clientApiFetch(API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS_REFRESH, {
    method: "POST",
  }).catch(() => undefined);
}

/** Invalidate attention counts; optionally trigger explicit merge refresh first. */
export async function syncMergeRecommendationsAfterChange(
  queryClient: QueryClient,
  options: SyncMergeRecommendationsOptions = {},
): Promise<void> {
  if (options.requestRefresh) {
    await requestMergeRecommendationsRefresh();
  }

  await invalidateContactsAttention(queryClient);
}
