"use client";



import { useMemo } from "react";

import {

  ActionIcon,

  Button,

  Group,

  Paper,

  Progress,

  Stack,

  Text,

  Title,

} from "@mantine/core";

import { IconX } from "@tabler/icons-react";

import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

import type { Contact } from "@bondery/schemas";

import {

  buildGettingStartedState,

  parseGettingStartedSettings,

  type GettingStartedTaskId,

} from "@/lib/home/gettingStartedItems";

import { ProgressRailItem } from "./ProgressRailItem";

import { openAddContactModal } from "@/app/(app)/app/people/components/AddContactModal";

import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";

import { useDismissGettingStartedMutation } from "@/lib/query/hooks/useSettings";

import { useRouter } from "next/navigation";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";



interface GettingStartedProgressRailProps {

  settingsData?: Record<string, unknown>;

  totalContacts: number;

  hasInteraction: boolean;

  timelineContacts: Contact[];

}



const TASK_LABEL_KEYS: Record<GettingStartedTaskId, string> = {

  importContacts: "Tasks.ImportContacts",

  addContacts: "Tasks.AddContacts",

  logInteraction: "Tasks.LogInteraction",

};



const SETTINGS_IMPORT_SECTION = `${WEBAPP_ROUTES.SETTINGS}#data-management`;



export function GettingStartedProgressRail({

  settingsData,

  totalContacts,

  hasInteraction,

  timelineContacts,

}: GettingStartedProgressRailProps) {

  const t = useTranslations("HomePage.ProgressRail");

  const router = useRouter();

  const dismissMutation = useDismissGettingStartedMutation();



  const parsedSettings = useMemo(

    () => parseGettingStartedSettings(settingsData),

    [settingsData],

  );



  const state = useMemo(

    () =>

      buildGettingStartedState({

        settings: parsedSettings,

        totalContacts,

        hasInteraction,

      }),

    [parsedSettings, totalContacts, hasInteraction],

  );



  if (!state.showRail) {

    return null;

  }



  const importTask = state.tasks.find((task) => task.id === "importContacts");

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

    <Paper withBorder radius="md" p="md">

      <Stack gap="md">

        <Group justify="space-between" align="flex-start" wrap="nowrap">

          <Stack gap={4} style={{ flex: 1 }}>

            <Title order={5}>{t("Title")}</Title>

            <Text size="sm" c="dimmed">

              {t("Progress", {

                completed: state.completedCount,

                total: state.totalCount,

              })}

            </Text>

          </Stack>

          <ActionIcon

            variant="subtle"

            color="gray"

            size="sm"

            aria-label={t("Dismiss")}

            onClick={() => void handleDismissRail()}

            loading={dismissMutation.isPending}

          >

            <IconX size={16} stroke={1.5} />

          </ActionIcon>

        </Group>



        <Progress value={progressValue} size="sm" radius="xl" />



        <Stack gap="xs">

          {state.tasks.map((task) => {

            const isImport = task.id === "importContacts";

            const showAwaitingHint =

              isImport && task.isAwaitingExport && awaitingPlatform;



            return (

              <ProgressRailItem

                key={task.id}

                label={t(TASK_LABEL_KEYS[task.id])}

                isComplete={task.isComplete}

                isExpanded={Boolean(showAwaitingHint)}

                onToggle={() => handleTaskAction(task.id)}

              >

                {showAwaitingHint ? (

                  <Text size="sm" c="dimmed" pl={34}>

                    {t("AwaitingExport", {

                      platform:

                        awaitingPlatform === "linkedin"

                          ? t("LinkedIn")

                          : t("Instagram"),

                    })}

                  </Text>

                ) : null}

              </ProgressRailItem>

            );

          })}

        </Stack>



        {state.completedCount === state.totalCount ? (

          <Button variant="light" onClick={() => void handleDismissRail()}>

            {t("AllDone")}

          </Button>

        ) : null}

      </Stack>

    </Paper>

  );

}

