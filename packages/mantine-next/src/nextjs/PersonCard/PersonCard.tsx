"use client";

import type { ContactPreview } from "@bondery/schemas";
import { Avatar, Group, Paper, Stack, Text } from "@mantine/core";
import { IconBriefcase, IconCompass } from "@tabler/icons-react";
import { getAvatarColorFromName } from "#utils/avatarColor.js";

type PersonCardIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  location?: string | null;
};

export interface PersonCardProps {
  person: PersonCardIdentity;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
}

/**
 * Renders a compact person card for hover previews.
 * Shows avatar on the left with name and optional headline on the right.
 */
export function PersonCard({ person, size = "md" }: PersonCardProps) {
  const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");

  return (
    <Paper
      bg="white"
      p="sm"
      radius="md"
      shadow="md"
      style={{ borderColor: "var(--mantine-color-gray-3)", minWidth: 300 }}
      withBorder
    >
      <Group align="center" gap="sm" wrap="nowrap">
        <Avatar
          color={getAvatarColorFromName(person.firstName, person.lastName)}
          name={fullName}
          radius="xl"
          size={size}
          src={person.avatar || undefined}
        />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text c="dark.8" fw={700} size="sm" truncate>
            {fullName}
          </Text>
          {person.headline ? (
            <Group gap={4} style={{ minWidth: 0 }} wrap="nowrap">
              <IconBriefcase size={12} stroke={1.5} style={{ flexShrink: 0 }} />
              <Text c="gray.7" size="xs" truncate>
                {person.headline}
              </Text>
            </Group>
          ) : null}
          {person.location ? (
            <Group gap={4} style={{ minWidth: 0 }} wrap="nowrap">
              <IconCompass size={12} stroke={1.5} style={{ flexShrink: 0 }} />
              <Text c="gray.7" size="xs" truncate>
                {person.location}
              </Text>
            </Group>
          ) : null}
        </Stack>
      </Group>
    </Paper>
  );
}
