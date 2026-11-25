"use client";

import { detachPromise } from "@bondery/helpers/async";
import { PersonChip } from "@bondery/mantine-next";
import { Box, Button, Group, Loader, Progress, Text, Tooltip } from "@mantine/core";
import {
  IconBrandLinkedin,
  IconPlayerPause,
  IconPlayerPlayFilled,
  IconTrash,
} from "@tabler/icons-react";
import { RecommendationCard } from "@/components/contacts/RecommendationCard";
import { useBatchEnrichFromLinkedIn } from "@/components/extension/useBatchEnrichFromLinkedIn";
import { useEnrichRecommendationCardTranslations } from "@/lib/i18n/generated/hooks";

interface EnrichRecommendationCardProps {
  eligibleCount: number;
  queueStatus: { pending: number; completed: number; failed: number } | null;
}

/**
 * Card shown on the Fix & Merge page recommending batch enrichment
 * of contacts that have a LinkedIn handle but no synced data.
 *
 * When `queueStatus` indicates pending items from a previous interrupted run,
 * shows a resume/discard prompt instead of the normal "Enrich all" button.
 */
export function EnrichRecommendationCard({
  eligibleCount,
  queueStatus,
}: EnrichRecommendationCardProps) {
  const t = useEnrichRecommendationCardTranslations();
  const {
    start,
    resume,
    pause,
    discard,
    isLoading,
    isRunning,
    isPausing,
    totalEligible,
    completed,
    failed,
    currentPerson,
    pendingQueueStatus,
  } = useBatchEnrichFromLinkedIn();

  // After a pause, pendingQueueStatus is set in the store immediately.
  // Fall back to the server-provided queueStatus for the initial page load case.
  const effectiveQueueStatus = pendingQueueStatus ?? queueStatus;
  const hasInterruptedRun =
    effectiveQueueStatus !== null && effectiveQueueStatus.pending > 0 && !isRunning && !isLoading;

  if (eligibleCount === 0 && !isRunning && !isLoading && !hasInterruptedRun) {
    return null;
  }

  const handleResume = () => {
    if (effectiveQueueStatus) {
      detachPromise(resume(effectiveQueueStatus));
    }
  };
  const handleDiscard = async () => {
    await discard();
  };

  const resolveStatusText = () => {
    if (isRunning) {
      if (failed > 0) {
        return t("ProgressLabelWithFailed", { completed, failed, totalEligible });
      }
      return t("ProgressLabel", { completed, totalEligible });
    }
    if (hasInterruptedRun && effectiveQueueStatus) {
      return t("ResumeLabel", {
        completed: effectiveQueueStatus.completed,
        pending: effectiveQueueStatus.pending,
      });
    }
    return t("EligibleLabel", { count: eligibleCount });
  };
  const statusText = resolveStatusText();

  const resolveActions = () => {
    if (isRunning) {
      return (
        <Tooltip disabled={!isPausing} label={t("PausingTooltip")}>
          <Box component="span" display="inline-block">
            <Button
              disabled={isPausing}
              leftSection={<IconPlayerPause size={16} />}
              onClick={pause}
              variant="default"
            >
              {t("Pause")}
            </Button>
          </Box>
        </Tooltip>
      );
    }
    if (hasInterruptedRun) {
      return (
        <>
          <Button leftSection={<IconTrash size={16} />} onClick={handleDiscard} variant="default">
            {t("SkipRemaining")}
          </Button>
          <Button
            color="blue"
            leftSection={<IconPlayerPlayFilled size={16} />}
            onClick={handleResume}
          >
            {t("Resume")}
          </Button>
        </>
      );
    }
    return (
      <Button
        color="blue"
        leftSection={
          isLoading ? <Loader color="white" size={14} /> : <IconBrandLinkedin size={16} />
        }
        onClick={start}
      >
        {t("EnrichAll")}
      </Button>
    );
  };
  const actions = resolveActions();

  return (
    <RecommendationCard
      accent="blue"
      actions={actions}
      badgeIcon={<IconBrandLinkedin color="var(--mantine-color-blue-6)" size={14} />}
      badgeLabel={t("Badge")}
      badgeTooltip={t("Tooltip")}
    >
      <Text fw={500} size="sm">
        {statusText}
      </Text>
      {isRunning && currentPerson ? (
        <Group align="center" gap="xs" wrap="nowrap">
          <Text c="dimmed" size="xs">
            {t("CurrentlyEnriching")}
          </Text>
          <PersonChip isClickable openInNewTab person={currentPerson} size="sm" />
        </Group>
      ) : null}
      {isRunning && totalEligible > 0 ? (
        <Progress color="blue" size="md" value={((completed + failed) / totalEligible) * 100} />
      ) : null}
    </RecommendationCard>
  );
}
