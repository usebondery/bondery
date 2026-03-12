"use client";

import { Stack } from "@mantine/core";
import type { Contact, MergeRecommendation } from "@bondery/types";
import { MergeRecommendationCard } from "@/app/(app)/app/components/contacts/MergeRecommendationCard";
import type { MergeWithModalTexts } from "../../../people/components/MergeWithModal";
import { EnrichRecommendationCard } from "./EnrichRecommendationCard";

interface RecommendationsSectionProps {
  mergeRecommendation: MergeRecommendation | null;
  mergeTexts: MergeWithModalTexts;
  onMergeAccepted: () => void;
  onMergeDeclined: () => void;
  showEnrichCard: boolean;
  onEnrich: () => void;
}

/**
 * Displays recommendation cards (merge duplicates, LinkedIn enrichment)
 * above the main person detail content.
 */
export function RecommendationsSection({
  mergeRecommendation,
  mergeTexts,
  onMergeAccepted,
  onMergeDeclined,
  showEnrichCard,
  onEnrich,
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
          mergeTexts={mergeTexts}
          onAccepted={onMergeAccepted}
          onDeclined={onMergeDeclined}
          redirectAfterMerge
        />
      )}

      {showEnrichCard && <EnrichRecommendationCard onEnrich={onEnrich} />}
    </Stack>
  );
}
