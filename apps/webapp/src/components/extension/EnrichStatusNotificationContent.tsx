"use client";

import { PersonChip } from "@bondery/mantine-next";
import { Group, Progress, Stack, Text } from "@mantine/core";
import { useSyncExternalStore } from "react";
import { defaultState, getState, subscribe } from "@/lib/extension/enrichBatchStore";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

/**
 * Live notification body for the batch LinkedIn enrichment status tray.
 *
 * This component is passed as the `message` to a persistent Mantine
 * notification. Because it subscribes directly to `enrichBatchStore` via
 * `useSyncExternalStore`, it re-renders itself on every state change without
 * any external `notifications.update()` calls.
 */
export function EnrichStatusNotificationContent() {
  const t = useWebTranslations("EnrichFromLinkedIn");
  const { completed, failed, totalEligible, currentPerson } = useSyncExternalStore(
    subscribe,
    getState,
    () => defaultState,
  );

  const progress = totalEligible > 0 ? ((completed + failed) / totalEligible) * 100 : 0;

  return (
    <Stack gap="xs" mt={4}>
      <Group align="center" justify="space-between" wrap="nowrap">
        {currentPerson ? (
          <Group align="center" gap="xs" wrap="nowrap">
            <Text c="dimmed" size="xs" style={{ whiteSpace: "nowrap" }}>
              {t("CurrentlyEnriching")}
            </Text>
            <PersonChip isClickable openInNewTab person={currentPerson} size="sm" />
          </Group>
        ) : (
          <span />
        )}
        {totalEligible > 0 && (
          <Text c="dimmed" size="xs" style={{ whiteSpace: "nowrap" }}>
            {t("ProgressCount", { completed, totalEligible })}
          </Text>
        )}
      </Group>
      {totalEligible > 0 && <Progress color="blue" size="md" value={progress} />}
    </Stack>
  );
}
