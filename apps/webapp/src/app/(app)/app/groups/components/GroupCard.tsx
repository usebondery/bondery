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
  Stack,
} from "@mantine/core";
import {
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import type { GroupWithCount } from "@bondery/types";
import { PersonAvatarGroup } from "@bondery/mantine-next";

interface GroupCardCommonProps {
  interactive?: boolean;
  selected?: boolean;
  showMenu?: boolean;
  cursorType?: "pointer" | "default";
  highlightColor?: "primary" | "green" | "red";
  shadow?: string;
}

interface GroupEntityCardProps extends GroupCardCommonProps {
  group: GroupWithCount;
  onAddPeople: (group: GroupWithCount) => void;
  onEdit: (group: GroupWithCount) => void;
  onDuplicate: (group: GroupWithCount) => void;
  onDelete: (groupId: string) => void;
  onClick: (groupId: string) => void;
  variant?: "default" | "small";
}

interface GroupActionCardProps extends GroupCardCommonProps {
  variant: "action";
  actionLabel: string;
  onActionClick: () => void;
  actionIcon?: ReactNode;
}

type GroupCardProps = GroupEntityCardProps | GroupActionCardProps;

export const GROUP_CARD_MAX_WIDTH_BY_VARIANT: Record<"default" | "small" | "action", string> = {
  default: "18rem",
  small: "14rem",
  action: "14rem",
};

function GroupCardMenu({
  group,
  menuOpened,
  setMenuOpened,
  onAddPeople,
  onEdit,
  onDuplicate,
  onDelete,
  iconSize,
}: {
  group: GroupWithCount;
  menuOpened: boolean;
  setMenuOpened: (opened: boolean) => void;
  onAddPeople: (group: GroupWithCount) => void;
  onEdit: (group: GroupWithCount) => void;
  onDuplicate: (group: GroupWithCount) => void;
  onDelete: (groupId: string) => void;
  iconSize: "sm" | "md";
}) {
  return (
    <Menu shadow="md" opened={menuOpened} onChange={setMenuOpened} position="bottom-end">
      <MenuTarget>
        <ActionIcon
          variant="default"
          size={iconSize}
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
          leftSection={<IconUserPlus size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpened(false);
            onAddPeople(group);
          }}
        >
          Add people to group
        </MenuItem>
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
  );
}

export function GroupCard(props: GroupCardProps) {
  const [menuOpened, setMenuOpened] = useState(false);
  const {
    interactive = true,
    selected = false,
    showMenu = true,
    cursorType,
    highlightColor,
    shadow = "none",
  } = props;
  const variant = props.variant || "default";
  const isCompactVariant = variant === "small" || variant === "action";
  const isSmallVariant = variant === "small";
  const cardClassByVariant = "w-full";
  const cardMaxWidth = GROUP_CARD_MAX_WIDTH_BY_VARIANT[variant];

  const resolvedHighlightColor = highlightColor || (selected ? "primary" : undefined);
  const borderColorByHighlight: Record<"primary" | "green" | "red", string> = {
    primary: "var(--mantine-primary-color-filled)",
    green: "var(--mantine-color-green-filled)",
    red: "var(--mantine-color-red-filled)",
  };
  const backgroundColorByHighlight: Record<"primary" | "green" | "red", string> = {
    primary: "var(--mantine-primary-color-light)",
    green: "var(--mantine-color-green-light)",
    red: "var(--mantine-color-red-light)",
  };

  if (props.variant === "action") {
    const actionIcon = props.actionIcon || <IconPlus size={isCompactVariant ? 20 : 24} />;

    return (
      <Card
        shadow={shadow}
        p={isCompactVariant ? "sm" : "md"}
        style={{
          cursor: cursorType || (interactive ? "pointer" : "default"),
          maxWidth: cardMaxWidth,
        }}
        className={`${cardClassByVariant} ${interactive ? "card-scale-effect" : undefined}`}
        onClick={() => {
          if (!interactive) {
            return;
          }
          props.onActionClick();
        }}
      >
        <Card.Section bg="var(--mantine-primary-color-light)" h={isCompactVariant ? 72 : 80}>
          <Group justify="center" h="100%" c="var(--mantine-primary-color-filled)">
            {actionIcon}
          </Group>
        </Card.Section>

        <Stack gap={isCompactVariant ? 8 : 10} mt={isCompactVariant ? "sm" : "md"} align="stretch">
          <Text fw={600} size={isCompactVariant ? "sm" : "md"} ta="center" lineClamp={1}>
            {props.actionLabel}
          </Text>
          <Group justify="center">
            <Text size="sm" c="dimmed">
              Manage memberships
            </Text>
          </Group>
        </Stack>
      </Card>
    );
  }

  const groupProps = props;
  const group = groupProps.group;
  const peopleLabel = `${group.contactCount} ${group.contactCount === 1 ? "person" : "people"}`;
  const previewContacts: NonNullable<GroupWithCount["previewContacts"]> =
    group.previewContacts || [];

  const handleCardClick = (e: MouseEvent) => {
    if (!interactive) {
      return;
    }

    if ((e.target as HTMLElement).closest("[data-menu-trigger]")) {
      return;
    }
    groupProps.onClick(group.id);
  };

  return (
    <Card
      shadow={shadow}
      p={isSmallVariant ? "sm" : "md"}
      style={{
        cursor: cursorType || (interactive ? "pointer" : "default"),
        maxWidth: cardMaxWidth,
      }}
      className={`${cardClassByVariant} ${interactive ? "card-scale-effect" : undefined}`}
      bd={
        resolvedHighlightColor
          ? `1px solid ${borderColorByHighlight[resolvedHighlightColor]}`
          : undefined
      }
      bg={resolvedHighlightColor ? backgroundColorByHighlight[resolvedHighlightColor] : undefined}
      onClick={handleCardClick}
    >
      <>
        <Card.Section bg={group.color} h={isSmallVariant ? 72 : 80} pos="relative">
          {showMenu && (
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <GroupCardMenu
                group={group}
                menuOpened={menuOpened}
                setMenuOpened={setMenuOpened}
                onAddPeople={groupProps.onAddPeople}
                onEdit={groupProps.onEdit}
                onDuplicate={groupProps.onDuplicate}
                onDelete={groupProps.onDelete}
                iconSize={isSmallVariant ? "sm" : "md"}
              />
            </div>
          )}
          <Group justify="center" h="100%">
            <Text style={{ fontSize: isSmallVariant ? 34 : 40, lineHeight: 1 }}>{group.emoji}</Text>
          </Group>
        </Card.Section>

        <Stack gap={isSmallVariant ? 8 : 10} mt={isSmallVariant ? "sm" : "md"} align="stretch">
          <Text fw={600} size={isSmallVariant ? "sm" : "md"} ta="center" lineClamp={1}>
            {group.label}
          </Text>

          <Group justify="center">
            {previewContacts.length > 0 ? (
              <PersonAvatarGroup
                people={previewContacts.map((contact) => ({
                  id: contact.id,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  avatar: contact.avatar,
                }))}
                totalCount={group.contactCount}
                size={isSmallVariant ? "sm" : "md"}
              />
            ) : (
              <Text size="sm" c="dimmed">
                {peopleLabel}
              </Text>
            )}
          </Group>
        </Stack>
      </>
    </Card>
  );
}
