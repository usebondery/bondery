"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import { ActionIcon, Group, Paper, Progress, Stack, Text, Title } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";

import { openAddContactModal } from "@/app/(app)/app/people/components/modals/AddContactModal";
import {
  buildGettingStartedState,
  type GettingStartedTaskId,
  parseGettingStartedSettings,
} from "@/lib/home/gettingStartedItems";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useDismissGettingStartedMutation } from "@/lib/query/hooks/useSettings";
import { ProgressRailItem } from "./ProgressRailItem";

interface GettingStartedProgressRailProps {
  hasInteraction: boolean;
  settingsData?: Record<string, unknown>;

  timelineContacts: Contact[];

  totalContacts: number;
}

const TASK_LABEL_KEYS: Record<GettingStartedTaskId, string> = {
  addContacts: "Tasks.AddContacts",
  importContacts: "Tasks.ImportContacts",

  logInteraction: "Tasks.LogInteraction",
};

const SETTINGS_IMPORT_SECTION = `${WEBAPP_ROUTES.SETTINGS}#data-management`;

export function GettingStartedProgressRail({
  settingsData,

  totalContacts,

  hasInteraction,

  timelineContacts,
}: GettingStartedProgressRailProps) {
  const t = useWebTranslations("HomePage", "ProgressRail");

  const router = useRouter();

  const dismissMutation = useDismissGettingStartedMutation();

  const parsedSettings = useMemo(
    () => parseGettingStartedSettings(settingsData),

    [settingsData],
  );

  const state = useMemo(
    () =>
      buildGettingStartedState({
        hasInteraction,
        settings: parsedSettings,

        totalContacts,
      }),

    [parsedSettings, totalContacts, hasInteraction],
  );

  if (!state.showRail) {
    return null;
  }

  const _importTask = state.tasks.find((task) => task.id === "importContacts");

  const awaitingPlatform = parsedSettings.importFollowupPlatform;

  const handleDismissRail = async () => {
    await dismissMutation.mutateAsync();
  };

  const handleTaskAction = (taskId: GettingStartedTaskId) => {
    switch (taskId) {
      case "importContacts":
        router.push(SETTINGS_IMPORT_SECTION);

        return;

      case "addContacts":
        openAddContactModal();

        return;

      case "logInteraction":
        openNewActivityModal({ contacts: timelineContacts });

        return;

      default:
        return;
    }
  };

  const progressValue = (state.completedCount / state.totalCount) * 100;

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Stack gap={4} style={{ flex: 1 }}>
            <Title order={5}>{t("Title")}</Title>

            <Text c="dimmed" size="sm">
              {t("Progress", {
                completed: state.completedCount,

                total: state.totalCount,
              })}
            </Text>
          </Stack>

          <ActionIcon
            aria-label={t("Dismiss")}
            color="gray"
            loading={dismissMutation.isPending}
            onClick={() => void handleDismissRail()}
            size="sm"
            variant="subtle"
          >
            <IconX size={16} stroke={1.5} />
          </ActionIcon>
        </Group>

        <Progress radius="xl" size="sm" value={progressValue} />

        <Stack gap="xs">
          {state.tasks.map((task) => {
            const isImport = task.id === "importContacts";

            const showAwaitingHint = isImport && task.isAwaitingExport && awaitingPlatform;

            return (
              <ProgressRailItem
                isComplete={task.isComplete}
                isExpanded={Boolean(showAwaitingHint)}
                key={task.id}
                label={t(TASK_LABEL_KEYS[task.id])}
                onToggle={() => handleTaskAction(task.id)}
              >
                {showAwaitingHint ? (
                  <Text c="dimmed" pl={34} size="sm">
                    {t("AwaitingExport", {
                      platform: awaitingPlatform === "linkedin" ? t("LinkedIn") : t("Instagram"),
                    })}
                  </Text>
                ) : null}
              </ProgressRailItem>
            );
          })}
        </Stack>

      </Stack>
    </Paper>
  );
}
