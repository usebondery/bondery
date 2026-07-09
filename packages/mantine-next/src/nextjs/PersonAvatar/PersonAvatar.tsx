"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactPreview } from "@bondery/schemas";
import { Avatar } from "@mantine/core";
import Link from "#nextjs/NextLink.js";
import { PersonAvatarTooltip } from "#nextjs/PersonAvatar/PersonAvatarTooltip.js";
import { getAvatarColorFromName } from "#utils/avatarColor.js";

type PersonAvatarIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
};

interface PersonAvatarProps {
  href?: string;
  isClickable?: boolean;
  person: PersonAvatarIdentity;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
}

export function PersonAvatar({
  person,
  size = "md",
  isClickable = false,
  href,
}: PersonAvatarProps) {
  const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
  const resolvedHref = href || `${WEBAPP_ROUTES.PERSON}/${person.id}`;

  const avatar = (
    <Avatar
      color={getAvatarColorFromName(person.firstName, person.lastName)}
      name={fullName}
      radius="xl"
      size={size}
      src={person.avatar || undefined}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    />
  );

  return (
    <PersonAvatarTooltip person={person}>
      {isClickable ? <Link href={resolvedHref}>{avatar}</Link> : avatar}
    </PersonAvatarTooltip>
  );
}
