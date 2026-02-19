"use client";

import { Avatar, AvatarGroup, Group, Pill, Text } from "@mantine/core";

type PersonChip = {
  id: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  avatarColor?: string | null;
};

interface PeopleAvatarChipsProps {
  people: PersonChip[];
  totalCount?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  maxDisplay?: number;
  variant?: "avatars" | "preview";
  previewVariant?: "filled" | "outline";
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
                      border: "1px solid var(--mantine-color-default-border)",
                      backgroundColor: "transparent",
                    },
                  }
                : undefined
            }
          >
            <Group gap={8} wrap="nowrap" align="center">
              <Avatar
                size={22}
                radius="xl"
                src={person.avatar || undefined}
                color={person.avatarColor || "blue"}
                name={`${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim()}
              />

              <Text size="sm" fw={500}>
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
                      border: "1px solid var(--mantine-color-default-border)",
                      backgroundColor: "transparent",
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
          key={person.id}
          size={size}
          radius="xl"
          src={person.avatar || undefined}
          color={person.avatarColor || "blue"}
          name={`${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim()}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} radius="xl" color="gray">
          +{remainingCount}
        </Avatar>
      )}
    </AvatarGroup>
  );
}
