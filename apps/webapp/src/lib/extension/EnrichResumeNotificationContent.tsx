"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button, Group, Text } from "@mantine/core";
import { IconPlayerPlay, IconPlayerPlayFilled, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { defaultState, getState, subscribe } from "./enrichBatchStore";
import { useBatchEnrichFromLinkedIn } from "./useBatchEnrichFromLinkedIn";

/**
 * Live notification body for the interrupted-enrichment resume prompt.
 *
 * Rendered as the `message` of the persistent `"enrich-resume"` notification.
 * Subscribes directly to `enrichBatchStore` so it re-renders on state changes
 * without needing `notifications.update()`.
 *
 * Shows the interrupted count, and Resume / Discard action buttons.
 */
export function EnrichResumeNotificationContent() {
  const t = useTranslations("EnrichFromLinkedIn");
  const router = useRouter();
  const { resume, discard } = useBatchEnrichFromLinkedIn();

  const { pendingQueueStatus } = useSyncExternalStore(subscribe, getState, () => defaultState);

  if (!pendingQueueStatus) return null;

  const handleResume = () => {
    resume(pendingQueueStatus);
  };

  const handleDiscard = async () => {
    await discard();
    router.refresh();
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
