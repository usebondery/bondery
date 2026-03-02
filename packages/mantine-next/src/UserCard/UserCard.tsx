import { Avatar, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface UserCardProps {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  rightSection?: ReactNode;
}

/**
 * Compact user identity card with avatar and primary/secondary text.
 */
export function UserCard({ name, subtitle, avatarUrl, rightSection }: UserCardProps) {
  return (
    <Group justify="space-between" wrap="nowrap" align="center">
      <Group wrap="nowrap" gap="md" align="center">
        <Avatar src={avatarUrl ?? undefined} radius="xl" size="md" name={name} />
        <Stack gap={0}>
          <Text size="sm" fw={500} truncate>
            {name}
          </Text>
          {subtitle ? (
            <Text size="xs" c="dimmed" truncate>
              {subtitle}
            </Text>
          ) : null}
        </Stack>
      </Group>
      {rightSection}
    </Group>
  );
}
