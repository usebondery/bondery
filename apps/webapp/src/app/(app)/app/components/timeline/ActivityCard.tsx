"use client";

import {
  ActionIcon,
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
import { IconCopy, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import type { Activity } from "@bondery/types";
import { getActivityTypeConfig, type ActivityTypeConfig } from "@/lib/activityTypes";

interface ActivityCardProps {
  activity: Activity;
  editLabel: string;
  duplicateLabel: string;
  deleteLabel: string;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function getTypeLabel(type: string, typeConfig: ActivityTypeConfig): string {
  return type.toUpperCase() || typeConfig.emoji;
}

export function ActivityCard({
  activity,
  editLabel,
  duplicateLabel,
  deleteLabel,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: ActivityCardProps) {
  const typeConfig = getActivityTypeConfig(activity.type);
  const date = new Date(activity.date);

  return (
    <Paper
      p="sm"
      withBorder
      radius="md"
      onClick={onOpen}
      style={{ cursor: "pointer", transition: "border-color 0.2s", position: "relative" }}
      className="max-w-md"
    >
      <Menu position="bottom-end" shadow="md">
        <MenuTarget>
          <ActionIcon
            variant="subtle"
            onClick={(event) => event.stopPropagation()}
            style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
          >
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
            leftSection={<IconCopy size={14} />}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
          >
            {duplicateLabel}
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

      <Stack gap="2" style={{ minWidth: 0, paddingRight: 28 }}>
        <Group gap="xs" align="center" wrap="nowrap">
          <Text c="dimmed" size="xs">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Badge
            color={typeConfig.color}
            variant="light"
            radius="xl"
            size="xs"
            leftSection={typeConfig.emoji}
          >
            {getTypeLabel(activity.type, typeConfig)}
          </Badge>
        </Group>

        <Text fw={700} size="md">
          {activity.title || activity.type}
        </Text>

        {activity.description && (
          <Text size="xs" c="dimmed">
            {activity.description}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
