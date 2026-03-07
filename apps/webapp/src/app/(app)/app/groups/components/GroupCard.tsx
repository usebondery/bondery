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
  IconFolderCog,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import type { GroupWithCount } from "@bondery/types";
import { PersonAvatarGroup } from "@bondery/mantine-next";

// ── Color maps ──────────────────────────────────────────

type HighlightColor = "primary" | "green" | "red";

const BORDER_COLOR: Record<HighlightColor, string> = {
  primary: "var(--mantine-primary-color-filled)",
  green: "var(--mantine-color-green-filled)",
  red: "var(--mantine-color-red-filled)",
};

const BG_COLOR: Record<HighlightColor, string> = {
  primary: "var(--mantine-primary-color-light)",
  green: "var(--mantine-color-green-light)",
  red: "var(--mantine-color-red-light)",
};

const FILLED_COLOR: Record<"primary" | "green", string> = {
  primary: "var(--mantine-primary-color-filled)",
  green: "var(--mantine-color-green-filled)",
};

// ── Prop types ──────────────────────────────────────────

interface GroupCardCommonProps {
  interactive?: boolean;
  selected?: boolean;
  showMenu?: boolean;
  cursorType?: "pointer" | "default";
  highlightColor?: HighlightColor;
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
  actionColor?: "primary" | "green";
}

type GroupCardProps = GroupEntityCardProps | GroupActionCardProps;

export const GROUP_CARD_MAX_WIDTH_BY_VARIANT: Record<"default" | "small" | "action", string> = {
  default: "18rem",
  small: "14rem",
  action: "14rem",
};

// ── Shared card shell ───────────────────────────────────

/**
 * Shared layout wrapper used by both entity and action card variants.
 * Renders a Card with a colored top section and a body Stack underneath.
 * Because both variants render through this same component, their DOM
 * structure (and therefore height) is guaranteed to be identical.
 */
function GroupCardShell({
  compact,
  shadow,
  maxWidth,
  interactive,
  cursorType,
  highlightColor,
  onClick,
  className,
  sectionBg,
  sectionContent,
  sectionOverlay,
  label,
  bottomRow,
}: {
  compact: boolean;
  shadow: string;
  maxWidth: string;
  interactive: boolean;
  cursorType?: "pointer" | "default";
  highlightColor?: HighlightColor;
  onClick: (e: MouseEvent) => void;
  className: string;
  sectionBg: string;
  sectionContent: ReactNode;
  sectionOverlay?: ReactNode;
  label: string;
  bottomRow: ReactNode;
}) {
  return (
    <Card
      shadow={shadow}
      p={compact ? "sm" : "md"}
      style={{
        cursor: cursorType || (interactive ? "pointer" : "default"),
        maxWidth,
      }}
      className={className}
      bd={highlightColor ? `1px solid ${BORDER_COLOR[highlightColor]}` : undefined}
      bg={highlightColor ? BG_COLOR[highlightColor] : undefined}
      onClick={onClick}
    >
      <Card.Section bg={sectionBg} h={compact ? 72 : 80} pos="relative">
        {sectionOverlay}
        <Group justify="center" h="100%">
          {sectionContent}
        </Group>
      </Card.Section>

      <Stack gap={compact ? 8 : 10} mt={compact ? "sm" : "md"} align="stretch">
        <Text fw={600} size={compact ? "sm" : "md"} ta="center" lineClamp={1}>
          {label}
        </Text>
        {/* minH matches Mantine Avatar size so all cards share the same
            bottom-row height regardless of content (avatars vs text). */}
        <Group justify="center" mih={compact ? 26 : 38}>
          {bottomRow}
        </Group>
      </Stack>
    </Card>
  );
}

// ── Context menu ────────────────────────────────────────

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

// ── Main component ──────────────────────────────────────

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
  const compact = variant !== "default";
  const maxWidth = GROUP_CARD_MAX_WIDTH_BY_VARIANT[variant];
  const resolvedHighlightColor = highlightColor || (selected ? "primary" : undefined);
  const className = `w-full ${interactive ? "card-scale-effect" : ""}`.trim();

  // ── Action card ─────────────────────────────────────

  if (props.variant === "action") {
    const actionColor = props.actionColor ?? "primary";
    const actionIcon = props.actionIcon || <IconFolderCog size={compact ? 20 : 24} />;

    return (
      <GroupCardShell
        compact={compact}
        shadow={shadow}
        maxWidth={maxWidth}
        interactive={interactive}
        cursorType={cursorType}
        onClick={() => interactive && props.onActionClick()}
        className={className}
        sectionBg={BG_COLOR[actionColor]}
        sectionContent={<Group c={FILLED_COLOR[actionColor]}>{actionIcon}</Group>}
        label={props.actionLabel}
        bottomRow={null}
      />
    );
  }

  // ── Entity card ─────────────────────────────────────

  const group = props.group;
  const previewContacts = group.previewContacts || [];
  const peopleLabel = `${group.contactCount} ${group.contactCount === 1 ? "person" : "people"}`;

  const handleCardClick = (e: MouseEvent) => {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("[data-menu-trigger]")) return;
    props.onClick(group.id);
  };

  return (
    <GroupCardShell
      compact={compact}
      shadow={shadow}
      maxWidth={maxWidth}
      interactive={interactive}
      cursorType={cursorType}
      highlightColor={resolvedHighlightColor}
      onClick={handleCardClick}
      className={className}
      sectionBg={group.color}
      sectionOverlay={
        showMenu ? (
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            <GroupCardMenu
              group={group}
              menuOpened={menuOpened}
              setMenuOpened={setMenuOpened}
              onAddPeople={props.onAddPeople}
              onEdit={props.onEdit}
              onDuplicate={props.onDuplicate}
              onDelete={props.onDelete}
              iconSize={compact ? "sm" : "md"}
            />
          </div>
        ) : undefined
      }
      sectionContent={
        <Text style={{ fontSize: compact ? 34 : 40, lineHeight: 1 }}>{group.emoji}</Text>
      }
      label={group.label}
      bottomRow={
        previewContacts.length > 0 ? (
          <PersonAvatarGroup
            people={previewContacts.map((contact) => ({
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              avatar: contact.avatar,
            }))}
            totalCount={group.contactCount}
            size={compact ? "sm" : "md"}
          />
        ) : (
          <Text size="sm" c="dimmed">
            {peopleLabel}
          </Text>
        )
      }
    />
  );
}
