"use client";

import { Stack, Group, Text, Button } from "@mantine/core";
import { IconTimelineEventText, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import type { Activity, Contact } from "@bondery/types";
import { NewActivityModal } from "../../../timeline/components/NewActivityModal";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { PeopleAvatarChips } from "../../../components/timeline/PeopleAvatarChips";
import { modals } from "@mantine/modals";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ActivityCard } from "../../../components/timeline/ActivityCard";
import { ModalTitle } from "@bondery/mantine-next";
import { revalidateEvents } from "../../../actions";

interface PersonTimelineSectionProps {
  activities: Activity[];
  contact: Contact;
  connectedContacts: Contact[];
}

export function PersonTimelineSection({
  activities,
  contact,
  connectedContacts,
}: PersonTimelineSectionProps) {
  const router = useRouter();
  const t = useTranslations("TimelinePage");
  const [activityModalOpened, setActivityModalOpened] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const contactsById = useMemo(() => {
    const allContacts = [contact, ...connectedContacts];
    return new Map(allContacts.map((item) => [item.id, item]));
  }, [contact, connectedContacts]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((activity) => {
        const date = new Date(activity.date);
        const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(activity);
      });
    return groups;
  }, [activities]);

  const handleActivityClick = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityModalOpened(true);
  };

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

  const handleDelete = (activity: Activity) => {
    modals.openConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteConfirmTitle")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      children: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      labels: { confirm: t("DeleteAction"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_ROUTES.EVENTS}/${activity.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete event");
          }

          notifications.show({
            title: "Success",
            message: t("ActivityDeleted"),
            color: "green",
          });

          await revalidateEvents();
          router.refresh();
        } catch {
          notifications.show({
            title: "Error",
            message: t("DeleteFailed"),
            color: "red",
          });
        }
      },
    });
  };

  const handleActivityModalClose = () => {
    setActivityModalOpened(false);
    setEditingActivity(null);
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTimelineEventText size={16} />
            <Text fw={600} size="sm">
              Timeline
            </Text>
          </Group>
          <Button
            variant="light"
            size="xs"
            onClick={() => {
              setEditingActivity(null);
              setActivityModalOpened(true);
            }}
          >
            {t("AddActivity")}
          </Button>
        </Group>

        <Stack gap="xl">
          {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
            <div key={dateGroup}>
              <Text
                c="dimmed"
                size="xs"
                tt="uppercase"
                fw={700}
                mb="sm"
                style={{ letterSpacing: "0.5px" }}
              >
                {dateGroup}
              </Text>
              <Stack gap="sm">
                {groupActivities.map((activity) => {
                  const participants = resolveParticipants(activity);

                  return (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      participants={participants}
                      editLabel={t("EditAction")}
                      deleteLabel={t("DeleteAction")}
                      onOpen={() => handleActivityClick(activity)}
                      onEdit={() => {
                        setEditingActivity(activity);
                        setActivityModalOpened(true);
                      }}
                      onDelete={() => handleDelete(activity)}
                    />
                  );
                })}
              </Stack>
            </div>
          ))}

          {activities.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              {t("NoActivitiesWithPerson")}
            </Text>
          )}
        </Stack>
      </Stack>

      <NewActivityModal
        opened={activityModalOpened}
        onClose={handleActivityModalClose}
        contacts={[contact, ...connectedContacts]}
        activity={editingActivity}
      />
    </>
  );
}
