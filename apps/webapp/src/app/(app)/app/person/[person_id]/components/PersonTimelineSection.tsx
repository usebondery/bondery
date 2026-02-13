"use client";

import {
  Stack,
  Group,
  Text,
  Button,
  Paper,
  Avatar,
  Badge,
  ActionIcon,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
} from "@mantine/core";
import { IconTimeline, IconPlus, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
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

  const getNotesPreview = (notes: string | null | undefined) => {
    if (!notes) return "";
    return notes.length > 50 ? `${notes.slice(0, 50)}...` : notes;
  };

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
          avatarColor: participant.avatarColor || participant.avatar_color || "blue",
        } as Contact;
      })
      .filter((participant): participant is Contact => Boolean(participant));
  };

  const handleDelete = (activity: Activity) => {
    modals.openConfirmModal({
      title: t("DeleteConfirmTitle"),
      children: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      labels: { confirm: t("DeleteAction"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_ROUTES.ACTIVITIES}/${activity.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete activity");
          }

          notifications.show({
            title: "Success",
            message: t("ActivityDeleted"),
            color: "green",
          });

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
            <IconTimeline size={16} />
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
                  const date = new Date(activity.date);
                  const participants = resolveParticipants(activity);
                  const typeConfig = getActivityTypeConfig(activity.type);

                  return (
                    <Paper
                      key={activity.id}
                      p="md"
                      withBorder
                      radius="md"
                      onClick={() => handleActivityClick(activity)}
                      style={{ cursor: "pointer", transition: "all 0.2s" }}
                      className="hover:border-blue-500 hover:shadow-sm"
                    >
                      <Group justify="space-between" wrap="nowrap" align="center">
                        <Group wrap="nowrap" align="flex-start">
                          <Avatar color={typeConfig.color} size="lg" radius="xl">
                            {typeConfig.emoji}
                          </Avatar>
                          <Stack gap={2}>
                            <Group gap="xs" align="center">
                              <Text fw={600} size="md">
                                {activity.title || activity.type}
                              </Text>
                              <Badge color={typeConfig.color} variant="light" radius="xl" size="sm">
                                {activity.type}
                              </Badge>
                            </Group>
                            {activity.description && (
                              <Text size="sm" c="dimmed">
                                {getNotesPreview(activity.description)}
                              </Text>
                            )}
                            {participants.length > 0 && (
                                                <Group mt={4}>
                                                  <PeopleAvatarChips
                                                    people={participants.map((participant) => ({
                                                      id: participant.id,
                                                      firstName: participant.firstName,
                                                      lastName: participant.lastName,
                                                      avatar: participant.avatar,
                                                      avatarColor: participant.avatarColor,
                                                    }))}
                                                    totalCount={participants.length}
                                                    variant="preview"
                                                    maxDisplay={3}
                                                    previewVariant="outline"
                                                  />
                                                </Group>
                            )}
                            <Group gap={6}>
                              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                {activity.type}
                              </Text>
                              {activity.location && (
                                <>
                                  <Text size="xs" c="dimmed">
                                    •
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {activity.location}
                                  </Text>
                                </>
                              )}
                            </Group>
                          </Stack>
                        </Group>
                        <Group gap="xs" align="center" style={{ alignSelf: "center" }}>
                          <Text c="dimmed" size="xs">
                            {date.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </Text>
                          <Menu position="bottom-end" shadow="md">
                            <MenuTarget>
                              <ActionIcon
                                variant="subtle"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </MenuTarget>
                            <MenuDropdown>
                              <MenuItem
                                leftSection={<IconEdit size={14} />}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingActivity(activity);
                                  setActivityModalOpened(true);
                                }}
                              >
                                {t("EditAction")}
                              </MenuItem>
                              <MenuItem
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(activity);
                                }}
                              >
                                {t("DeleteAction")}
                              </MenuItem>
                            </MenuDropdown>
                          </Menu>
                        </Group>
                      </Group>
                    </Paper>
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
