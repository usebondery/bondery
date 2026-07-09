"use client";

import type { MergeRecommendation } from "@bondery/schemas";
import { Stack } from "@mantine/core";
import { MergeRecommendationCard } from "@/app/(app)/app/components/contacts/MergeRecommendationCard";
import { EnrichRecommendationCard } from "./EnrichRecommendationCard";

interface RecommendationsSectionProps {
  linkedinHandle: string | null;
  mergeRecommendation: MergeRecommendation | null;
  personId: string;
  showEnrichCard: boolean;
}

/**
 * Displays recommendation cards (merge duplicates, LinkedIn enrichment)
 * above the main person detail content.
 */
export function RecommendationsSection({
  mergeRecommendation,
  showEnrichCard,
  personId,
  linkedinHandle,
}: RecommendationsSectionProps) {
  if (!mergeRecommendation && !showEnrichCard) {
    return null;
  }

  return (
    <Stack gap="sm">
      {mergeRecommendation && (
        <MergeRecommendationCard
          contacts={[mergeRecommendation.leftPerson, mergeRecommendation.rightPerson]}
          recommendation={mergeRecommendation}
          redirectAfterMerge
        />
      )}

      {showEnrichCard && (
        <EnrichRecommendationCard linkedinHandle={linkedinHandle} personId={personId} />
      )}
    </Stack>
  );
}
