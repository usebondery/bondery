"use client";

import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconCalendarPlus, IconCopy, IconHome, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Activity, Contact, UpcomingReminder } from "@bondery/types";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { HomeStatsGrid } from "@/app/(app)/app/components/home/HomeStatsGrid";
import { UpcomingReminderCard } from "@/app/(app)/app/components/home/UpcomingReminderCard";
import { openAddContactModal } from "@/app/(app)/app/people/components/AddContactModal";
import { TimelineEventsList } from "@/app/(app)/app/components/timeline/TimelineEventsList";
import { NewActivityModal } from "@/app/(app)/app/timeline/components/NewActivityModal";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { revalidateEvents } from "../actions";

interface HomeClientProps {
  stats: {
    totalContacts: number;
    thisMonthInteractions: number;
    newContactsThisYear: number;
  };
  reminders: UpcomingReminder[];
  timelineContacts: Contact[];
  timelineActivities: Activity[];
}

export function HomeClient({
  stats,
  reminders,
  timelineContacts,
  timelineActivities,
}: HomeClientProps) {
  const router = useRouter();
  const t = useTranslations("HomePage");
  const timelineT = useTranslations("TimelinePage");
  const [activityModalOpened, setActivityModalOpened] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const contactsById = useMemo(
    () => new Map(timelineContacts.map((contact) => [contact.id, contact])),
    [timelineContacts],
  );

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
    setEditingActivity(activity);
    setActivityModalOpened(true);
  };

  const handleDelete = (activity: Activity) => {
    modals.openConfirmModal({
      title: (
        <ModalTitle
          text={timelineT("DeleteConfirmTitle")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      children: <Text size="sm">{timelineT("DeleteConfirmMessage")}</Text>,
      labels: { confirm: timelineT("DeleteAction"), cancel: timelineT("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_ROUTES.EVENTS}/${activity.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete event");
          }

          notifications.show(
            successNotificationTemplate({
              title: "Success",
              description: timelineT("ActivityDeleted"),
            }),
          );

          await revalidateEvents();
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
      const response = await fetch(API_ROUTES.EVENTS, {
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
        throw new Error("Failed to duplicate event");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: timelineT("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );

      await revalidateEvents();
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
            <Button
              variant="outline"
              size="md"
              leftSection={<IconUserPlus size={16} />}
              onClick={openAddContactModal}
            >
              {t("AddPerson")}
            </Button>
          }
          primaryAction={
            <Button
              size="md"
              leftSection={<IconCalendarPlus size={16} />}
              onClick={() => {
                setEditingActivity(null);
                setActivityModalOpened(true);
              }}
            >
              {t("AddEvent")}
            </Button>
          }
        />

        <NewActivityModal
          opened={activityModalOpened}
          onClose={() => {
            setActivityModalOpened(false);
            setEditingActivity(null);
          }}
          contacts={timelineContacts}
          activity={editingActivity}
        />

        <HomeStatsGrid
          stats={stats}
          labels={{
            totalContactsTitle: t("Stats.TotalContactsTitle"),
            totalContactsDescription: t("Stats.TotalContactsDescription"),
            interactionsTitle: t("Stats.InteractionsTitle"),
            interactionsDescription: t("Stats.InteractionsDescription"),
            newContactsTitle: t("Stats.NewContactsTitle"),
            newContactsDescription: t("Stats.NewContactsDescription", {
              year: new Date().getFullYear(),
            }),
          }}
        />

        <Stack gap="md">
          <Group gap="xs">
            <Title order={2}>{t("UpcomingRemindersTitle")}</Title>
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
                    key={reminder.event.id}
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
          <Group gap="xs">
            <Title order={2}>{t("TimelinePreviewTitle")}</Title>
          </Group>

          {compactActivities.length === 0 ? (
            <Paper withBorder radius="md" p="md">
              <Text c="dimmed" size="sm">
                {timelineT("NoActivitiesFound")}
              </Text>
            </Paper>
          ) : (
            <TimelineEventsList
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
      </Stack>
    </PageWrapper>
  );
}
