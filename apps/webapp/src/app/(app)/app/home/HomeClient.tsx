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
import { useFormatter, useTranslations } from "next-intl";
import type { Activity, Contact, UpcomingReminder } from "@bondery/types";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { HomeStatsGrid } from "@/app/(app)/app/components/home/HomeStatsGrid";
import { UpcomingReminderCard } from "@/app/(app)/app/components/home/UpcomingReminderCard";
import { openAddContactModal } from "@/app/(app)/app/people/components/AddContactModal";
import { InteractionsList } from "@/app/(app)/app/components/interactions/InteractionsList";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import Link from "next/link";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import {
  ActionIconLink,
  errorNotificationTemplate,
  ModalTitle,
  PersonChip,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { revalidateInteractions } from "../actions";
import { openStandardConfirmModal } from "../components/modals/openStandardConfirmModal";
import { HOTKEYS } from "@/lib/config";
import { peopleSearchActions } from "../components/PeopleSearchSpotlight";

interface HomeClientProps {
  stats: {
    totalContacts: number;
    thisMonthInteractions: number;
    newContactsThisYear: number;
  };
  reminders: UpcomingReminder[];
  timelineContacts: Contact[];
  timelineActivities: Activity[];
  recentlyAdded: Contact[];
  recentlyInteracted: Contact[];
}

export function HomeClient({
  stats,
  reminders,
  timelineContacts,
  timelineActivities,
  recentlyAdded,
  recentlyInteracted,
}: HomeClientProps) {
  const router = useRouter();
  const t = useTranslations("HomePage");
  const timelineT = useTranslations("InteractionsPage");
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
      titleText: timelineT("WhoAreYouMeeting"),
      t: timelineT,
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
          firstName: participant.firstName || participant.first_name || "Unknown",
          lastName: participant.lastName || participant.last_name || null,
          avatar: participant.avatar || null,
        } as Contact;
      })
      .filter((participant): participant is Contact => Boolean(participant));
  };

  const handleActivityOpen = (activity: Activity) => {
    openNewActivityModal({
      contacts: timelineContacts,
      activity,
      titleText: timelineT("WhoAreYouMeeting"),
      t: timelineT,
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
          const response = await fetch(`${API_ROUTES.INTERACTIONS}/${activity.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete interaction");
          }

          notifications.show(
            successNotificationTemplate({
              title: "Success",
              description: timelineT("ActivityDeleted"),
            }),
          );

          await revalidateInteractions();
          router.refresh();
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: "Error",
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
      const response = await fetch(API_ROUTES.INTERACTIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activity.title || "",
          type: activity.type,
          description: activity.description || "",
          date: activity.date,
          participantIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate interaction");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: timelineT("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );

      await revalidateInteractions();
      router.refresh();
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
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
          stats={stats}
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
