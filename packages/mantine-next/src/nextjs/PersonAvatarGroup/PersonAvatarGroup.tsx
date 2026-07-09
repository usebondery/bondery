"use client";

import type { ContactPreview } from "@bondery/schemas";
import { Avatar, AvatarGroup, Stack, Tooltip } from "@mantine/core";
import { PersonAvatar } from "#nextjs/PersonAvatar/index.js";

type PersonAvatarGroupIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
};

interface PersonAvatarGroupProps {
  isClickable?: boolean;
  maxDisplayCount?: number;
  moreTooltipTemplate?: string;
  people: PersonAvatarGroupIdentity[];
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  totalCount?: number;
  wrap?: boolean;
  wrapRowSize?: number;
}

/**
 * Renders a compact avatar group with optional overflow avatar (+X).
 * Overflow avatar shows tooltip text based on `moreTooltipTemplate`.
 */
export function PersonAvatarGroup({
  people,
  totalCount,
  size = "md",
  maxDisplayCount = 3,
  isClickable = false,
  moreTooltipTemplate = "And {count} more",
  wrap = false,
  wrapRowSize = 2,
}: PersonAvatarGroupProps) {
  const effectiveTotalCount = totalCount ?? people.length;
  const visibleCount = Math.min(maxDisplayCount, people.length, effectiveTotalCount);
  const visiblePeople = people.slice(0, visibleCount);
  const remainingCount = Math.max(0, effectiveTotalCount - visiblePeople.length);

  const displayItems: Array<
    | { type: "person"; person: PersonAvatarGroupIdentity }
    | { type: "overflow"; remainingCount: number }
  > = [
    ...visiblePeople.map((person) => ({ person, type: "person" as const })),
    ...(remainingCount > 0 ? [{ remainingCount, type: "overflow" as const }] : []),
  ];

  const renderItem = (
    item:
      | { type: "person"; person: PersonAvatarGroupIdentity }
      | { type: "overflow"; remainingCount: number },
  ) => {
    if (item.type === "person") {
      return (
        <PersonAvatar
          isClickable={isClickable}
          key={item.person.id}
          person={item.person}
          size={size}
        />
      );
    }

    return (
      <Tooltip
        key="overflow"
        label={moreTooltipTemplate.replace("{count}", String(item.remainingCount))}
        withArrow
      >
        <Avatar color="gray" radius="xl" size={size} style={{ cursor: "default" }}>
          +{item.remainingCount}
        </Avatar>
      </Tooltip>
    );
  };

  if (wrap) {
    const rows: (typeof displayItems)[] = [];
    for (let index = 0; index < displayItems.length; index += wrapRowSize) {
      rows.push(displayItems.slice(index, index + wrapRowSize));
    }

    return (
      <Stack gap="0">
        {rows.map((row) => (
          <AvatarGroup
            key={row[0]?.id ?? row.map((item) => item.id).join("-")}
            spacing="sm"
            style={
              rowIndex === 1 ? { marginTop: "calc(var(--mantine-spacing-sm) * -1)" } : undefined
            }
          >
            {row.map((item) => renderItem(item))}
          </AvatarGroup>
        ))}
      </Stack>
    );
  }

  return <AvatarGroup spacing="sm">{displayItems.map((item) => renderItem(item))}</AvatarGroup>;
}
