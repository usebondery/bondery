"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { detachPromise } from "@bondery/helpers/async";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { MergeRecommendation } from "@bondery/schemas";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconRefresh } from "@tabler/icons-react";
import { RecommendationCard } from "@/components/contacts/RecommendationCard";
import { useCommonTranslations, useFixContactsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useRestoreMergeRecommendationMutation } from "@/lib/query/hooks/useMergeRecommendations";

interface HiddenRecommendationCardProps {
  recommendation: MergeRecommendation;
}

/**
 * A declined merge suggestion. Uses the same shell as the active card, with
 * Restore in place of Decline and Merge.
 */
export function HiddenRecommendationCard({ recommendation }: HiddenRecommendationCardProps) {
  const t = useFixContactsPageTranslations();
  const tCommon = useCommonTranslations();
  const restoreMutation = useRestoreMergeRecommendationMutation();

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync(recommendation.id);
      notifications.show(
        successNotificationTemplate({
          description: t("RestoreSuccess"),
          title: t("SuccessTitle"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
    }
  };

  return (
    <RecommendationCard
      accent="yellow"
      actions={
        <Button
          leftSection={<IconRefresh size={16} />}
          loading={restoreMutation.isPending}
          onClick={() => detachPromise(handleRestore())}
          variant="default"
        >
          {t("RestoreSuggestion")}
        </Button>
      }
      recommendation={recommendation}
    />
  );
}
