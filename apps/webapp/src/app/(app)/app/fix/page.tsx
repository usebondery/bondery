import type { Metadata } from "next";
import { FixContactsClient } from "./FixContactsClient";
import { getMergeRecommendationsData } from "./getMergeRecommendationsData";

export const metadata: Metadata = { title: "Fix & merge" };

export default async function FixPage() {
  const recommendations = await getMergeRecommendationsData();

  return <FixContactsClient initialRecommendations={recommendations} />;
}
