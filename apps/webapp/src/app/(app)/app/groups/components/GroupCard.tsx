"use client";

import { DotsMenuButton, PersonAvatarGroup } from "@bondery/mantine-next";
import type { GroupWithCount } from "@bondery/schemas";
import { Card, Group, Menu, MenuDropdown, MenuItem, MenuTarget, Stack, Text } from "@mantine/core";
import { IconCopy, IconEdit, IconFolderCog, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { type MouseEvent, type ReactNode, useState } from "react";
import { useCommonTranslations, useGroupsPageTranslations } from "@/lib/i18n/generated/hooks";

// ── Color maps ──────────────────────────────────────────

type HighlightColor = "primary" | "green" | "red";

const BORDER_COLOR: Record<HighlightColor, string> = {
  green: "var(--mantine-color-green-filled)",
  primary: "var(--mantine-primary-color-filled)",
  red: "var(--mantine-color-red-filled)",
};

const BG_COLOR: Record<HighlightColor, string> = {
  green: "var(--mantine-color-green-light)",
  primary: "var(--mantine-primary-color-light)",
  red: "var(--mantine-color-red-light)",
};

const FILLED_COLOR: Record<"primary" | "green", string> = {
  green: "var(--mantine-color-green-filled)",
  primary: "var(--mantine-primary-color-filled)",
};

// ── Prop types ──────────────────────────────────────────

interface GroupCardCommonProps {
  cursorType?: "pointer" | "default";
  fullWidth?: boolean;
  highlightColor?: HighlightColor;
  interactive?: boolean;
  selected?: boolean;
  shadow?: string;
  showMenu?: boolean;
}

interface GroupEntityCardProps extends GroupCardCommonProps {
  group: GroupWithCount;
  onAddPeople: (group: GroupWithCount) => void;
  onClick: (groupId: string) => void;
  onDelete: (groupId: string) => void;
  onDuplicate: (group: GroupWithCount) => void;
  onEdit: (group: GroupWithCount) => void;
  variant?: "default" | "small";
}

interface GroupActionCardProps extends GroupCardCommonProps {
  actionColor?: "primary" | "green";
  actionIcon?: ReactNode;
  actionLabel: string;
  onActionClick: () => void;
  variant: "action";
}

type GroupCardProps = GroupEntityCardProps | GroupActionCardProps;

export const GROUP_CARD_MAX_WIDTH_BY_VARIANT: Record<"default" | "small" | "action", string> = {
  action: "14rem",
  default: "18rem",
  small: "14rem",
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
  fullWidth = false,
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
  fullWidth?: boolean;
  interactive: boolean;
  cursorType?: "pointer" | "default";
  highlightColor?: HighlightColor;
  onClick: (e: MouseEvent) => void;
  className: string;
  sectionBg?: string;
  sectionContent: ReactNode;
  sectionOverlay?: ReactNode;
  label: string;
  bottomRow: ReactNode;
}) {
  return (
    <Card
      bd={highlightColor ? `1px solid ${BORDER_COLOR[highlightColor]}` : undefined}
      bg={highlightColor ? BG_COLOR[highlightColor] : undefined}
      className={className}
      maw={fullWidth ? "100%" : maxWidth}
      onClick={onClick}
      p={compact ? "sm" : "md"}
      shadow={shadow}
      style={{
        cursor: cursorType || (interactive ? "pointer" : "default"),
      }}
      w="100%"
    >
      <Card.Section bg={sectionBg} h={compact ? 72 : 80} pos="relative">
        {sectionOverlay}
        <Group h="100%" justify="center">
          {sectionContent}
        </Group>
      </Card.Section>

      <Stack align="stretch" gap={compact ? 8 : 10} mt={compact ? "sm" : "md"}>
        <Text fw={600} lineClamp={1} size={compact ? "sm" : "md"} ta="center">
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
  const t = useGroupsPageTranslations();
  const tCommon = useCommonTranslations();

  return (
    <Menu onChange={setMenuOpened} opened={menuOpened} position="bottom-end" shadow="md">
      <MenuTarget>
        <DotsMenuButton
          data-menu-trigger
          onClick={(e) => {
            e.stopPropagation();
          }}
          opened={menuOpened}
          size={iconSize}
        />
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
          {t("AddPeopleToGroup")}
        </MenuItem>
        <MenuItem
          leftSection={<IconEdit size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpened(false);
            onEdit(group);
          }}
        >
          {t("Edit")}
        </MenuItem>
        <MenuItem
          leftSection={<IconCopy size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpened(false);
            onDuplicate(group);
          }}
        >
          {t("Duplicate")}
        </MenuItem>
        <MenuItem
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpened(false);
            onDelete(group.id);
          }}
        >
          {tCommon("actions.delete")}
        </MenuItem>
      </MenuDropdown>
    </Menu>
  );
}

