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
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (avatarUrl) {
    return (
      <Avatar size={size} radius="xl" style={{ overflow: "hidden", ...style }} onClick={onClick}>
        <Image
          src={avatarUrl}
          alt={contactName}
          width={size}
          height={size}
          style={{ objectFit: "cover" }}
          unoptimized
        />
      </Avatar>
    );
  }

  return (
    <Avatar size={size} radius="xl" color="initials" onClick={onClick} style={style}>
      {getInitials(contactName)}
    </Avatar>
  );
}
