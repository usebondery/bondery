"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Group, Progress, Stack, Text } from "@mantine/core";
import { PersonChip } from "@bondery/mantine-next";
import { defaultState, getState, subscribe } from "./enrichBatchStore";

/**
 * Live notification body for the batch LinkedIn enrichment status tray.
 *
 * This component is passed as the `message` to a persistent Mantine
 * notification. Because it subscribes directly to `enrichBatchStore` via
 * `useSyncExternalStore`, it re-renders itself on every state change without
 * any external `notifications.update()` calls.
 */
export function EnrichStatusNotificationContent() {
  const t = useTranslations("EnrichFromLinkedIn");
  const { completed, failed, totalEligible, currentPerson } = useSyncExternalStore(
    subscribe,
    getState,
    () => defaultState,
  );

  const progress = totalEligible > 0 ? ((completed + failed) / totalEligible) * 100 : 0;

  return (
    <Stack gap="xs" mt={4}>
      <Group justify="space-between" align="center" wrap="nowrap">
        {currentPerson ? (
          <Group gap="xs" align="center" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {t("CurrentlyEnriching")}
            </Text>
            <PersonChip person={currentPerson} size="sm" isClickable openInNewTab />
          </Group>
        ) : (
          <span />
        )}
        {totalEligible > 0 && (
          <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {t("ProgressCount", { completed, totalEligible })}
          </Text>
        )}
      </Group>
      {totalEligible > 0 && <Progress value={progress} size="md" color="blue" />}
    </Stack>
  );
}
