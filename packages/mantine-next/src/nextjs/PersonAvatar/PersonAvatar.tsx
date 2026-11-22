"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactPreview } from "@bondery/schemas";
import { Avatar } from "@mantine/core";
import type { ReactElement } from "react";
import Link, { hrefAssert } from "#nextjs/NextLink.js";
import { PersonAvatarTooltip } from "#nextjs/PersonAvatar/PersonAvatarTooltip.js";
import { getAvatarColorFromName } from "#utils/avatarColor.js";
import { nonEmpty } from "#utils/nonEmpty.js";

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
}: PersonAvatarProps): ReactElement {
  const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
  const resolvedHref = nonEmpty(href) ?? `${WEBAPP_ROUTES.PERSON}/${person.id}`;

  const avatar = (
    <Avatar
      color={getAvatarColorFromName(person.firstName, person.lastName)}
      name={fullName}
      radius="xl"
      size={size}
      src={nonEmpty(person.avatar)}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    />
  );

  const markedUp = isClickable ? <Link href={hrefAssert(resolvedHref)}>{avatar}</Link> : avatar;

  return <PersonAvatarTooltip person={person}>{markedUp}</PersonAvatarTooltip>;
}
