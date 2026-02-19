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
  ThemeIcon,
  Divider,
} from "@mantine/core";
import {
  IconCalendar,
  IconMail,
  IconBrandLinkedin,
  IconBrandGoogle,
  IconX,
  IconTrash,
  IconExternalLink,
  IconUserPlus,
} from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding/react";
import type { Activity, Contact } from "@bondery/types";
import { useState, useEffect } from "react";
import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { useRouter } from "next/navigation";
import { BonderyIconWhite, BonderyLogotypeWhite } from "@bondery/branding";

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
      const res = await fetch(`${API_ROUTES.ACTIVITIES}/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: note,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update activity");
      }

      notifications.show({
        title: "Success",
        message: "Activity updated successfully",
        color: "green",
      });

      router.refresh();
      onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update activity",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.ACTIVITIES}/${activity.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete activity");
      }

      notifications.show({
        title: "Success",
        message: "Activity deleted successfully",
        color: "green",
      });

      router.refresh();
      onClose();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete activity",
        color: "red",
      });
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
        <Group gap="xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <IconCalendar size={24} />
              <Text fw={600} size="lg">
                {activity.type}
              </Text>
            </div>
            <Text c="dimmed">
              {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {", "}
              {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </Text>
          </div>
        </Group>
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
                      color={participant.avatarColor || "blue"}
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
                    <ActionIcon
                      variant="light"
                      color="blue"
                      radius="xl"
                      size="sm"
                      component={Link}
                      href={`${WEBAPP_ROUTES.PERSON}/${participant.id}`}
                    >
                      <BonderyIcon width={14} height={14} />
                    </ActionIcon>
                    {participant.linkedin && (
                      <ActionIcon
                        component="a"
                        href={participant.linkedin}
                        target="_blank"
                        variant="light"
                        color="blue"
                        radius="xl"
                        size="sm"
                      >
                        <IconBrandLinkedin size={14} />
                      </ActionIcon>
                    )}
                    {/* Email Action */}
                    {(participant.emails as any)?.[0]?.value && (
                      <ActionIcon
                        component="a"
                        href={`mailto:${(participant.emails as any)?.[0]?.value}`}
                        variant="light"
                        color="gray"
                        radius="xl"
                        size="sm"
                      >
                        <IconMail size={14} />
                      </ActionIcon>
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
