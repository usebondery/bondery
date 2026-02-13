"use client";

import {
  Button,
  Stack,
  Group,
  Text,
  Paper,
  Avatar,
  TextInput,
  ActionIcon,
  Badge,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconTimeline,
  IconDotsVertical,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { NewActivityModal } from "./components/NewActivityModal";
import type { Contact, Activity } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { PageHeader } from "../components/PageHeader";
import { useTranslations } from "next-intl";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { PeopleAvatarChips } from "../components/timeline/PeopleAvatarChips";
import { getActivityTypeConfig } from "@/lib/activityTypes";

interface TimelineClientProps {
  initialContacts: Contact[];
  initialActivities: Activity[];
}

export function TimelineClient({ initialContacts, initialActivities }: TimelineClientProps) {
  const router = useRouter();
  const t = useTranslations("TimelinePage");
  const [modalOpened, setModalOpened] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [search, setSearch] = useState("");

  const contactsById = useMemo(
    () => new Map(initialContacts.map((contact) => [contact.id, contact])),
    [initialContacts],
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
          avatarColor: participant.avatarColor || participant.avatar_color || "blue",
        } as Contact;
      })
      .filter((participant): participant is Contact => Boolean(participant));
  };

  const handleActivityClick = (activity: Activity) => {
    setEditingActivity(activity);
    setModalOpened(true);
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

  const filteredActivities = useMemo(() => {
    return initialActivities
      .filter(
        (activity) =>
          activity.type.toLowerCase().includes(search.toLowerCase()) ||
          activity.description?.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [initialActivities, search]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    filteredActivities.forEach((activity) => {
      const date = new Date(activity.date);
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });
    return groups;
  }, [filteredActivities]);

  const getNotesPreview = (notes: string | null | undefined) => {
    if (!notes) return "";
    return notes.length > 50 ? `${notes.slice(0, 50)}...` : notes;
  };

  return (
    <PageWrapper>
      <Stack gap="lg">
        <PageHeader
          title="Timeline"
          icon={IconTimeline}
          action={
            <Button
              size="md"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditingActivity(null);
                setModalOpened(true);
              }}
            >
              {t("AddActivity")}
            </Button>
          }
        />

        <Group justify="flex-end">
          {/* <Button variant="default" leftSection={<IconFilter size={16} />}>Filter</Button> */}
          <TextInput
            placeholder={t("SearchPlaceholder")}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={300}
          />
        </Group>

        <NewActivityModal
          opened={modalOpened}
          onClose={() => {
            setModalOpened(false);
            setEditingActivity(null);
          }}
          contacts={initialContacts}
          activity={editingActivity}
        />

        <Stack gap="xl">
          {Object.entries(groupedActivities).map(([dateGroup, activities]) => (
            <div key={dateGroup}>
              <Text c="dimmed" size="sm" mb="md">
                {dateGroup}
              </Text>
              <Stack gap="sm">
                {activities.map((activity) => {
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
                      style={{ cursor: "pointer", transition: "border-color 0.2s" }}
                      className="hover:border-blue-500"
                    >
                      <Group justify="space-between" wrap="nowrap" align="center">
                        <Group wrap="nowrap">
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
                          </Stack>
                        </Group>
                        <Group gap="xs" align="center" style={{ alignSelf: "center" }}>
                          <Text c="dimmed" size="sm" style={{ whiteSpace: "nowrap" }}>
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
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
                                  setModalOpened(true);
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

          {filteredActivities.length === 0 && (
            <Paper p="xl" withBorder radius="md" ta="center">
              <Text c="dimmed">{t("NoActivitiesFound")}</Text>
            </Paper>
          )}
        </Stack>
      </Stack>
    </PageWrapper>
  );
}
