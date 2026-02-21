"use client";

import { Button, Stack, Group, Text, Paper, TextInput } from "@mantine/core";
import { IconCalendarPlus, IconCopy, IconSearch, IconTimelineEventText } from "@tabler/icons-react";
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
import { IconTrash } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { revalidateEvents } from "../actions";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { TimelineEventsList } from "../components/timeline/TimelineEventsList";

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

          notifications.show(
            successNotificationTemplate({
              title: "Success",
              description: t("ActivityDeleted"),
            }),
          );

          await revalidateEvents();
          router.refresh();
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: "Error",
              description: t("DeleteFailed"),
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
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );

      await revalidateEvents();
      router.refresh();
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: t("DuplicateFailed"),
        }),
      );
    }
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

  return (
    <PageWrapper>
      <Stack gap="lg">
        <PageHeader
          title="Timeline"
          icon={IconTimelineEventText}
          action={
            <Button
              size="md"
              leftSection={<IconCalendarPlus size={16} />}
              onClick={() => {
                setEditingActivity(null);
                setModalOpened(true);
              }}
            >
              {t("AddActivity")}
            </Button>
          }
        />

        <Group justify="flex-start">
          {/* <Button variant="default" leftSection={<IconFilter size={16} />}>Filter</Button> */}
          <TextInput
            placeholder={t("SearchPlaceholder")}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className="w-lg"
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
          <TimelineEventsList
            activities={filteredActivities}
            resolveParticipants={resolveParticipants}
            editLabel={t("EditAction")}
            duplicateLabel={t("DuplicateAction")}
            deleteLabel={t("DeleteAction")}
            onOpen={handleActivityClick}
            onEdit={(activity) => {
              setEditingActivity(activity);
              setModalOpened(true);
            }}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />

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
