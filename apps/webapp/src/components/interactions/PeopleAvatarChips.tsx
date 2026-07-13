"use client";

import { Avatar, AvatarGroup, Group, Pill, Text } from "@mantine/core";
import { getAvatarColorFromName } from "@/lib/contacts/avatarColor";

type PersonChip = {
  id: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
};

interface PeopleAvatarChipsProps {
  maxDisplay?: number;
  people: PersonChip[];
  previewVariant?: "filled" | "outline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  totalCount?: number;
  variant?: "avatars" | "preview";
}

export function PeopleAvatarChips({
  people,
  totalCount,
  size = "md",
  maxDisplay,
  variant = "avatars",
  previewVariant = "filled",
}: PeopleAvatarChipsProps) {
  const visiblePeople = maxDisplay ? people.slice(0, maxDisplay) : people;
  const remainingCount = Math.max(0, (totalCount ?? people.length) - visiblePeople.length);

  if (variant === "preview") {
    return (
      <Group gap="xs" wrap="wrap">
        {visiblePeople.map((person) => (
          <Pill
            key={person.id}
            size="md"
            styles={
              previewVariant === "outline"
                ? {
                    root: {
                      backgroundColor: "transparent",
                      border: "1px solid var(--mantine-color-default-border)",
                    },
                  }
                : undefined
            }
          >
            <Group align="center" gap={8} wrap="nowrap">
              <Avatar
                color={getAvatarColorFromName(person.firstName, person.lastName)}
                name={`${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim()}
                radius="xl"
                size={22}
                src={person.avatar || undefined}
              />

              <Text fw={500} size="sm">
                {`${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim()}
              </Text>
            </Group>
          </Pill>
        ))}
        {remainingCount > 0 && (
          <Pill
            size="md"
            styles={
              previewVariant === "outline"
                ? {
                    root: {
                      backgroundColor: "transparent",
                      border: "1px solid var(--mantine-color-default-border)",
                    },
                  }
                : undefined
            }
          >
            +{remainingCount}
          </Pill>
        )}
      </Group>
    );
  }

  return (
    <AvatarGroup spacing="sm">
      {visiblePeople.map((person) => (
        <Avatar
          color={getAvatarColorFromName(person.firstName, person.lastName)}
          key={person.id}
          name={`${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim()}
          radius="xl"
          size={size}
          src={person.avatar || undefined}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar color="gray" radius="xl" size={size}>
          +{remainingCount}
        </Avatar>
      )}
    </AvatarGroup>
  );
}
