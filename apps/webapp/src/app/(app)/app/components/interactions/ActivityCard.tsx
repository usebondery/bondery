"use client";

import type { Activity } from "@bondery/schemas";
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
import type { ReactNode } from "react";
import { getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";

interface ActivityCardProps {
  activity: Activity;
  deleteLabel: string;
  duplicateLabel: string;
  editLabel: string;
  leftSection?: ReactNode;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onOpen: () => void;
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
      className="max-w-md"
      onClick={onOpen}
      p={0}
      radius="md"
      shadow="none"
      style={{ cursor: "pointer", position: "relative", transition: "border-color 0.2s" }}
      withBorder
    >
      <Menu position="bottom-end" shadow="md">
        <MenuTarget>
          <ActionIcon
            onClick={(event) => event.stopPropagation()}
            style={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}
            variant="subtle"
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

      <Group align="stretch" gap={"md"} p="sm" wrap="nowrap">
        {leftSection ? (
          <Box className="flex justify-center items-center shrink-0 min-w-20">{leftSection}</Box>
        ) : null}

        <Stack gap="2" style={{ flex: 1 }}>
          <Group align="center" gap="xs" wrap="nowrap">
            <Text c="dimmed" size="xs">
              {formatter.dateTime(date, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Badge
              color={typeConfig.color}
              leftSection={typeConfig.emoji}
              radius="xl"
              size="xs"
              variant="light"
            >
              {typeLabel}
            </Badge>
          </Group>

          <Text fw={700} size="md">
            {activity.title || typeLabel}
          </Text>

          {activity.description && (
            <Text c="dimmed" size="xs">
              {activity.description}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
