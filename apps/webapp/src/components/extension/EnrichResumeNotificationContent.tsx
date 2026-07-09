"use client";

import { Button, Group, Text } from "@mantine/core";
import { IconPlayerPlayFilled, IconTrash } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { defaultState, getState, subscribe } from "@/lib/extension/enrichBatchStore";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useBatchEnrichFromLinkedIn } from "./useBatchEnrichFromLinkedIn";

/**
 * Live notification body for the interrupted-enrichment resume prompt.
 */
export function EnrichResumeNotificationContent() {
  const t = useWebTranslations("EnrichFromLinkedIn");
  const { resume, discard } = useBatchEnrichFromLinkedIn();

  const { pendingQueueStatus } = useSyncExternalStore(subscribe, getState, () => defaultState);

  if (!pendingQueueStatus) {
    return null;
  }

  const handleResume = () => {
    resume(pendingQueueStatus);
  };

  const handleDiscard = async () => {
    await discard();
  };

  return (
    <Group align="center" justify="space-between" mt={4} wrap="nowrap">
      <Text c="dimmed" size="xs">
        {t("ResumeCount", {
          completed: pendingQueueStatus.completed,
          pending: pendingQueueStatus.pending,
        })}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Button
          leftSection={<IconTrash size={12} />}
          onClick={handleDiscard}
          size="xs"
          variant="default"
        >
          {t("SkipRemaining")}
        </Button>
        <Button
          color="blue"
          leftSection={<IconPlayerPlayFilled size={12} />}
          onClick={handleResume}
          size="xs"
        >
          {t("Resume")}
        </Button>
      </Group>
    </Group>
  );
}
