"use client";

import {
  ActionIcon,
  Badge,
  Box,
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
import type { Activity } from "@bondery/schemas";
import type { ReactNode } from "react";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";

interface ActivityCardProps {
  activity: Activity;
  editLabel: string;
  duplicateLabel: string;
  deleteLabel: string;
  leftSection?: ReactNode;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ActivityCard({
  activity,
  editLabel,
  duplicateLabel,
  deleteLabel,
  leftSection,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: ActivityCardProps) {
  const getInteractionTypeLabel = useInteractionTypeLabel();
  const formatter = useFormatter();
  const typeConfig = getActivityTypeConfig(activity.type);
  const date = new Date(activity.date);
  const typeLabel = getInteractionTypeLabel(activity.type) || typeConfig.emoji;

  return (
    <Paper
      p={0}
      withBorder
      shadow="none"
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

      <Group align="stretch" wrap="nowrap" gap={"md"} p="sm">
        {leftSection ? (
          <Box className="flex justify-center items-center shrink-0 min-w-20">{leftSection}</Box>
        ) : null}

        <Stack gap="2" style={{ flex: 1 }}>
          <Group gap="xs" align="center" wrap="nowrap">
            <Text c="dimmed" size="xs">
              {formatter.dateTime(date, {
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
              {typeLabel}
            </Badge>
          </Group>

          <Text fw={700} size="md">
            {activity.title || typeLabel}
          </Text>

          {activity.description && (
            <Text size="xs" c="dimmed">
              {activity.description}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
