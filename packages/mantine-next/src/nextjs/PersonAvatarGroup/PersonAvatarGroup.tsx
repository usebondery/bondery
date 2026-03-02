"use client";

import { Avatar, AvatarGroup, Stack, Tooltip } from "@mantine/core";
import type { ContactPreview } from "@bondery/types";
import { PersonAvatar } from "../PersonAvatar";

type PersonAvatarGroupIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
};

interface PersonAvatarGroupProps {
  people: PersonAvatarGroupIdentity[];
  totalCount?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  maxDisplayCount?: number;
  isClickable?: boolean;
  moreTooltipTemplate?: string;
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
    ...visiblePeople.map((person) => ({ type: "person" as const, person })),
    ...(remainingCount > 0 ? [{ type: "overflow" as const, remainingCount }] : []),
  ];

  const renderItem = (
    item:
      | { type: "person"; person: PersonAvatarGroupIdentity }
      | { type: "overflow"; remainingCount: number },
  ) => {
    if (item.type === "person") {
      return (
        <PersonAvatar
          key={item.person.id}
          person={item.person}
          size={size}
          isClickable={isClickable}
        />
      );
    }

    return (
      <Tooltip
        key="overflow"
        withArrow
        label={moreTooltipTemplate.replace("{count}", String(item.remainingCount))}
      >
        <Avatar size={size} radius="xl" color="gray" style={{ cursor: "default" }}>
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
      <Stack gap={0}>
        {rows.map((row, rowIndex) => (
          <AvatarGroup key={`row-${rowIndex}`} spacing="sm">
            {row.map((item) => renderItem(item))}
          </AvatarGroup>
        ))}
      </Stack>
    );
  }

  return <AvatarGroup spacing="sm">{displayItems.map((item) => renderItem(item))}</AvatarGroup>;
}
