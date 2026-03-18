"use client";

import { Box, Button, Group, Loader, Paper, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { PersonChip } from "@bondery/mantine-next";
import {
  IconBrandLinkedin,
  IconPlayerPause,
  IconPlayerPlayFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useBatchEnrichFromLinkedIn } from "@/lib/extension/useBatchEnrichFromLinkedIn";
import { useRouter } from "next/navigation";

interface EnrichRecommendationCardProps {
  personId: string;
  linkedinHandle: string | null;
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
  const t = useTranslations("EnrichRecommendationCard");
  const router = useRouter();
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
                      completed: pendingQueueStatus!.completed,
                      pending: pendingQueueStatus!.pending,
                    })
                  : t("PersonEligibleLabel")}
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
              onClick={() => startForPerson(personId, linkedinHandle)}
              disabled={isLoading}
            >
              {t("Enrich")}
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
