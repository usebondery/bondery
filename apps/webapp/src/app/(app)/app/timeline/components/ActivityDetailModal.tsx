"use client";

import {
  Modal,
  Text,
  Group,
  Stack,
  Avatar,
  Button,
  Textarea,
  ActionIcon,
  Box,
} from "@mantine/core";
import { IconCalendar, IconMail, IconBrandLinkedin } from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding/react";
import type { Activity, Contact } from "@bondery/types";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { useRouter } from "next/navigation";
import {
  ActionIconLink,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import { revalidateEvents } from "../../actions";

interface ActivityDetailModalProps {
  activity: Activity | null;
  opened: boolean;
  onClose: () => void;
  contacts: Contact[];
}

export function ActivityDetailModal({
  activity,
  opened,
  onClose,
  contacts,
}: ActivityDetailModalProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (activity) {
      setNote(activity.description || "");
    }
  }, [activity]);

  if (!activity) return null;

  const date = new Date(activity.date);

  // Resolve participants
  const participants = (activity.participants || [])
    .map((p: any) => {
      const id = typeof p === "string" ? p : p.id;
      return contacts.find((c) => c.id === id);
    })
    .filter(Boolean) as Contact[];

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.EVENTS}/${activity.id}`, {
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

      await revalidateEvents();
      router.refresh();
      onClose();
    } catch (error) {
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
    if (!confirm("Are you sure you want to delete this event?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.EVENTS}/${activity.id}`, {
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

      await revalidateEvents();
      router.refresh();
      onClose();
    } catch (error) {
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
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={true}
      size="lg"
      padding="lg"
      radius="md"
      styles={{
        header: {
          alignItems: "flex-start",
        },
      }}
      title={
        <Stack gap={2}>
          <ModalTitle text={activity.type} icon={<IconCalendar size={24} />} />
          <Text c="dimmed">
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {", "}
            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </Text>
        </Stack>
      }
    >
      <Stack gap="lg">
        {/* Header */}

        {/* Google Calendar Link (Placeholder) */}
        {/* <Group gap="xs" style={{ cursor: 'pointer' }}>
            <IconExternalLink size={16} />
            <Text size="sm" fw={500}>Open in Google Calendar</Text>
        </Group> */}

        {/* Attendees */}
        <Box>
          <Group justify="space-between" mb="sm">
            <Text fw={600} size="sm" c="dimmed" tt="uppercase">
              Attendees
            </Text>
            {/* <Group gap={4} style={{ cursor: 'pointer' }}>
                    <Text size="sm" fw={500}>Add Attendees to Group</Text>
                </Group> */}
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
                        {/* Try to show email if available, or just 'Bondery Contact' */}
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
                    >
                      <BonderyIcon width={14} height={14} />
                    </ActionIconLink>
                    {participant.linkedin && (
                      <ActionIconLink
                        href={participant.linkedin}
                        target="_blank"
                        variant="light"
                        color="blue"
                        radius="xl"
                        size="sm"
                        ariaLabel="Open LinkedIn profile"
                      >
                        <IconBrandLinkedin size={14} />
                      </ActionIconLink>
                    )}
                    {/* Email Action */}
                    {(participant.emails as any)?.[0]?.value && (
                      <ActionIconLink
                        href={`mailto:${(participant.emails as any)?.[0]?.value}`}
                        variant="light"
                        color="gray"
                        radius="xl"
                        size="sm"
                        ariaLabel="Send email"
                      >
                        <IconMail size={14} />
                      </ActionIconLink>
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

        {/* Note Input */}
        <Box>
          <Textarea
            placeholder="Add a note for this meeting. Press (r) to focus."
            minRows={6}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
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

        {/* Footer Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Save changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
