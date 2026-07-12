"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Activity, Contact } from "@bondery/schemas";
import { Button, Center, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { InteractionsList } from "@/components/interactions/InteractionsList";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { useCommonTranslations, useInteractionsPageTranslations } from "@/lib/i18n/generated/hooks";
import {
  useContactInteractionsInfiniteQuery,
  useContactsSelectableListQuery,
} from "@/lib/query/hooks/useContacts";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
} from "@/lib/query/hooks/useInteractions";
import { PERSON_SELECTABLE_CONTACTS } from "@/lib/query/personPageQueryParams";
import { openNewActivityModal } from "../../../../interactions/components/NewActivityModal";

interface PersonInteractionsSectionProps {
  contact: Contact;
  personId: string;
}

export function PersonInteractionsSection({ personId, contact }: PersonInteractionsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useInteractionsPageTranslations();
  const tCommon = useCommonTranslations();
  const deleteInteractionMutation = useDeleteInteractionMutation(personId);
  const createInteractionMutation = useCreateInteractionMutation(personId);
  const addInteractionTriggeredRef = useRef(false);
  const {
    data: interactionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContactInteractionsInfiniteQuery(personId);
  const activities = interactionsData?.pages.flatMap((page) => page.activities) ?? [];
  const hasMore = hasNextPage ?? false;
  const { data: selectableContactsData } = useContactsSelectableListQuery(
    PERSON_SELECTABLE_CONTACTS,
  );

  const selectableContacts = useMemo(
    () => (selectableContactsData?.contacts ?? []).filter((candidate) => candidate.id !== personId),
    [selectableContactsData?.contacts, personId],
  );

  const contactsById = useMemo(() => {
    return new Map([[contact.id, contact]]);
  }, [contact]);

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
  }, [searchParams, activityModalContacts, contact.id, pathname, router]);

  const handleActivityClick = (activity: Activity) => {
    openNewActivityModal({
      activity,
      contacts: activityModalContacts,
    });
  };

  const resolveParticipants = (activity: Activity): Contact[] => {
    return (activity.participants || [])
      .map((participant) => {
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

  const handleDelete = (activity: Activity) => {
    openStandardConfirmModal({
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      confirmLabel: t("DeleteAction"),
      message: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      onConfirm: async () => {
        try {
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              description: t("ActivityDeleted"),
              title: t("SuccessTitle"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              description: t("DeleteFailed"),
              title: t("ErrorTitle"),
            }),
          );
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} />}
          isDangerous={true}
          text={t("DeleteConfirmTitle")}
        />
      ),
    });
  };

  const handleDuplicate = async (activity: Activity) => {
    const participantIds = (activity.participants || [])
      .map((participant) => (typeof participant === "string" ? participant : participant.id))
      .filter((id): id is string => Boolean(id));

    const loadingNotificationId = notifications.show({
      ...loadingNotificationTemplate({
        description: t("DuplicateInteraction.LoadingDescription"),
        title: tCommon("feedback.duplicating"),
      }),
    });

    try {
      await createInteractionMutation.mutateAsync({
        date: activity.date,
        description: activity.description || "",
        participantIds,
        title: activity.title || "",
        type: activity.type,
      });

      notifications.update({
        ...successNotificationTemplate({
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
          title: t("SuccessTitle"),
        }),
        id: loadingNotificationId,
      });
    } catch {
      notifications.update({
        ...errorNotificationTemplate({
          description: t("DuplicateFailed"),
          title: t("ErrorTitle"),
        }),
        id: loadingNotificationId,
      });
    }
  };

  return (
    <Stack gap="xl">
      <InteractionsList
        activities={sortedActivities}
        deleteLabel={t("DeleteAction")}
        duplicateLabel={t("DuplicateAction")}
        editLabel={t("EditAction")}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onEdit={(activity) => {
          openNewActivityModal({
            activity,
            contacts: activityModalContacts,
          });
        }}
        onOpen={handleActivityClick}
        resolveParticipants={resolveParticipants}
      />

      {hasMore ? (
        <Center>
          <Button
            loading={isFetchingNextPage}
            onClick={() => {
              void fetchNextPage();
            }}
            variant="light"
          >
            {t("LoadMoreBatch")}
          </Button>
        </Center>
      ) : null}

      {activities.length === 0 && (
        <Text c="dimmed" py="xl" size="sm" ta="center">
          {t("NoActivitiesWithPerson")}
        </Text>
      )}
    </Stack>
  );
}
