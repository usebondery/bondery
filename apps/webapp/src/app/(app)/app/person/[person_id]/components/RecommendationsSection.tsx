"use client";

import { Stack } from "@mantine/core";
import type { MergeRecommendation } from "@bondery/types";
import { MergeRecommendationCard } from "@/app/(app)/app/components/contacts/MergeRecommendationCard";
import { MyselfRecommendationCard } from "@/app/(app)/app/components/contacts/MyselfRecommendationCard";
import type { MergeWithModalTexts } from "../../../people/components/MergeWithModal";
import { EnrichRecommendationCard } from "./EnrichRecommendationCard";

interface RecommendationsSectionProps {
  mergeRecommendation: MergeRecommendation | null;
  mergeTexts: MergeWithModalTexts;
  onMergeAccepted: () => void;
  onMergeDeclined: () => void;
  showEnrichCard: boolean;
  showMyselfCard: boolean;
  personId: string;
  linkedinHandle: string | null;
}

/**
 * Displays recommendation cards (merge duplicates, LinkedIn enrichment, myself)
 * above the main person detail content.
 */
export function RecommendationsSection({
  mergeRecommendation,
  mergeTexts,
  onMergeAccepted,
  onMergeDeclined,
  showEnrichCard,
  showMyselfCard,
  personId,
  linkedinHandle,
}: RecommendationsSectionProps) {
  if (!mergeRecommendation && !showEnrichCard && !showMyselfCard) {
    return null;
  }

  return (
    <Stack gap="sm">
      {showMyselfCard && <MyselfRecommendationCard />}

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

      {showEnrichCard && (
        <EnrichRecommendationCard personId={personId} linkedinHandle={linkedinHandle} />
      )}
    </Stack>
  );
}

