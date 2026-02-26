"use client";

import { Avatar } from "@mantine/core";
import Image from "next/image";

interface ContactAvatarProps {
  avatarUrl: string | null;
  contactName: string;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
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
  size,
  className,
  onClick,
  style,
}: ContactAvatarProps) {
  return (
    <Avatar
      size={size}
      src={avatarUrl}
      radius="xl"
      onClick={onClick}
      style={style}
      className={className}
      color="initials"
      name={contactName}
    />
  );
}
