import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Skeleton for a settings section card (Paper withBorder).
 * @param rows - Number of form-row-shaped skeletons to render inside.
 */
function SettingsCardSkeleton({ rows = 2, title = true }: { rows?: number; title?: boolean }) {
  return (
    <Paper p="md" radius="md" shadow="sm" withBorder>
      <Stack gap="md">
        {title && <Skeleton height={20} radius="sm" width={160} />}
        {Array.from({ length: rows }, (_, row) => row).map((row) => (
          <Group gap="sm" justify="space-between" key={row}>
            <Stack gap={4}>
              <Skeleton height={14} radius="sm" width={120} />
              <Skeleton height={12} radius="sm" width={200} />
            </Stack>
            <Skeleton height={36} radius="sm" width={160} />
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

/**
 * Full-page skeleton for the Settings page.
 * Mirrors the Stack of cards: Support, Profile, Subscription, Preferences, Tags, Data Management.
 * Settings uses ErrorPageHeader (icon=settings, no action buttons).
 */
export function SettingsPageSkeleton() {
  return (
    <Box p="xl">
      {/* Header: settings icon + title, no action buttons */}
      <PageHeaderSkeleton />

      <Stack gap="xl">
        {/* Support card: compact, 1 row */}
        <SettingsCardSkeleton rows={1} />
        {/* Profile card: avatar + name/email rows */}
        <Paper p="md" radius="md" shadow="sm" withBorder>
          <Stack gap="md">
            <Skeleton height={20} radius="sm" width={100} />
            <Group gap="md">
              <Skeleton height={64} radius="xl" width={64} />
              <Stack gap="xs">
                <Skeleton height={16} radius="sm" width={140} />
                <Skeleton height={14} radius="sm" width={200} />
              </Stack>
            </Group>
            <Group justify="space-between">
              <Stack gap={4}>
                <Skeleton height={14} radius="sm" width={80} />
                <Skeleton height={12} radius="sm" width={160} />
              </Stack>
              <Skeleton height={36} radius="sm" width={100} />
            </Group>
          </Stack>
        </Paper>
        {/* Preferences card: timezone, theme, time format */}
        <SettingsCardSkeleton rows={3} />
        {/* Tags section */}
        <Paper p="md" radius="md" shadow="sm" withBorder>
          <Stack gap="md">
            <Skeleton height={20} radius="sm" width={80} />
            <Group gap="xs">
              {[90, 70, 100, 65, 85].map((w) => (
                <Skeleton height={28} key={w} radius="xl" width={w} />
              ))}
            </Group>
          </Stack>
        </Paper>
        {/* Data management card */}
        <SettingsCardSkeleton rows={2} />
      </Stack>
    </Box>
  );
}
