"use client";

import { Avatar, Badge, type BadgeProps, type MantineColor } from "@mantine/core";
import type { ReactNode } from "react";
import { getAvatarColorFromName } from "#utils/avatarColor.js";
import { type PersonChipSize, personChipBadgeStyles, personChipSizes } from "./personChipLayout.js";

export interface PersonChipProps {
  avatar?: string | null;
  avatarEdge?: boolean;
  badgeVariant?: BadgeProps["variant"];
  color?: MantineColor;
  disabled?: boolean;
  firstName: string;
  hasPerson?: boolean;
  interactive?: boolean;
  /** Overrides `firstName` + `lastName` when set (placeholder / formatted names). */
  label?: string;
  lastName?: string | null;
  onClick?: () => void;
  rightSection?: ReactNode;
  size?: PersonChipSize;
}

/**
 * Next-free person badge. Webapp `nextjs/PersonChip` wraps this with Next.js
 * `Link` and Combobox. The Chrome extension must import this subpath, not
 * `nextjs/PersonChip`.
 */
export function PersonChip({
  firstName,
  lastName,
  avatar,
  size = "md",
  onClick,
  color = "branding-primary",
  avatarEdge = true,
  badgeVariant = "light",
  disabled = false,
  hasPerson = true,
  interactive,
  label,
  rightSection,
}: PersonChipProps) {
  const fullName = (label ?? `${firstName}${lastName ? ` ${lastName}` : ""}`).trim();
  const sizes = personChipSizes(size);
  const personAvatarColor = color === "gray" ? "gray" : getAvatarColorFromName(firstName, lastName);
  const isInteractive = interactive ?? Boolean(onClick);

  return (
    <Badge
      color={color}
      leftSection={
        hasPerson ? (
          <span style={{ alignItems: "center", display: "inline-flex" }}>
            <Avatar
              color={personAvatarColor}
              name={fullName}
              radius="xl"
              size={avatarEdge ? sizes.avatarEdgeSize : sizes.avatarSize}
              src={avatar ?? undefined}
            />
          </span>
        ) : undefined
      }
      onClick={onClick}
      rightSection={
        rightSection !== undefined ? (
          <span
            style={{
              alignItems: "center",
              display: "inline-flex",
              marginInlineEnd: -2,
            }}
          >
            {rightSection}
          </span>
        ) : undefined
      }
      size={sizes.badgeSize}
      styles={personChipBadgeStyles({
        avatarEdge,
        disabled,
        hasEndSection: Boolean(rightSection),
        hasPerson,
        interactive: isInteractive,
        size,
      })}
      variant={badgeVariant}
    >
      {fullName}
    </Badge>
  );
}
