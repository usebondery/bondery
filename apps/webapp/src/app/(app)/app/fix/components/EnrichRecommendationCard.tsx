"use client";

import { PersonChip } from "@bondery/mantine-next";
import { Box, Button, Group, Loader, Paper, Progress, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconBrandLinkedin,
  IconPlayerPause,
  IconPlayerPlayFilled,
  IconTrash,
} from "@tabler/icons-react";
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
      resume(effectiveQueueStatus);
    }
  };

  const handleDiscard = async () => {
    await discard();
  };

  return (
    <Paper
      p="md"
      radius="md"
      style={{ borderLeft: "2px solid var(--mantine-color-blue-6)" }}
      withBorder
    >
      <Stack gap="sm">
        <Group align="center" justify="space-between" wrap="nowrap">
          <Group align="center" wrap="nowrap">
            <Tooltip label={t("Tooltip")} maw={280} multiline withArrow>
              <Group align="center" gap={4} style={{ cursor: "default" }} wrap="nowrap">
                <IconBrandLinkedin color="var(--mantine-color-blue-6)" size={14} />
                <Text c="blue.6" fw={600} size="sm">
                  {t("Badge")}
                </Text>
              </Group>
            </Tooltip>
            <Text fw={500} size="sm">
              {isRunning
                ? failed > 0
                  ? t("ProgressLabelWithFailed", { completed, failed, totalEligible })
                  : t("ProgressLabel", { completed, totalEligible })
                : hasInterruptedRun && effectiveQueueStatus
                  ? t("ResumeLabel", {
                      completed: effectiveQueueStatus.completed,
                      pending: effectiveQueueStatus.pending,
                    })
                  : t("EligibleLabel", { count: eligibleCount })}
            </Text>
          </Group>

          {isRunning && currentPerson && (
            <Group align="center" gap="xs" wrap="nowrap">
              <Text c="dimmed" size="xs" style={{ whiteSpace: "nowrap" }}>
                {t("CurrentlyEnriching")}
              </Text>
              <PersonChip isClickable openInNewTab person={currentPerson} size="sm" />
            </Group>
          )}

          {isRunning ? (
            <Tooltip disabled={!isPausing} label={t("PausingTooltip")} withArrow>
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
          ) : hasInterruptedRun ? (
            <Group gap="xs" wrap="nowrap">
              <Button
                leftSection={<IconTrash size={16} />}
                onClick={handleDiscard}
                variant="default"
              >
                {t("SkipRemaining")}
              </Button>
              <Button
                color="blue"
                leftSection={<IconPlayerPlayFilled size={16} />}
                onClick={handleResume}
              >
                {t("Resume")}
              </Button>
            </Group>
          ) : (
            <Button
              color="blue"
              leftSection={
                isLoading ? <Loader color="white" size={14} /> : <IconBrandLinkedin size={16} />
              }
              onClick={start}
            >
              {t("EnrichAll")}
            </Button>
          )}
        </Group>

        {isRunning && totalEligible > 0 && (
          <Progress color="blue" size="md" value={((completed + failed) / totalEligible) * 100} />
        )}
      </Stack>
    </Paper>
  );
}
