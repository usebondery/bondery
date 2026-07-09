import { Avatar, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface UserCardProps {
  avatarUrl?: string | null;
  name: string;
  rightSection?: ReactNode;
  subtitle?: string;
}

export function UserCard({ name, subtitle, avatarUrl, rightSection }: UserCardProps) {
  return (
    <Group align="center" justify="space-between" wrap="nowrap">
      <Group align="center" gap="md" wrap="nowrap">
        <Avatar name={name} radius="xl" size="md" src={avatarUrl ?? undefined} />
        <Stack gap={0}>
          <Text fw={500} size="sm" truncate>
            {name}
          </Text>
          {subtitle ? (
            <Text c="dimmed" size="xs" truncate>
              {subtitle}
            </Text>
          ) : null}
        </Stack>
      </Group>
      {rightSection}
    </Group>
  );
}
