import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  MergeRecommendation,
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
} from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  buildMergeRecommendationsPath,
  MERGE_RECOMMENDATIONS_COUNT_PATH,
  type MergeRecommendationsParams,
  parseMergeRecommendations,
  parseMergeRecommendationsCount,
} from "@/lib/api/resources/mergeRecommendations";

export type { MergeRecommendationsParams };

export async function getMergeRecommendations(
  params?: MergeRecommendationsParams,
): Promise<MergeRecommendation[]> {
  const raw = await clientApiJson<MergeRecommendationsResponse>(
    buildMergeRecommendationsPath(params),
  );
  return parseMergeRecommendations(raw);
}

export async function getMergeRecommendationsCount(): Promise<number> {
  const raw = await clientApiJson<{ activeCount: number }>(MERGE_RECOMMENDATIONS_COUNT_PATH);
  return parseMergeRecommendationsCount(raw);
}

export async function refreshMergeRecommendations(): Promise<RefreshMergeRecommendationsResponse> {
  return clientApiJson<RefreshMergeRecommendationsResponse>(
    API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS_REFRESH,
    { method: "POST" },
  );
}

export async function restoreMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/restore`, {
    method: "PATCH",
  });
}

export async function declineMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/decline`, {
    method: "PATCH",
  });
}
