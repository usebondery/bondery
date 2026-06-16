import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a settings section card (Paper withBorder).
 * @param rows - Number of form-row-shaped skeletons to render inside.
 */
function SettingsCardSkeleton({
  rows = 2,
  title = true,
}: {
  rows?: number;
  title?: boolean;
}) {
  return (
    <Paper withBorder shadow="sm" radius="md" p="md">
      <Stack gap="md">
        {title && <Skeleton height={20} width={160} radius="sm" />}
        {Array.from({ length: rows }).map((_, i) => (
          <Group key={i} justify="space-between" gap="sm">
            <Stack gap={4}>
              <Skeleton height={14} width={120} radius="sm" />
              <Skeleton height={12} width={200} radius="sm" />
            </Stack>
            <Skeleton height={36} width={160} radius="sm" />
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
        <Paper withBorder shadow="sm" radius="md" p="md">
          <Stack gap="md">
            <Skeleton height={20} width={100} radius="sm" />
            <Group gap="md">
              <Skeleton height={64} width={64} radius="xl" />
              <Stack gap="xs">
                <Skeleton height={16} width={140} radius="sm" />
                <Skeleton height={14} width={200} radius="sm" />
              </Stack>
            </Group>
            <Group justify="space-between">
              <Stack gap={4}>
                <Skeleton height={14} width={80} radius="sm" />
                <Skeleton height={12} width={160} radius="sm" />
              </Stack>
              <Skeleton height={36} width={100} radius="sm" />
            </Group>
          </Stack>
        </Paper>
        {/* Preferences card: timezone, theme, time format */}
        <SettingsCardSkeleton rows={3} />
        {/* Tags section */}
        <Paper withBorder shadow="sm" radius="md" p="md">
          <Stack gap="md">
            <Skeleton height={20} width={80} radius="sm" />
            <Group gap="xs">
              {[90, 70, 100, 65, 85].map((w, i) => (
                <Skeleton key={i} height={28} width={w} radius="xl" />
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
