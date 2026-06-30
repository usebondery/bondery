import { serverApiJson } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";

/**
 * Fetches merge recommendations from the API.
 *
 * @returns Array of merge recommendations.
 */
export async function getMergeRecommendationsData(): Promise<MergeRecommendation[]> {
  const data = await serverApiJson<MergeRecommendationsResponse>(
    API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS,
    undefined,
    { next: { tags: ["merge-recommendations"] } },
  );
  return data.recommendations || [];
}
