"use client";

import { Stack, Group, Text, Button } from "@mantine/core";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useState, useMemo, useEffect, useRef } from "react";
import type { Activity, Contact } from "@bondery/types";
import { openNewActivityModal } from "../../../timeline/components/NewActivityModal";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { notifications } from "@mantine/notifications";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { TimelineEventsList } from "../../../components/timeline/TimelineEventsList";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { revalidateInteractions } from "../../../actions";
import { openStandardConfirmModal } from "../../../components/modals/openStandardConfirmModal";

interface PersonTimelineSectionProps {
  activities: Activity[];
  contact: Contact;
  connectedContacts: Contact[];
  selectableContacts: Contact[];
}

export function PersonTimelineSection({
  activities,
  contact,
  connectedContacts,
  selectableContacts,
}: PersonTimelineSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("TimelinePage");
  const addEventTriggeredRef = useRef(false);

  const contactsById = useMemo(() => {
    const allContacts = [contact, ...connectedContacts];
    return new Map(allContacts.map((item) => [item.id, item]));
  }, [contact, connectedContacts]);

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activities],
  );

  const activityModalContacts = useMemo(() => {
    const merged = [contact, ...selectableContacts];
    const byId = new Map(merged.map((candidate) => [candidate.id, candidate]));
    return Array.from(byId.values());
  }, [contact, selectableContacts]);

  useEffect(() => {
    if (addEventTriggeredRef.current) {
      return;
    }

    if (searchParams.get("addEvent") !== "1") {
      return;
    }

    addEventTriggeredRef.current = true;

    openNewActivityModal({
      contacts: activityModalContacts,
      initialParticipantIds: [contact.id],
      titleText: t("WhoAreYouMeeting"),
      t,
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("addEvent");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl);
  }, [searchParams, activityModalContacts, contact.id, pathname, router, t]);

  const handleActivityClick = (activity: Activity) => {
    openNewActivityModal({
      contacts: activityModalContacts,
      activity,
      titleText: t("WhoAreYouMeeting"),
      t,
    });
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
    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteConfirmTitle")}
          icon={<IconTrash size={20} />}
          isDangerous={true}
        />
      ),
      message: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      confirmLabel: t("DeleteAction"),
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_ROUTES.INTERACTIONS}/${activity.id}`, {
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

          await revalidateInteractions();
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
        throw new Error("Failed to duplicate event");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );

      await revalidateInteractions();
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

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            Timeline
          </Text>
          <Button
            variant="light"
            size="xs"
            onClick={() => {
              openNewActivityModal({
                contacts: activityModalContacts,
                initialParticipantIds: [contact.id],
                titleText: t("WhoAreYouMeeting"),
                t,
              });
            }}
          >
            {t("AddActivity")}
          </Button>
        </Group>

        <Stack gap="xl">
          <TimelineEventsList
            activities={sortedActivities}
            resolveParticipants={resolveParticipants}
            editLabel={t("EditAction")}
            duplicateLabel={t("DuplicateAction")}
            deleteLabel={t("DeleteAction")}
            onOpen={handleActivityClick}
            onEdit={(activity) => {
              openNewActivityModal({
                contacts: activityModalContacts,
                activity,
                titleText: t("WhoAreYouMeeting"),
                t,
              });
            }}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />

          {activities.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              {t("NoActivitiesWithPerson")}
            </Text>
          )}
        </Stack>
      </Stack>
    </>
  );
}
