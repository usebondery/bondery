"use client";

import { Text, Group, Stack, Avatar, Button, Textarea, Box } from "@mantine/core";
import { IconCalendar, IconMail, IconBrandLinkedin } from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding/react";
import type { Activity, Contact } from "@bondery/schemas";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { modals } from "@mantine/modals";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  ActionIconLink,
  ModalFooter,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import {
  useDeleteInteractionMutation,
  useUpdateInteractionMutation,
} from "@/lib/query/hooks/useInteractions";

interface OpenActivityDetailModalParams {
  activity: Activity;
  contacts: Contact[];
}

interface ActivityDetailBodyProps {
  modalId: string;
  activity: Activity;
  contacts: Contact[];
}

function ActivityDetailModalTitle({ activity }: { activity: Activity }) {
  const date = new Date(activity.date);

  return (
    <Stack gap={2}>
      <ModalTitle text={activity.type} icon={<IconCalendar size={24} />} />
      <Text c="dimmed">
        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        {", "}
        {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </Text>
    </Stack>
  );
}

function ActivityDetailBody({ modalId, activity, contacts }: ActivityDetailBodyProps) {
  const [note, setNote] = useState(activity.description || "");
  const [loading, setLoading] = useState(false);
  const updateInteractionMutation = useUpdateInteractionMutation(activity.id);
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const t = useTranslations("InteractionsPage");

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnEscape: !loading,
      closeOnClickOutside: !loading,
      withCloseButton: !loading,
    });
  }, [loading, modalId]);

  const participants = (activity.participants || [])
    .map((participant: any) => {
      const id = typeof participant === "string" ? participant : participant.id;
      return contacts.find((contact) => contact.id === id);
    })
    .filter(Boolean) as Contact[];

  const handleSave = async () => {
    setLoading(true);

    try {
      await updateInteractionMutation.mutateAsync({
        description: note,
      });

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("ActivityUpdated"),
        }),
      );

      modals.close(modalId);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("ActivityUpdateFailed"),
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    openStandardConfirmModal({
      title: t("DeleteActivity"),
      message: t("DeleteActivityConfirmMessage"),
      confirmLabel: t("DeleteActivity"),
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      onConfirm: async () => {
        setLoading(true);
        try {
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              title: t("SuccessTitle"),
              description: t("ActivityDeleted"),
            }),
          );

          modals.close(modalId);
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: t("ErrorTitle"),
              description: t("DeleteFailed"),
            }),
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" mb="sm">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            {t("Attendees")}
          </Text>
        </Group>

        <Stack gap="md">
          {participants.length > 0 ? (
            participants.map((participant) => (
              <Group key={participant.id} justify="space-between">
                <Group gap="sm">
                  <Avatar
                    src={participant.avatar}
                    size="md"
                    radius="xl"
                    color={getAvatarColorFromName(participant.firstName, participant.lastName)}
                    name={`${participant.firstName} ${participant.lastName || ""}`.trim()}
                  />

                  <Stack gap={0}>
                    <Text fw={500} size="sm">
                      {participant.firstName} {participant.lastName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {(participant.emails as any)?.[0]?.value || "Bondery Contact"}
                    </Text>
                  </Stack>
                </Group>
                <Group gap="xs">
                  <ActionIconLink
                    variant="light"
                    color="blue"
                    radius="xl"
                    size="sm"
                    href={`${WEBAPP_ROUTES.PERSON}/${participant.id}`}
                    ariaLabel={`Open ${participant.firstName} ${participant.lastName || ""}`.trim()}
                    icon={<BonderyIcon width={14} height={14} />}
                  />
                  {participant.linkedin && (
                    <ActionIconLink
                      href={participant.linkedin}
                      target="_blank"
                      variant="light"
                      color="blue"
                      radius="xl"
                      size="sm"
                      ariaLabel="Open LinkedIn profile"
                      icon={<IconBrandLinkedin size={14} />}
                    />
                  )}
                  {(participant.emails as any)?.[0]?.value && (
                    <ActionIconLink
                      href={`mailto:${(participant.emails as any)?.[0]?.value}`}
                      variant="light"
                      color="gray"
                      radius="xl"
                      size="sm"
                      ariaLabel="Send email"
                      icon={<IconMail size={14} />}
                    />
                  )}
                </Group>
              </Group>
            ))
          ) : (
            <Text c="dimmed" size="sm">
              {t("NoAttendees")}
            </Text>
          )}
        </Stack>
      </Box>

      <Box>
        <Textarea
          placeholder={t("ActivityDetailNotePlaceholder")}
          minRows={6}
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          variant="default"
          radius="md"
          styles={{
            input: {
              padding: "16px",
              fontSize: "15px",
            },
          }}
        />
      </Box>

      <ModalFooter
        backLabel={t("DeleteActivity")}
        onBack={() => {
          handleDelete();
        }}
        backDisabled={loading}
        cancelLabel={t("Cancel")}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={loading}
        actionLabel={t("SaveChanges")}
        onAction={() => {
          void handleSave();
        }}
        actionLoading={loading}
        actionDisabled={loading}
      />
    </Stack>
  );
}

export function openActivityDetailModal({
  activity,
  contacts,
}: OpenActivityDetailModalParams): void {
  const modalId = `activity-detail-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    size: "lg",
    title: <ActivityDetailModalTitle activity={activity} />,
    children: <ActivityDetailBody modalId={modalId} activity={activity} contacts={contacts} />,
  });
}
