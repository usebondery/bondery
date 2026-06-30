import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";
import { createClientFetcher } from "./createClientFetcher";

export interface MergeRecommendationsParams {
  declined?: boolean;
}

import { normalizePaginatedList } from "./pagination";

export function buildMergeRecommendationsPath(params?: MergeRecommendationsParams): string {
  const search = new URLSearchParams();
  search.set("limit", "200");
  search.set("offset", "0");
  if (params?.declined) {
    search.set("declined", "true");
  }
  return `${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}?${search.toString()}`;
}

export function createMergeRecommendationsQueryFn(params?: MergeRecommendationsParams) {
  const fetch = createClientFetcher();
  const path = buildMergeRecommendationsPath(params);
  return async (): Promise<MergeRecommendation[]> => {
    const raw = await fetch<MergeRecommendationsResponse>(path);
    const { items } = normalizePaginatedList<MergeRecommendation, "recommendations">(
      raw,
      "recommendations",
      200,
    );
    return items;
  };
}

export function createEnrichEligibleCountQueryFn() {
  const fetch = createClientFetcher();
  return async (): Promise<number> => {
    const raw = await fetch<{ count?: number }>(`${API_ROUTES.CONTACTS}/enrich-queue/eligible-count`);
    return raw.count ?? 0;
  };
}

export interface EnrichQueueStatus {
  pending: number;
  completed: number;
  failed: number;
}

export function createEnrichQueueStatusQueryFn() {
  const fetch = createClientFetcher();
  return async (): Promise<EnrichQueueStatus | null> => {
    const raw = await fetch<EnrichQueueStatus>(`${API_ROUTES.CONTACTS}/enrich-queue/status`);
    if (!raw || raw.pending <= 0) return null;
    return raw;
  };
}
