import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";

export interface MergeRecommendationsParams {
  declined?: boolean;
}

export const MERGE_RECOMMENDATIONS_COUNT_PATH = API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS_COUNT;

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

export function parseMergeRecommendationsCount(raw: { activeCount?: number }): number {
  return raw.activeCount ?? 0;
}
