"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  PersonChip,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Button, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowMerge, IconEye, IconEyeOff, IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MergeRecommendationCard } from "@/components/contacts/MergeRecommendationCard";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { syncMergeRecommendationsAfterChange } from "@/lib/merge/syncMergeRecommendations";
import {
  useEnrichQueueCountQuery,
  useEnrichQueueStatusQuery,
} from "@/lib/query/hooks/useEnrichQueue";
import {
  useMergeRecommendationsQuery,
  useRefreshMergeRecommendationsMutation,
  useRestoreMergeRecommendationMutation,
} from "@/lib/query/hooks/useMergeRecommendations";
import { EnrichRecommendationCard } from "./components/EnrichRecommendationCard";

export function FixClient() {
  const tCommon = useCommonTranslations();

  const t = useWebTranslations("FixContactsPage");
  const tMerge = useWebTranslations("MergeWithModal");
  const [showDeclined, setShowDeclined] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const didBootstrapRefresh = useRef(false);

  const { data: recommendations = [], isFetching: isListFetching } =
    useMergeRecommendationsQuery(showDeclined);
  const { data: eligibleCount = 0 } = useEnrichQueueCountQuery();
  const { data: queueStatus = null } = useEnrichQueueStatusQuery();
  const refreshMutation = useRefreshMergeRecommendationsMutation();
  const restoreMutation = useRestoreMergeRecommendationMutation();

  useEffect(() => {
    if (didBootstrapRefresh.current || showDeclined || isListFetching) {
      return;
    }
    if (recommendations.length > 0) {
      didBootstrapRefresh.current = true;
      return;
    }
    didBootstrapRefresh.current = true;
    void syncMergeRecommendationsAfterChange(queryClient, { requestRefresh: true });
  }, [isListFetching, queryClient, recommendations.length, showDeclined]);

  const handleRefreshSuggestions = async () => {
    try {
      const refreshPayload = await refreshMutation.mutateAsync();
      const recommendationsCount = Math.max(0, Number(refreshPayload.recommendationsCount) || 0);
      setShowDeclined(false);

      notifications.show(
        successNotificationTemplate({
          description:
            recommendationsCount === 0
              ? t("NoNewSuggestionsFound")
              : t("NewSuggestionsFound", { count: recommendationsCount }),
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

  const handleRecommendationViewChange = (nextView: "active" | "hidden") => {
    setShowDeclined(nextView === "hidden");
  };

  const handleRestore = async (recommendationId: string) => {
    setRestoringIds((prev) => new Set(prev).add(recommendationId));

    try {
      await restoreMutation.mutateAsync(recommendationId);
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
          helpDoc="concepts.merge"
          helpLabel={t("Description")}
          icon={IconArrowMerge}
          primaryAction={
            <Button
              leftSection={<IconRefresh size={16} />}
              loading={refreshMutation.isPending}
              onClick={() => void handleRefreshSuggestions()}
              size="md"
            >
              {t("RefreshSuggestions")}
            </Button>
          }
          secondaryAction={
            <SegmentedControl
              data={[
                {
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconEye size={14} />
                      <span>{t("ActiveRecommendations")}</span>
                    </Group>
                  ),
                  value: "active",
                },
                {
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconEyeOff size={14} />
                      <span>{t("HiddenRecommendations")}</span>
                    </Group>
                  ),
                  value: "hidden",
                },
              ]}
              disabled={isRefreshing}
              onChange={(value) => handleRecommendationViewChange(value as "active" | "hidden")}
              value={showDeclined ? "hidden" : "active"}
            />
          }
          title={t("Title")}
        />

        {!showDeclined && (
          <EnrichRecommendationCard eligibleCount={eligibleCount} queueStatus={queueStatus} />
        )}

        {recommendations.length === 0 ? (
          <Paper p="md" radius="md" withBorder>
            <Text c="dimmed" size="sm">
              {showDeclined ? t("DeclinedEmpty") : t("Empty")}
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {recommendations.map((recommendation) =>
              showDeclined ? (
                <Paper key={recommendation.id} p="md" radius="md" withBorder>
                  <Group align="center" justify="space-between" wrap="nowrap">
                    <Group align="center" wrap="nowrap">
                      <PersonChip isClickable person={recommendation.leftPerson} />
                      <Text c="dimmed" fw={500} size="sm">
                        {tMerge("MergeWithLabel")}
                      </Text>
                      <PersonChip isClickable person={recommendation.rightPerson} />
                    </Group>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      loading={restoringIds.has(recommendation.id)}
                      onClick={() => void handleRestore(recommendation.id)}
                      variant="default"
                    >
                      {t("RestoreSuggestion")}
                    </Button>
                  </Group>
                </Paper>
              ) : (
                <MergeRecommendationCard
                  contacts={[recommendation.leftPerson, recommendation.rightPerson]}
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ),
            )}
          </Stack>
        )}
      </Stack>
    </PageWrapper>
  );
}
