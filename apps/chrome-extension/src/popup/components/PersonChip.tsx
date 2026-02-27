import React from "react";
import { Avatar, Badge } from "@mantine/core";

interface PersonChipProps {
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  size?: "sm" | "md";
  onClick?: () => void;
  color?: string;
}

export function PersonChip({
  firstName,
  lastName,
  avatar,
  size = "md",
  onClick,
  color = "branding-primary",
}: PersonChipProps) {
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();
  const avatarEdgeSize = size === "sm" ? 26 : 32;
  const badgeSize = size === "sm" ? "lg" : "xl";

  return (
    <Badge
      variant="light"
      color={color}
      size={badgeSize}
      onClick={onClick}
      leftSection={
        <Avatar
          src={avatar ?? undefined}
          size={avatarEdgeSize}
          radius="xl"
          name={fullName}
        />
      }
      styles={{
        root: {
          paddingInlineStart: 0,
          overflow: "hidden",
          cursor: onClick ? "pointer" : "default",
        },
        label: {
          textTransform: "none",
          fontWeight: 500,
        },
      }}
    >
      {fullName}
    </Badge>
  );
}
