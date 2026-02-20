"use client";

import {
  ActionIcon,
  Avatar,
  Badge,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import type { Activity, Contact } from "@bondery/types";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { PeopleAvatarChips } from "./PeopleAvatarChips";

interface ActivityCardProps {
  activity: Activity;
  participants: Contact[];
  editLabel: string;
  deleteLabel: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function getNotesPreview(notes: string | null | undefined): string {
  if (!notes) {
    return "";
  }

  return notes.length > 50 ? `${notes.slice(0, 50)}...` : notes;
}

export function ActivityCard({
  activity,
  participants,
  editLabel,
  deleteLabel,
  onOpen,
  onEdit,
  onDelete,
}: ActivityCardProps) {
  const typeConfig = getActivityTypeConfig(activity.type);
  const date = new Date(activity.date);

  return (
    <Paper
      p="md"
      withBorder
      radius="md"
      onClick={onOpen}
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
              <ActionIcon variant="subtle" onClick={(event) => event.stopPropagation()}>
                <IconDotsVertical size={16} />
              </ActionIcon>
            </MenuTarget>
            <MenuDropdown>
              <MenuItem
                leftSection={<IconEdit size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
              >
                {editLabel}
              </MenuItem>
              <MenuItem
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                {deleteLabel}
              </MenuItem>
            </MenuDropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}
