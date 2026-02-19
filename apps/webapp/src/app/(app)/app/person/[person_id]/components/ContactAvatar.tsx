"use client";

import { Avatar } from "@mantine/core";
import Image from "next/image";

interface ContactAvatarProps {
  avatarUrl: string | null;
  contactName: string;
  size?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Displays a contact's avatar or initials fallback
 * @param avatarUrl - URL to the contact's avatar image
 * @param contactName - Contact's name for initials fallback
 * @param size - Size of the avatar in pixels (default: 120)
 * @param onClick - Optional click handler
 * @param style - Optional additional styles
 */
export function ContactAvatar({
  avatarUrl,
  contactName,
  size = 120,
  onClick,
  style,
}: ContactAvatarProps) {
  return (
    <Avatar
      size={size}
      src={avatarUrl}
      radius="xl"
      color="initials"
      onClick={onClick}
      style={style}
      name={contactName}
    />
  );
}
