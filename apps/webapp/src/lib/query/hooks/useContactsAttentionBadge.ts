"use client";

import { useEnrichQueueCountQuery } from "@/lib/query/hooks/useEnrichQueue";
import { useMergeRecommendationsCountQuery } from "@/lib/query/hooks/useMergeRecommendations";

/** Sidebar badge: active merge recommendations or enrich-eligible contacts exist. */
export function useContactsAttentionBadge(): boolean {
  const mergeCount = useMergeRecommendationsCountQuery();
  const enrichCount = useEnrichQueueCountQuery();

  return (mergeCount.data ?? 0) > 0 || (enrichCount.data ?? 0) > 0;
}
