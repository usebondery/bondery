import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/types";

/**
 * Fetches merge recommendations from the API.
 *
 * @param precomputedHeaders - Optional pre-fetched auth headers to avoid redundant getAuthHeaders() calls.
 * @returns Array of merge recommendations.
 */
export async function getMergeRecommendationsData(
  precomputedHeaders?: HeadersInit,
): Promise<MergeRecommendation[]> {
  const headers = precomputedHeaders ?? (await getAuthHeaders());
  const response = await fetch(`${API_URL}${API_ROUTES.CONTACTS}/merge-recommendations`, {
    next: { tags: ["merge-recommendations"] },
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch merge recommendations: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as MergeRecommendationsResponse;
  return data.recommendations || [];
}
