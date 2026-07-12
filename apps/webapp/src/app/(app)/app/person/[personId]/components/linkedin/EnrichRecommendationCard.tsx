"use client";

import { HelpButton, PersonChip } from "@bondery/mantine-next";
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
  linkedinHandle: string | null;
  personId: string;
}

/**
 * Recommendation card displayed on the person detail page when the contact
 * has a LinkedIn handle but has never been enriched.
 *
 * Uses the same batch-queue approach as the Fix & Merge page card, so the
 * persistent EnrichStatusNotificationManager reflects the progress and
 * pause/resume/discard are fully supported.
 */
export function EnrichRecommendationCard({
  personId,
  linkedinHandle,
}: EnrichRecommendationCardProps) {
  const t = useEnrichRecommendationCardTranslations();
  const {
    startForPerson,
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

  const hasInterruptedRun =
    pendingQueueStatus !== null && pendingQueueStatus.pending > 0 && !isRunning && !isLoading;

  const handleResume = () => {
    if (pendingQueueStatus) {
      resume(pendingQueueStatus);
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
            <Group align="center" gap={4} wrap="nowrap">
              <Text fw={500} size="sm">
                {isRunning
                  ? failed > 0
                    ? t("ProgressLabelWithFailed", { completed, failed, totalEligible })
                    : t("ProgressLabel", { completed, totalEligible })
                  : hasInterruptedRun && pendingQueueStatus
                    ? t("ResumeLabel", {
                        completed: pendingQueueStatus.completed,
                        pending: pendingQueueStatus.pending,
                      })
                    : t("PersonEligibleLabel")}
              </Text>
              <HelpButton
                doc="bondery.chrome-extension.enriching-contact"
                label={t("HelpTooltip")}
              />
            </Group>
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
              onClick={() => startForPerson(personId, linkedinHandle)}
            >
              {t("Enrich")}
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
