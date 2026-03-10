"use client";

import { Avatar, Group, Paper, Stack, Text } from "@mantine/core";
import { IconBriefcase, IconCompass } from "@tabler/icons-react";
import type { ContactPreview } from "@bondery/types";
import { getAvatarColorFromName } from "../../utils/avatarColor";

type PersonCardIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  place?: string | null;
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
      withBorder
      shadow="md"
      radius="md"
      p="sm"
      bg="white"
      style={{ minWidth: 300, borderColor: "var(--mantine-color-gray-3)" }}
    >
      <Group gap="sm" wrap="nowrap" align="center">
        <Avatar
          src={person.avatar || undefined}
          size={size}
          radius="xl"
          color={getAvatarColorFromName(person.firstName, person.lastName)}
          name={fullName}
        />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="sm" fw={700} truncate c="dark.8">
            {fullName}
          </Text>
          {person.headline ? (
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconBriefcase size={12} stroke={1.5} style={{ flexShrink: 0 }} />
              <Text size="xs" c="gray.7" truncate>
                {person.headline}
              </Text>
            </Group>
          ) : null}
          {person.place ? (
            <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
              <IconCompass size={12} stroke={1.5} style={{ flexShrink: 0 }} />
              <Text size="xs" c="gray.7" truncate>
                {person.place}
              </Text>
            </Group>
          ) : null}
        </Stack>
      </Group>
    </Paper>
  );
}
