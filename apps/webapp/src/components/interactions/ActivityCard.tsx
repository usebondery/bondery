"use client";

import { ActionIconButton, PersonChip } from "@bondery/mantine-next";
import type { Activity, PersonPreview } from "@bondery/schemas";
import {
  Box,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconCopy, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import type { MouseEvent } from "react";
import { getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";

interface ActivityCardProps {
  actionsLabel: string;
  activity: Activity;
  deleteLabel: string;
  duplicateLabel: string;
  editLabel: string;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onOpen: () => void;
  participants: PersonPreview[];
}

function stopCardOpen(event: MouseEvent) {
  event.stopPropagation();
}

export function ActivityCard({
  actionsLabel,
  activity,
  editLabel,
  duplicateLabel,
  deleteLabel,
  participants,
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
      className="w-full"
      onClick={onOpen}
      p={0}
      radius="md"
      shadow="none"
      style={{ cursor: "pointer", overflow: "hidden" }}
      withBorder
    >
      <Group align="stretch" gap={0} wrap="nowrap">
        <Tooltip label={typeLabel}>
          <Box
            bg={`${typeConfig.color}.1`}
            style={{
              alignItems: "center",
              display: "flex",
              flexShrink: 0,
              fontSize: 16,
              justifyContent: "center",
              width: 40,
            }}
          >
            {typeConfig.emoji}
          </Box>
        </Tooltip>

        <Stack gap="xs" p="sm" style={{ flex: 1, minWidth: 0 }}>
          <Group align="flex-start" gap="xs" justify="space-between" wrap="nowrap">
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} size="md">
                {activity.title || typeLabel}
              </Text>
              <Text c="dimmed" size="xs">
                {formatter.dateTime(date, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              {activity.description ? (
                <Text c="dimmed" size="xs">
                  {activity.description}
                </Text>
              ) : null}
            </Stack>

            <Box onClick={stopCardOpen} onMouseDown={stopCardOpen}>
              <Menu position="bottom-end" shadow="md">
                <MenuTarget>
                  <ActionIconButton
                    aria-label={actionsLabel}
                    icon={<IconDotsVertical />}
                    variant="subtle"
                  />
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
            </Box>
          </Group>

          {participants.length > 0 ? (
            <Group gap="xs" onClick={stopCardOpen} onMouseDown={stopCardOpen} wrap="wrap">
              {participants.map((participant) => (
                <PersonChip
                  isClickable
                  key={participant.id}
                  person={participant}
                  showHoverCard
                  size="sm"
                />
              ))}
            </Group>
          ) : null}
        </Stack>
      </Group>
    </Paper>
  );
}
