"use client";

import { Stack, Text } from "@mantine/core";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useState, useMemo, useEffect, useRef } from "react";
import type { Activity, Contact } from "@bondery/schemas";
import { openNewActivityModal } from "../../../interactions/components/NewActivityModal";
import { notifications } from "@mantine/notifications";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { InteractionsList } from "../../../components/interactions/InteractionsList";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../../../components/modals/openStandardConfirmModal";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
} from "@/lib/query/hooks/useInteractions";

interface PersonInteractionsSectionProps {
  activities: Activity[];
  contact: Contact;
  connectedContacts: Contact[];
  selectableContacts: Contact[];
}

export function PersonInteractionsSection({
  activities,
  contact,
  connectedContacts,
  selectableContacts,
}: PersonInteractionsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("InteractionsPage");
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const createInteractionMutation = useCreateInteractionMutation();
  const addInteractionTriggeredRef = useRef(false);

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
    if (addInteractionTriggeredRef.current) {
      return;
    }

    if (searchParams.get("addInteraction") !== "1") {
      return;
    }

    addInteractionTriggeredRef.current = true;

    openNewActivityModal({
      contacts: activityModalContacts,
      initialParticipantIds: [contact.id],
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("addInteraction");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl);
  }, [searchParams, activityModalContacts, contact.id, pathname, router, t]);

  const handleActivityClick = (activity: Activity) => {
    openNewActivityModal({
      contacts: activityModalContacts,
      activity,
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
          firstName: participant.firstName || t("UnknownPerson"),
          lastName: participant.lastName || null,
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
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              title: t("SuccessTitle"),
              description: t("ActivityDeleted"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: t("ErrorTitle"),
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
      await createInteractionMutation.mutateAsync({
        title: activity.title || "",
        type: activity.type,
        description: activity.description || "",
        date: activity.date,
        participantIds,
      });

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("DuplicateFailed"),
        }),
      );
    }
  };

  return (
    <Stack gap="xl">
      <InteractionsList
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
  );
}
