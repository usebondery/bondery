"use client";

import { useSyncExternalStore } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { Button, Group, Text } from "@mantine/core";
import { IconPlayerPlayFilled, IconTrash } from "@tabler/icons-react";
import { getQueryClient } from "@/lib/query/client";
import { invalidateAfterEnrichBatch } from "@/lib/query/invalidation";
import { defaultState, getState, subscribe } from "./enrichBatchStore";
import { useBatchEnrichFromLinkedIn } from "./useBatchEnrichFromLinkedIn";

/**
 * Live notification body for the interrupted-enrichment resume prompt.
 */
export function EnrichResumeNotificationContent() {
  const t = useTranslations("EnrichFromLinkedIn");
  const { resume, discard } = useBatchEnrichFromLinkedIn();

  const { pendingQueueStatus } = useSyncExternalStore(subscribe, getState, () => defaultState);

  if (!pendingQueueStatus) return null;

  const handleResume = () => {
    resume(pendingQueueStatus);
  };

  const handleDiscard = async () => {
    await discard();
    await invalidateAfterEnrichBatch(getQueryClient());
  };

  return (
    <Group justify="space-between" align="center" wrap="nowrap" mt={4}>
      <Text size="xs" c="dimmed">
        {t("ResumeCount", {
          completed: pendingQueueStatus.completed,
          pending: pendingQueueStatus.pending,
        })}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Button
          size="xs"
          variant="default"
          leftSection={<IconTrash size={12} />}
          onClick={handleDiscard}
        >
          {t("SkipRemaining")}
        </Button>
        <Button
          size="xs"
          color="blue"
          leftSection={<IconPlayerPlayFilled size={12} />}
          onClick={handleResume}
        >
          {t("Resume")}
        </Button>
      </Group>
    </Group>
  );
}
