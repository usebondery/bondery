import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Skeleton for a single Keep in Touch contact row.
 * Mirrors: PersonChip (avatar + name) + frequency badge + last-met text + log button.
 */
function KeepInTouchRowSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper p="md" radius="md" style={{ opacity }} withBorder>
      <Group gap="sm" justify="space-between">
        <Group gap="xs">
          <Skeleton height={32} radius="xl" width={32} />
          <Stack gap={4}>
            <Skeleton height={14} radius="sm" width={130} />
            <Skeleton height={12} radius="sm" width={90} />
          </Stack>
        </Group>
        <Group gap="sm">
          <Skeleton height={24} radius="xl" width={80} />
          <Skeleton height={36} radius="sm" width={100} />
        </Group>
      </Group>
    </Paper>
  );
}

/**
 * Full-page skeleton for the Keep in Touch page.
 * Mirrors: PageHeader (date window picker as secondary) + contact list.
 */
export function KeepInTouchPageSkeleton() {
  return (
    <Box p="md">
      {/* Header: date window picker (~160px secondary, no primary action) */}
      <PageHeaderSkeleton secondaryActionWidth={160} />

      <Stack
        gap="xs"
        style={{
          maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      >
        {Array.from({ length: 6 }, (_, slot) => slot).map((slot) => (
          <KeepInTouchRowSkeleton key={slot} opacity={[1, 1, 0.9, 0.75, 0.55, 0.35][slot] ?? 1} />
        ))}
      </Stack>
    </Box>
  );
}
