"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowMerge, IconEye, IconEyeOff, IconRefresh } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  PersonChip,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { MergeRecommendationCard } from "../components/contacts/MergeRecommendationCard";
import { EnrichRecommendationCard } from "./components/EnrichRecommendationCard";
import {
  useEnrichEligibleCountQuery,
  useEnrichQueueStatusQuery,
  useMergeRecommendationsQuery,
  useRefreshMergeRecommendationsMutation,
  useRestoreMergeRecommendationMutation,
} from "@/lib/query/hooks/useMergeRecommendations";
import { invalidateMergeRecommendationDomain } from "@/lib/query/invalidation";

export function FixContactsClient() {
  const t = useTranslations("FixContactsPage");
  const tMerge = useTranslations("MergeWithModal");
  const queryClient = useQueryClient();
  const [showDeclined, setShowDeclined] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  const { data: recommendations = [], isFetching: isListFetching } =
    useMergeRecommendationsQuery(showDeclined);
  const { data: eligibleCount = 0 } = useEnrichEligibleCountQuery();
  const { data: queueStatus = null } = useEnrichQueueStatusQuery();
  const refreshMutation = useRefreshMergeRecommendationsMutation();
  const restoreMutation = useRestoreMergeRecommendationMutation();

  const invalidateRecommendations = () => invalidateMergeRecommendationDomain(queryClient);

  const handleRefreshSuggestions = async () => {
    try {
      const refreshPayload = await refreshMutation.mutateAsync();
      const recommendationsCount = Math.max(
        0,
        Number(refreshPayload.recommendationsCount) || 0,
      );
      setShowDeclined(false);

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description:
            recommendationsCount === 0
              ? t("NoNewSuggestionsFound")
              : t("NewSuggestionsFound", { count: recommendationsCount }),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("RefreshError"),
        }),
      );
    }
  };

  const handleRecommendationViewChange = (nextView: "active" | "hidden") => {
    setShowDeclined(nextView === "hidden");
  };

  const handleRestore = async (recommendationId: string) => {
    setRestoringIds((prev) => new Set(prev).add(recommendationId));

    try {
      await restoreMutation.mutateAsync(recommendationId);
      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("RestoreSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("RestoreError"),
        }),
      );
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  const isRefreshing = isListFetching || refreshMutation.isPending;

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconArrowMerge}
          title={t("Title")}
          secondaryAction={
            <SegmentedControl
              value={showDeclined ? "hidden" : "active"}
              onChange={(value) => handleRecommendationViewChange(value as "active" | "hidden")}
              disabled={isRefreshing}
              data={[
                {
                  value: "active",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconEye size={14} />
                      <span>{t("ActiveRecommendations")}</span>
                    </Group>
                  ),
                },
                {
                  value: "hidden",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconEyeOff size={14} />
                      <span>{t("HiddenRecommendations")}</span>
                    </Group>
                  ),
                },
              ]}
            />
          }
          primaryAction={
            <Button
              size="md"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void handleRefreshSuggestions()}
              loading={refreshMutation.isPending}
            >
              {t("RefreshSuggestions")}
            </Button>
          }
          helpLabel={t("Description")}
          helpDoc="concepts.merge"
        />

        {!showDeclined && (
          <EnrichRecommendationCard eligibleCount={eligibleCount} queueStatus={queueStatus} />
        )}

        {recommendations.length === 0 ? (
          <Paper withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">
              {showDeclined ? t("DeclinedEmpty") : t("Empty")}
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {recommendations.map((recommendation) =>
              showDeclined ? (
                <Paper key={recommendation.id} withBorder radius="md" p="md">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group align="center" wrap="nowrap">
                      <PersonChip person={recommendation.leftPerson} isClickable />
                      <Text c="dimmed" size="sm" fw={500}>
                        {tMerge("MergeWithLabel")}
                      </Text>
                      <PersonChip person={recommendation.rightPerson} isClickable />
                    </Group>
                    <Button
                      variant="default"
                      leftSection={<IconRefresh size={16} />}
                      onClick={() => void handleRestore(recommendation.id)}
                      loading={restoringIds.has(recommendation.id)}
                    >
                      {t("RestoreSuggestion")}
                    </Button>
                  </Group>
                </Paper>
              ) : (
                <MergeRecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  contacts={[recommendation.leftPerson, recommendation.rightPerson]}
                  onAccepted={() => void invalidateRecommendations()}
                  onDeclined={() => void invalidateRecommendations()}
                />
              ),
            )}
          </Stack>
        )}
      </Stack>
    </PageWrapper>
  );
}
