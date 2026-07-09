"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  ActionIconLink,
  errorNotificationTemplate,
  Kbd,
  ModalTitle,
  PersonChip,
  parseShortcutKeys,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Activity, Contact } from "@bondery/schemas";

type ActivityParticipantRef = string | { id: string };

import { Button, Group, Paper, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarPlus,
  IconCopy,
  IconHome,
  IconInfoCircle,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import { openAddContactModal } from "@/app/(app)/app/people/components/modals/AddContactModal";
import { GettingStartedProgressRail } from "@/components/home/GettingStartedProgressRail";
import { HomeStatsGrid } from "@/components/home/HomeStatsGrid";
import { UpcomingReminderCard } from "@/components/home/UpcomingReminderCard";
import { InteractionsList } from "@/components/interactions/InteractionsList";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { peopleSearchActions } from "@/components/shell/PeopleSearchSpotlight";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { setOptimisticDocumentTitle } from "@/lib/metadata/navigationTitleStore";
import { optimisticPersonDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { useNavigateWithTitle } from "@/lib/metadata/useNavigateWithTitle";
import { HOTKEYS } from "@/lib/platform/config";
import {
  useHasAnyInteractionQuery,
  useHomeStatsQuery,
  useHomeTimelineQuery,
  useRecentlyAddedContactsQuery,
  useRecentlyInteractedContactsQuery,
  useUpcomingRemindersQuery,
} from "@/lib/query/hooks/useHome";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
} from "@/lib/query/hooks/useInteractions";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";

export function HomeClient() {
  const _router = useRouter();
  const { navigateWithTitle } = useNavigateWithTitle();
  const t = useWebTranslations("HomePage");
  const timelineT = useWebTranslations("InteractionsPage");
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const createInteractionMutation = useCreateInteractionMutation();
  const { data: stats } = useHomeStatsQuery();
  const { data: settingsResult } = useSettingsQuery();
  const { data: hasInteraction = false } = useHasAnyInteractionQuery();
  const { data: reminders = [] } = useUpcomingRemindersQuery();
  const { contacts: timelineContacts, activities: timelineActivities } = useHomeTimelineQuery();
  const { data: recentlyAdded = [] } = useRecentlyAddedContactsQuery();
  const { data: recentlyInteracted = [] } = useRecentlyInteractedContactsQuery();
  const formatter = useFormatter();
  const currentMonth = formatter.dateTime(new Date(), { month: "long" });
  const currentYear = formatter.dateTime(new Date(), { year: "numeric" });

  const contactsById = useMemo(
    () => new Map(timelineContacts.map((contact) => [contact.id, contact])),
    [timelineContacts],
  );

  function handleLogInteraction() {
    openNewActivityModal({
      contacts: timelineContacts,
    });
  }

  function handleAddPerson() {
    openAddContactModal();
  }

  useHotkeys([
    [HOTKEYS.LOG_INTERACTION, handleLogInteraction],
    [HOTKEYS.ADD_PERSON, handleAddPerson],
    [HOTKEYS.FIND_PERSON, () => peopleSearchActions.open()],
  ]);

  const compactActivities = useMemo(
    () =>
      [...timelineActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [timelineActivities],
  );

  const resolveParticipants = (activity: Activity): Contact[] => {
    return (activity.participants || [])
      .map((participant: ActivityParticipantRef) => {
        const participantId = typeof participant === "string" ? participant : participant.id;
        const knownContact = contactsById.get(participantId);

        if (knownContact) {
          return knownContact;
        }

        if (!participantId || typeof participant === "string") {
          return null;
        }

        return {
          avatar: participant.avatar || null,
          firstName: participant.firstName || t("UnknownPerson"),
          id: participantId,
          lastName: participant.lastName || null,
        } as Contact;
      })
      .filter((participant): participant is Contact => Boolean(participant));
  };

  const handleActivityOpen = (activity: Activity) => {
    openNewActivityModal({
      activity,
      contacts: timelineContacts,
    });
  };

  const handleDelete = (activity: Activity) => {
    openStandardConfirmModal({
      cancelLabel: timelineT("Cancel"),
      confirmColor: "red",
      confirmLabel: timelineT("DeleteAction"),
      message: <Text size="sm">{timelineT("DeleteConfirmMessage")}</Text>,
      onConfirm: async () => {
        try {
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              description: timelineT("ActivityDeleted"),
              title: timelineT("SuccessTitle"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              description: timelineT("DeleteFailed"),
              title: timelineT("ErrorTitle"),
            }),
          );
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} />}
          isDangerous={true}
          text={timelineT("DeleteConfirmTitle")}
        />
      ),
    });
  };

  const handleDuplicate = async (activity: Activity) => {
    const participantIds = (activity.participants || [])
      .map((participant: ActivityParticipantRef) =>
        typeof participant === "string" ? participant : participant.id,
      )
      .filter((id): id is string => Boolean(id));

    try {
      await createInteractionMutation.mutateAsync({
        date: activity.date,
        description: activity.description || "",
        participantIds,
        title: activity.title || "",
        type: activity.type,
      });

      notifications.show(
        successNotificationTemplate({
          description: timelineT("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
          title: timelineT("SuccessTitle"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: timelineT("DuplicateFailed"),
          title: timelineT("ErrorTitle"),
        }),
      );
    }
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconHome}
          primaryAction={
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text inherit size="xs">
                    {t("AddInteraction")}
                  </Text>
                  <Kbd keys={parseShortcutKeys(HOTKEYS.LOG_INTERACTION)} size="xs" />
                </Group>
              }
              withArrow
            >
              <Button
                leftSection={<IconCalendarPlus size={16} />}
                onClick={handleLogInteraction}
                size="md"
              >
                {t("AddInteraction")}
              </Button>
            </Tooltip>
          }
          secondaryAction={
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text inherit size="xs">
                    {t("AddPerson")}
                  </Text>
                  <Kbd keys={parseShortcutKeys(HOTKEYS.ADD_PERSON)} size="xs" />
                </Group>
              }
              withArrow
            >
              <Button
                leftSection={<IconUserPlus size={16} />}
                onClick={handleAddPerson}
                size="md"
                variant="outline"
              >
                {t("AddPerson")}
              </Button>
            </Tooltip>
          }
          title={t("Title")}
        />

        <GettingStartedProgressRail
          hasInteraction={hasInteraction}
          settingsData={settingsResult?.data}
          timelineContacts={timelineContacts}
          totalContacts={stats?.totalContacts ?? 0}
        />

        <HomeStatsGrid
          labels={{
            interactionsTitle: t("Stats.InteractionsTitle"),
            interactionsTooltip: t("Stats.InteractionsTooltip", {
              month: currentMonth,
            }),
            newContactsTitle: t("Stats.NewContactsTitle"),
            newContactsTooltip: t("Stats.NewContactsTooltip", {
              year: currentYear,
            }),
            totalContactsTitle: t("Stats.TotalContactsTitle"),
            totalContactsTooltip: t("Stats.TotalContactsTooltip"),
          }}
          stats={
            stats ?? {
              newContactsThisYear: 0,
              thisMonthInteractions: 0,
              totalContacts: 0,
            }
          }
        />

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" verticalSpacing="xl">
          <Stack gap="md">
            <Group align="center" gap={4}>
              <Link href={WEBAPP_ROUTES.INTERACTIONS} style={{ textDecoration: "none" }}>
                <Title order={2}>{t("TimelinePreviewTitle")}</Title>
              </Link>
              <Tooltip label={t("TimelinePreviewTooltip")} maw={240} multiline withArrow>
                <ActionIconLink
                  ariaLabel={t("TimelinePreviewTooltip")}
                  color="gray"
                  href={WEBAPP_ROUTES.INTERACTIONS}
                  icon={<IconInfoCircle size={16} stroke={1.5} />}
                  size="sm"
                  variant="transparent"
                />
              </Tooltip>
            </Group>

            {compactActivities.length === 0 ? (
              <Paper p="md" radius="md" withBorder>
                <Text c="dimmed" size="sm">
                  {timelineT("NoActivitiesFound")}
                </Text>
              </Paper>
            ) : (
              <InteractionsList
                activities={compactActivities}
                deleteLabel={timelineT("DeleteAction")}
                duplicateLabel={timelineT("DuplicateAction")}
                editLabel={timelineT("EditAction")}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onEdit={handleActivityOpen}
                onOpen={handleActivityOpen}
                resolveParticipants={resolveParticipants}
              />
            )}
          </Stack>

          <Stack gap="xl">
            <Stack gap="md">
              <Group align="center" gap={4}>
                <Title order={2}>{t("UpcomingRemindersTitle")}</Title>
                <Tooltip label={t("UpcomingRemindersTooltip")} maw={240} multiline withArrow>
                  <ActionIconLink
                    ariaLabel={t("UpcomingRemindersTooltip")}
                    color="gray"
                    icon={<IconInfoCircle size={16} stroke={1.5} />}
                    size="sm"
                    variant="transparent"
                  />
                </Tooltip>
              </Group>

              {reminders.length === 0 ? (
                <Paper p="md" radius="md" withBorder>
                  <Text c="dimmed" size="sm">
                    {t("NoUpcomingReminders")}
                  </Text>
                </Paper>
              ) : (
                <Stack gap="sm">
                  {reminders.map((reminder) => {
                    const personHref = `${WEBAPP_ROUTES.PERSON}/${reminder.person.id}`;

                    return (
                      <UpcomingReminderCard
                        key={reminder.importantDate.id}
                        onClick={() => {
                          navigateWithTitle(
                            personHref,
                            optimisticPersonDocumentTitle(reminder.person),
                          );
                        }}
                        reminder={reminder}
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>

            <Stack gap="md">
              <Group align="center" gap={4}>
                <Link
                  href={`${WEBAPP_ROUTES.PEOPLE}?sort=createdAtDesc`}
                  style={{ textDecoration: "none" }}
                >
                  <Title order={2}>{t("RecentlyAddedTitle")}</Title>
                </Link>
                <Tooltip label={t("RecentlyAddedTooltip")} maw={240} multiline withArrow>
                  <ActionIconLink
                    ariaLabel={t("RecentlyAddedTooltip")}
                    color="gray"
                    href={`${WEBAPP_ROUTES.PEOPLE}?sort=createdAtDesc`}
                    icon={<IconInfoCircle size={16} stroke={1.5} />}
                    size="sm"
                    variant="transparent"
                  />
                </Tooltip>
              </Group>

              {recentlyAdded.length === 0 ? (
                <Paper p="md" radius="md" withBorder>
                  <Text c="dimmed" size="sm">
                    {t("NoRecentlyAdded")}
                  </Text>
                </Paper>
              ) : (
                <Group gap="sm" wrap="wrap">
                  {recentlyAdded.map((person) => (
                    <PersonChip
                      href={`${WEBAPP_ROUTES.PERSON}/${person.id}`}
                      isClickable
                      key={person.id}
                      onNavigate={() =>
                        setOptimisticDocumentTitle(optimisticPersonDocumentTitle(person))
                      }
                      person={person}
                      showHoverCard
                      size="md"
                    />
                  ))}
                </Group>
              )}
            </Stack>

            <Stack gap="md">
              <Group align="center" gap={4}>
                <Link
                  href={`${WEBAPP_ROUTES.PEOPLE}?sort=interactionDesc`}
                  style={{ textDecoration: "none" }}
                >
                  <Title order={2}>{t("RecentlyInteractedTitle")}</Title>
                </Link>
                <Tooltip label={t("RecentlyInteractedTooltip")} maw={240} multiline withArrow>
                  <ActionIconLink
                    ariaLabel={t("RecentlyInteractedTooltip")}
                    color="gray"
                    href={`${WEBAPP_ROUTES.PEOPLE}?sort=interactionDesc`}
                    icon={<IconInfoCircle size={16} stroke={1.5} />}
                    size="sm"
                    variant="transparent"
                  />
                </Tooltip>
              </Group>

              {recentlyInteracted.length === 0 ? (
                <Paper p="md" radius="md" withBorder>
                  <Text c="dimmed" size="sm">
                    {t("NoRecentlyInteracted")}
                  </Text>
                </Paper>
              ) : (
                <Group gap="sm" wrap="wrap">
                  {recentlyInteracted.map((person) => (
                    <PersonChip
                      href={`${WEBAPP_ROUTES.PERSON}/${person.id}`}
                      isClickable
                      key={person.id}
                      onNavigate={() =>
                        setOptimisticDocumentTitle(optimisticPersonDocumentTitle(person))
                      }
                      person={person}
                      showHoverCard
                      size="md"
                    />
                  ))}
                </Group>
              )}
            </Stack>
          </Stack>
        </SimpleGrid>
      </Stack>
    </PageWrapper>
  );
}
