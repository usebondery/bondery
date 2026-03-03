"use client";

import { Text, Group, Stack, Avatar, Button, Textarea, Box } from "@mantine/core";
import { IconCalendar, IconMail, IconBrandLinkedin } from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding/react";
import type { Activity, Contact } from "@bondery/types";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { useRouter } from "next/navigation";
import { modals } from "@mantine/modals";
import {
  ActionIconLink,
  ModalFooter,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import { revalidateInteractions } from "../../actions";

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
  const router = useRouter();

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
      const res = await fetch(`${API_ROUTES.INTERACTIONS}/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: note,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update event");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Event updated successfully",
        }),
      );

      await revalidateInteractions();
      router.refresh();
      modals.close(modalId);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to update event",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_ROUTES.INTERACTIONS}/${activity.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete event");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Event deleted successfully",
        }),
      );

      await revalidateInteractions();
      router.refresh();
      modals.close(modalId);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to delete event",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      <Box>
        <Group justify="space-between" mb="sm">
          <Text fw={600} size="sm" c="dimmed" tt="uppercase">
            Attendees
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
              No attendees
            </Text>
          )}
        </Stack>
      </Box>

      <Box>
        <Textarea
          placeholder="Add a note for this meeting. Press (r) to focus."
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
        backLabel="Delete event"
        onBack={() => {
          void handleDelete();
        }}
        backDisabled={loading}
        cancelLabel="Cancel"
        onCancel={() => modals.close(modalId)}
        cancelDisabled={loading}
        actionLabel="Save changes"
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
