"use client";

import { Button, Group, Kbd, Paper, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import {
  IconCalendarPlus,
  IconCopy,
  IconHome,
  IconInfoCircle,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { useHotkeys } from "@mantine/hooks";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import type { Activity, Contact } from "@bondery/schemas";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { HomeStatsGrid } from "@/app/(app)/app/components/home/HomeStatsGrid";
import { UpcomingReminderCard } from "@/app/(app)/app/components/home/UpcomingReminderCard";
import { openAddContactModal } from "@/app/(app)/app/people/components/AddContactModal";
import { InteractionsList } from "@/app/(app)/app/components/interactions/InteractionsList";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import Link from "next/link";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import {
  ActionIconLink,
  errorNotificationTemplate,
  ModalTitle,
  PersonChip,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../components/modals/openStandardConfirmModal";
import { HOTKEYS } from "@/lib/config";
import { peopleSearchActions } from "../components/PeopleSearchSpotlight";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
} from "@/lib/query/hooks/useInteractions";
import {
  useHomeStatsQuery,
  useHomeTimelineQuery,
  useRecentlyAddedContactsQuery,
  useRecentlyInteractedContactsQuery,
  useUpcomingRemindersQuery,
} from "@/lib/query/hooks/useHome";

export function HomeClient() {
  const router = useRouter();
  const t = useTranslations("HomePage");
  const timelineT = useTranslations("InteractionsPage");
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const createInteractionMutation = useCreateInteractionMutation();
  const { data: stats } = useHomeStatsQuery();
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
      .map((participant: any) => {
        const participantId = typeof participant === "string" ? participant : participant.id;
        const knownContact = contactsById.get(participantId);

        if (knownContact) {
          return knownContact;
        }

        if (!participantId || typeof participant === "string") {
          return null;
        }

        return {
          id: participantId,
          firstName: participant.firstName || "Unknown",
          lastName: participant.lastName || null,
          avatar: participant.avatar || null,
        } as Contact;
      })
      .filter((participant): participant is Contact => Boolean(participant));
  };

  const handleActivityOpen = (activity: Activity) => {
    openNewActivityModal({
      contacts: timelineContacts,
      activity,
    });
  };

  const handleDelete = (activity: Activity) => {
    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={timelineT("DeleteConfirmTitle")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      message: <Text size="sm">{timelineT("DeleteConfirmMessage")}</Text>,
      confirmLabel: timelineT("DeleteAction"),
      cancelLabel: timelineT("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        try {
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              title: timelineT("SuccessTitle"),
              description: timelineT("ActivityDeleted"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: timelineT("ErrorTitle"),
              description: timelineT("DeleteFailed"),
            }),
          );
        }
      },
    });
  };

  const handleDuplicate = async (activity: Activity) => {
    const participantIds = (activity.participants || [])
      .map((participant: any) => (typeof participant === "string" ? participant : participant.id))
      .filter((id): id is string => Boolean(id));

    try {
      await createInteractionMutation.mutateAsync({
        title: activity.title || "",
        type: activity.type,
        description: activity.description || "",
        date: activity.date,
        participantIds,
      });

      notifications.show(
        successNotificationTemplate({
          title: timelineT("SuccessTitle"),
          description: timelineT("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: timelineT("ErrorTitle"),
          description: timelineT("DuplicateFailed"),
        }),
      );
    }
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          title={t("Title")}
          icon={IconHome}
          secondaryAction={
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" inherit>
                    {t("AddPerson")}
                  </Text>
                  <Kbd size="xs">{HOTKEYS.ADD_PERSON.toUpperCase()}</Kbd>
                </Group>
              }
              withArrow
            >
              <Button
                variant="outline"
                size="md"
                leftSection={<IconUserPlus size={16} />}
                onClick={handleAddPerson}
              >
                {t("AddPerson")}
              </Button>
            </Tooltip>
          }
          primaryAction={
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text size="xs" inherit>
                    {t("AddInteraction")}
                  </Text>
                  <Kbd size="xs">{HOTKEYS.LOG_INTERACTION.toUpperCase()}</Kbd>
                </Group>
              }
              withArrow
            >
              <Button
                size="md"
                leftSection={<IconCalendarPlus size={16} />}
                onClick={handleLogInteraction}
              >
                {t("AddInteraction")}
              </Button>
            </Tooltip>
          }
        />

        <HomeStatsGrid
          stats={
            stats ?? {
              totalContacts: 0,
              thisMonthInteractions: 0,
              newContactsThisYear: 0,
            }
          }
          labels={{
            totalContactsTitle: t("Stats.TotalContactsTitle"),
            totalContactsTooltip: t("Stats.TotalContactsTooltip"),
            interactionsTitle: t("Stats.InteractionsTitle"),
            interactionsTooltip: t("Stats.InteractionsTooltip", {
              month: currentMonth,
            }),
            newContactsTitle: t("Stats.NewContactsTitle"),
            newContactsTooltip: t("Stats.NewContactsTooltip", {
              year: currentYear,
            }),
          }}
        />

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" verticalSpacing="xl">
          <Stack gap="md">
            <Group gap={4} align="center">
              <Link href={WEBAPP_ROUTES.INTERACTIONS} style={{ textDecoration: "none" }}>
                <Title order={2}>{t("TimelinePreviewTitle")}</Title>
              </Link>
              <Tooltip label={t("TimelinePreviewTooltip")} multiline maw={240} withArrow>
                <ActionIconLink
                  href={WEBAPP_ROUTES.INTERACTIONS}
                  ariaLabel={t("TimelinePreviewTooltip")}
                  icon={<IconInfoCircle size={16} stroke={1.5} />}
                  variant="transparent"
                  color="gray"
                  size="sm"
                />
              </Tooltip>
            </Group>

            {compactActivities.length === 0 ? (
              <Paper withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">
                  {timelineT("NoActivitiesFound")}
                </Text>
              </Paper>
            ) : (
              <InteractionsList
                activities={compactActivities}
                resolveParticipants={resolveParticipants}
                editLabel={timelineT("EditAction")}
                duplicateLabel={timelineT("DuplicateAction")}
                deleteLabel={timelineT("DeleteAction")}
                onOpen={handleActivityOpen}
                onEdit={handleActivityOpen}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}
          </Stack>

          <Stack gap="xl">
            <Stack gap="md">
              <Group gap={4} align="center">
                <Title order={2}>{t("UpcomingRemindersTitle")}</Title>
                <Tooltip label={t("UpcomingRemindersTooltip")} multiline maw={240} withArrow>
                  <ActionIconLink
                    ariaLabel={t("UpcomingRemindersTooltip")}
                    icon={<IconInfoCircle size={16} stroke={1.5} />}
                    variant="transparent"
                    color="gray"
                    size="sm"
                  />
                </Tooltip>
              </Group>

              {reminders.length === 0 ? (
                <Paper withBorder radius="md" p="md">
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
                        reminder={reminder}
                        onClick={() => {
                          router.push(personHref);
                        }}
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>

            <Stack gap="md">
              <Group gap={4} align="center">
                <Link
                  href={`${WEBAPP_ROUTES.PEOPLE}?sort=createdAtDesc`}
                  style={{ textDecoration: "none" }}
                >
                  <Title order={2}>{t("RecentlyAddedTitle")}</Title>
                </Link>
                <Tooltip label={t("RecentlyAddedTooltip")} multiline maw={240} withArrow>
                  <ActionIconLink
                    href={`${WEBAPP_ROUTES.PEOPLE}?sort=createdAtDesc`}
                    ariaLabel={t("RecentlyAddedTooltip")}
                    icon={<IconInfoCircle size={16} stroke={1.5} />}
                    variant="transparent"
                    color="gray"
                    size="sm"
                  />
                </Tooltip>
              </Group>

              {recentlyAdded.length === 0 ? (
                <Paper withBorder radius="md" p="md">
                  <Text c="dimmed" size="sm">
                    {t("NoRecentlyAdded")}
                  </Text>
                </Paper>
              ) : (
                <Group gap="sm" wrap="wrap">
                  {recentlyAdded.map((person) => (
                    <PersonChip
                      key={person.id}
                      person={person}
                      size="md"
                      isClickable
                      showHoverCard
                      href={`${WEBAPP_ROUTES.PERSON}/${person.id}`}
                    />
                  ))}
                </Group>
              )}
            </Stack>

            <Stack gap="md">
              <Group gap={4} align="center">
                <Link
                  href={`${WEBAPP_ROUTES.PEOPLE}?sort=interactionDesc`}
                  style={{ textDecoration: "none" }}
                >
                  <Title order={2}>{t("RecentlyInteractedTitle")}</Title>
                </Link>
                <Tooltip label={t("RecentlyInteractedTooltip")} multiline maw={240} withArrow>
                  <ActionIconLink
                    href={`${WEBAPP_ROUTES.PEOPLE}?sort=interactionDesc`}
                    ariaLabel={t("RecentlyInteractedTooltip")}
                    icon={<IconInfoCircle size={16} stroke={1.5} />}
                    variant="transparent"
                    color="gray"
                    size="sm"
                  />
                </Tooltip>
              </Group>

              {recentlyInteracted.length === 0 ? (
                <Paper withBorder radius="md" p="md">
                  <Text c="dimmed" size="sm">
                    {t("NoRecentlyInteracted")}
                  </Text>
                </Paper>
              ) : (
                <Group gap="sm" wrap="wrap">
                  {recentlyInteracted.map((person) => (
                    <PersonChip
                      key={person.id}
                      person={person}
                      size="md"
                      isClickable
                      showHoverCard
                      href={`${WEBAPP_ROUTES.PERSON}/${person.id}`}
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
