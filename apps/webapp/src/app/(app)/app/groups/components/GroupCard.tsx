"use client";

import {
  Card,
  Group,
  Text,
  Menu,
  ActionIcon,
  MenuTarget,
  MenuDropdown,
  MenuItem,
  Avatar,
  Stack,
} from "@mantine/core";
import { IconCopy, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import { useMemo, useState, type MouseEvent } from "react";
import type { GroupWithCount } from "@bondery/types";
import { PeopleAvatarChips } from "../../components/timeline/PeopleAvatarChips";

interface GroupCardProps {
  group: GroupWithCount;
  onEdit: (group: GroupWithCount) => void;
  onDuplicate: (group: GroupWithCount) => void;
  onDelete: (groupId: string) => void;
  onClick: (groupId: string) => void;
}

export function GroupCard({ group, onEdit, onDuplicate, onDelete, onClick }: GroupCardProps) {
  const [menuOpened, setMenuOpened] = useState(false);
  const peopleLabel = `${group.contactCount} ${group.contactCount === 1 ? "person" : "people"}`;
  const previewContacts = group.previewContacts || [];

  const formatName = useMemo(
    () => (firstName: string, lastName?: string | null) =>
      `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
    [],
  );

  const handleCardClick = (e: MouseEvent) => {
    // Don't trigger card click if menu is clicked
    if ((e.target as HTMLElement).closest("[data-menu-trigger]")) {
      return;
    }
    onClick(group.id);
  };

  return (
    <Card
      shadow="sm"
      style={{ cursor: "pointer" }}
      className="card-scale-effect"
      onClick={handleCardClick}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" align="flex-start" style={{ flex: 1 }}>
            <Avatar size="xl" color={group.color} style={{ backgroundColor: group.color }}>
              {group.emoji}
            </Avatar>
            <Stack gap={6} justify="flex-start" style={{ flex: 1 }}>
              <Text fw={600} size="xl">
                {group.label}
              </Text>
              {previewContacts.length > 0 ? (
                <PeopleAvatarChips
                  people={previewContacts.map((contact) => ({
                    id: contact.id,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    avatar: contact.avatar,
                  }))}
                  totalCount={group.contactCount}
                  size="md"
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {peopleLabel}
                </Text>
              )}
            </Stack>
          </Group>
          <Menu shadow="md" opened={menuOpened} onChange={setMenuOpened} position="bottom-end">
            <MenuTarget>
              <ActionIcon
                variant="default"
                size="md"
                className={menuOpened ? "button-scale-effect-active" : "button-scale-effect"}
                data-menu-trigger
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </MenuTarget>
            <MenuDropdown>
              <MenuItem
                leftSection={<IconEdit size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpened(false);
                  onEdit(group);
                }}
              >
                Edit
              </MenuItem>
              <MenuItem
                leftSection={<IconCopy size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpened(false);
                  onDuplicate(group);
                }}
              >
                Duplicate
              </MenuItem>
              <MenuItem
                leftSection={<IconTrash size={16} />}
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpened(false);
                  onDelete(group.id);
                }}
              >
                Delete
              </MenuItem>
            </MenuDropdown>
          </Menu>
        </Group>
      </Stack>
    </Card>
  );
}
