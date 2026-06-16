"use client";

import { Box, Button, Group, Loader, Paper, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { PersonChip } from "@bondery/mantine-next";
import {
  IconBrandLinkedin,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerPlayFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useBatchEnrichFromLinkedIn } from "@/lib/extension/useBatchEnrichFromLinkedIn";
import { useRouter } from "next/navigation";

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
  const t = useTranslations("EnrichRecommendationCard");
  const router = useRouter();
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
    router.refresh();
  };

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{ borderLeft: "2px solid var(--mantine-color-blue-6)" }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group align="center" wrap="nowrap">
            <Tooltip label={t("Tooltip")} multiline maw={280} withArrow>
              <Group gap={4} align="center" wrap="nowrap" style={{ cursor: "default" }}>
                <IconBrandLinkedin size={14} color="var(--mantine-color-blue-6)" />
                <Text size="sm" fw={600} c="blue.6">
                  {t("Badge")}
                </Text>
              </Group>
            </Tooltip>
            <Text size="sm" fw={500}>
              {isRunning
                ? failed > 0
                  ? t("ProgressLabelWithFailed", { completed, failed, totalEligible })
                  : t("ProgressLabel", { completed, totalEligible })
                : hasInterruptedRun
                  ? t("ResumeLabel", {
                      completed: effectiveQueueStatus!.completed,
                      pending: effectiveQueueStatus!.pending,
                    })
                  : t("EligibleLabel", { count: eligibleCount })}
            </Text>
          </Group>

          {isRunning && currentPerson && (
            <Group gap="xs" align="center" wrap="nowrap">
              <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {t("CurrentlyEnriching")}
              </Text>
              <PersonChip person={currentPerson} size="sm" isClickable openInNewTab />
            </Group>
          )}

          {isRunning ? (
            <Tooltip label={t("PausingTooltip")} withArrow disabled={!isPausing}>
              <Box component="span" display="inline-block">
                <Button
                  variant="default"
                  leftSection={<IconPlayerPause size={16} />}
                  onClick={pause}
                  disabled={isPausing}
                >
                  {t("Pause")}
                </Button>
              </Box>
            </Tooltip>
          ) : hasInterruptedRun ? (
            <Group gap="xs" wrap="nowrap">
              <Button
                variant="default"
                leftSection={<IconTrash size={16} />}
                onClick={handleDiscard}
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
                isLoading ? <Loader size={14} color="white" /> : <IconBrandLinkedin size={16} />
              }
              onClick={start}
              disabled={isLoading}
            >
              {t("EnrichAll")}
            </Button>
          )}
        </Group>

        {isRunning && totalEligible > 0 && (
          <Progress value={((completed + failed) / totalEligible) * 100} size="md" color="blue" />
        )}
      </Stack>
    </Paper>
  );
}
