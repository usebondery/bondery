"use client";

import { Avatar } from "@mantine/core";
import type { ContactPreview } from "@bondery/types";
import Link from "next/link";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { getAvatarColorFromName } from "../../utils/avatarColor";
import { PersonAvatarTooltip } from "./PersonAvatarTooltip";

type PersonAvatarIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
};

interface PersonAvatarProps {
  person: PersonAvatarIdentity;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  isClickable?: boolean;
  href?: string;
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
      src={person.avatar || undefined}
      size={size}
      radius="xl"
      color={getAvatarColorFromName(person.firstName, person.lastName)}
      name={fullName}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    />
  );

  return (
    <PersonAvatarTooltip person={person}>
      {isClickable ? <Link href={resolvedHref}>{avatar}</Link> : avatar}
    </PersonAvatarTooltip>
  );
}
