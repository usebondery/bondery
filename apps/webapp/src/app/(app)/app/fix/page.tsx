import type { Metadata } from "next";
import { FixContactsClient } from "./FixContactsClient";
import { getMergeRecommendationsData } from "./getMergeRecommendationsData";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/lib/config";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

export const metadata: Metadata = { title: "Fix & merge" };

export default async function FixPage() {
  const headers = await getAuthHeaders();

  const [recommendations, eligibleCountRes, queueStatusRes] = await Promise.all([
    getMergeRecommendationsData(),
    fetch(`${API_URL}${API_ROUTES.CONTACTS}/enrich-queue/eligible-count`, { headers }).catch(
      () => null,
    ),
    fetch(`${API_URL}${API_ROUTES.CONTACTS}/enrich-queue/status`, { headers }).catch(() => null),
  ]);

  let eligibleCount = 0;
  if (eligibleCountRes?.ok) {
    const data = await eligibleCountRes.json();
    eligibleCount = data.count ?? 0;
  }

  let queueStatus: { pending: number; completed: number; failed: number } | null = null;
  if (queueStatusRes?.ok) {
    const data = await queueStatusRes.json();
    if (data.pending > 0) {
      queueStatus = data;
    }
  }

  return (
    <FixContactsClient
      initialRecommendations={recommendations}
      eligibleCount={eligibleCount}
      queueStatus={queueStatus}
    />
  );
}