// ── Main component ──────────────────────────────────────

export function GroupCard(props: GroupCardProps) {
  const [menuOpened, setMenuOpened] = useState(false);
  const t = useGroupsPageTranslations();
  const {
    interactive = true,
    selected = false,
    showMenu = true,
    cursorType,
    fullWidth = false,
    highlightColor,
    shadow = "none",
  } = props;

  const variant = props.variant || "default";
  const compact = variant !== "default";
  const maxWidth = fullWidth ? "100%" : GROUP_CARD_MAX_WIDTH_BY_VARIANT[variant];
  const resolvedHighlightColor = highlightColor || (selected ? "primary" : undefined);
  const className = `w-full ${interactive ? "card-scale-effect" : ""}`.trim();

  // ── Action card ─────────────────────────────────────

  if (props.variant === "action") {
    const actionColor = props.actionColor ?? "primary";
    const actionIcon = props.actionIcon || <IconFolderCog size={compact ? 20 : 24} />;

    return (
      <GroupCardShell
        bottomRow={null}
        className={className}
        compact={compact}
        cursorType={cursorType}
        fullWidth={fullWidth}
        interactive={interactive}
        label={props.actionLabel}
        maxWidth={maxWidth}
        onClick={() => interactive && props.onActionClick()}
        sectionBg={BG_COLOR[actionColor]}
        sectionContent={<Group c={FILLED_COLOR[actionColor]}>{actionIcon}</Group>}
        shadow={shadow}
      />
    );
  }

  // ── Entity card ─────────────────────────────────────

  const group = props.group;
  const previewContacts = group.previewContacts || [];
  const peopleLabel = t("ContactCount", { count: group.contactCount });

  const handleCardClick = (e: MouseEvent) => {
    if (!interactive) {
      return;
    }
    if ((e.target as HTMLElement).closest("[data-menu-trigger]")) {
      return;
    }
    props.onClick(group.id);
  };

  return (
    <GroupCardShell
      bottomRow={
        previewContacts.length > 0 ? (
          <PersonAvatarGroup
            people={previewContacts.map((contact) => ({
              avatar: contact.avatar,
              firstName: contact.firstName,
              id: contact.id,
              lastName: contact.lastName,
            }))}
            size={compact ? "sm" : "md"}
            totalCount={group.contactCount}
          />
        ) : (
          <Text c="dimmed" size="sm">
            {peopleLabel}
          </Text>
        )
      }
      className={className}
      compact={compact}
      cursorType={cursorType}
      fullWidth={fullWidth}
      highlightColor={resolvedHighlightColor}
      interactive={interactive}
      label={group.label}
      maxWidth={maxWidth}
      onClick={handleCardClick}
      sectionBg={group.color ?? undefined}
      sectionContent={
        group.emoji ? (
          <Text component="span" fz={compact ? 32 : 40} lh={1}>
            {group.emoji}
          </Text>
        ) : null
      }
      sectionOverlay={
        showMenu ? (
          <div className="absolute top-3 right-3">
            <GroupCardMenu
              group={group}
              iconSize={compact ? "sm" : "md"}
              menuOpened={menuOpened}
              onAddPeople={props.onAddPeople}
              onDelete={props.onDelete}
              onDuplicate={props.onDuplicate}
              onEdit={props.onEdit}
              setMenuOpened={setMenuOpened}
            />
          </div>
        ) : undefined
      }
      shadow={shadow}
    />
  );
}
