import { FixContactsClient } from "./FixContactsClient";
import { getMergeRecommendationsData } from "./getMergeRecommendationsData";

export default async function FixPage() {
  const recommendations = await getMergeRecommendationsData();

  return <FixContactsClient initialRecommendations={recommendations} />;
}
