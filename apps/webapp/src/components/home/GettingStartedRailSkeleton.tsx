import { Group, Paper, Skeleton, Stack } from "@mantine/core";

function TaskRowSkeleton() {
  return (
    <Group gap="sm" px={8} py={6} wrap="nowrap">
      <Skeleton height={22} radius="xl" width={22} />
      <Skeleton height={14} radius="sm" style={{ flex: 1 }} width="70%" />
    </Group>
  );
}

/** Placeholder while getting-started rail inputs hydrate. Fixed height avoids layout shift. */
export function GettingStartedRailSkeleton() {
  return (
    <Paper p="md" radius="md" style={{ minHeight: 200 }} withBorder>
      <Stack gap="md">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Stack gap={4} style={{ flex: 1 }}>
            <Skeleton height={20} radius="sm" width="45%" />
            <Skeleton height={14} radius="sm" width="30%" />
          </Stack>
          <Skeleton height={28} radius="sm" width={28} />
        </Group>
        <Skeleton height={8} radius="xl" width="100%" />
        <Stack gap="xs">
          <TaskRowSkeleton />
          <TaskRowSkeleton />
          <TaskRowSkeleton />
        </Stack>
      </Stack>
    </Paper>
  );
}
