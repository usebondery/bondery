"use client";

import { Avatar, type AvatarProps } from "@mantine/core";

interface UserAvatarProps extends Omit<AvatarProps, "name" | "alt" | "src"> {
  avatarUrl: string | null;
  onClick?: () => void;
  style?: React.CSSProperties;
  userName: string;
}

/**
 * Shared user avatar component with consistent styling
 * Used across the application for displaying user profile photos
 */
export function UserAvatar({
  avatarUrl,
  userName,
  size = "md",
  onClick,
  style,
  ...props
}: UserAvatarProps) {
  // Ensure circular shape for numeric sizes
  const combinedStyle = typeof size === "number" ? { ...style, borderRadius: "50%" } : style;

  return (
    <Avatar
      alt={`${userName}'s avatar`}
      name={userName}
      onClick={onClick}
      radius="xl"
      size={size}
      src={avatarUrl}
      style={combinedStyle}
      {...props}
    />
  );
}
