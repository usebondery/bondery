"use client";

import { Avatar, AvatarProps } from "@mantine/core";

interface UserAvatarProps extends Omit<AvatarProps, "name" | "alt" | "src"> {
  avatarUrl: string | null;
  userName: string;
  onClick?: () => void;
  style?: React.CSSProperties;
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
      src={avatarUrl}
      alt={`${userName}'s avatar`}
      radius="xl"
      size={size}
      name={userName}
      onClick={onClick}
      style={combinedStyle}
      {...props}
    />
  );
}
