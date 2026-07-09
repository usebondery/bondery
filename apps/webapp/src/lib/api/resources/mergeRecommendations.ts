import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";

export interface MergeRecommendationsParams {
  declined?: boolean;
}

export const ENRICH_ELIGIBLE_COUNT_PATH = `${API_ROUTES.CONTACTS}/enrich-queue/eligible-count`;
export const ENRICH_QUEUE_STATUS_PATH = `${API_ROUTES.CONTACTS}/enrich-queue/status`;

export function buildMergeRecommendationsPath(params?: MergeRecommendationsParams): string {
  const search = new URLSearchParams();
  search.set("limit", "200");
  search.set("offset", "0");
  if (params?.declined) {
    search.set("declined", "true");
  }
  return `${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}?${search.toString()}`;
}

export function parseMergeRecommendations(
  raw: MergeRecommendationsResponse,
): MergeRecommendation[] {
  const { items } = normalizePaginatedList<MergeRecommendation, "recommendations">(
    raw,
    "recommendations",
    200,
  );
  return items;
}

export function parseEnrichEligibleCount(raw: { count?: number }): number {
  return raw.count ?? 0;
}

export interface EnrichQueueStatus {
  completed: number;
  failed: number;
  pending: number;
}

export function parseEnrichQueueStatus(
  raw: EnrichQueueStatus | null | undefined,
): EnrichQueueStatus | null {
  if (!raw || raw.pending <= 0) {
    return null;
  }
  return raw;
}
