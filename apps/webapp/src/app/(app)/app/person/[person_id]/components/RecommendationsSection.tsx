"use client";

import { Stack } from "@mantine/core";
import type { MergeRecommendation } from "@bondery/types";
import { MergeRecommendationCard } from "@/app/(app)/app/components/contacts/MergeRecommendationCard";
import { EnrichRecommendationCard } from "./EnrichRecommendationCard";

interface RecommendationsSectionProps {
  mergeRecommendation: MergeRecommendation | null;
  onMergeAccepted: () => void;
  onMergeDeclined: () => void;
  showEnrichCard: boolean;
  personId: string;
  linkedinHandle: string | null;
}

/**
 * Displays recommendation cards (merge duplicates, LinkedIn enrichment)
 * above the main person detail content.
 */
export function RecommendationsSection({
  mergeRecommendation,
  onMergeAccepted,
  onMergeDeclined,
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
          recommendation={mergeRecommendation}
          contacts={[mergeRecommendation.leftPerson, mergeRecommendation.rightPerson]}
          onAccepted={onMergeAccepted}
          onDeclined={onMergeDeclined}
          redirectAfterMerge
        />
      )}

      {showEnrichCard && (
        <EnrichRecommendationCard personId={personId} linkedinHandle={linkedinHandle} />
      )}
    </Stack>
  );
}
