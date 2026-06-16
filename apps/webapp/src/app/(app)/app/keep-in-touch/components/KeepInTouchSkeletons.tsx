import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single Keep in Touch contact row.
 * Mirrors: PersonChip (avatar + name) + frequency badge + last-met text + log button.
 */
function KeepInTouchRowSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper withBorder p="md" radius="md" style={{ opacity }}>
      <Group justify="space-between" gap="sm">
        <Group gap="xs">
          <Skeleton height={32} width={32} radius="xl" />
          <Stack gap={4}>
            <Skeleton height={14} width={130} radius="sm" />
            <Skeleton height={12} width={90} radius="sm" />
          </Stack>
        </Group>
        <Group gap="sm">
          <Skeleton height={24} width={80} radius="xl" />
          <Skeleton height={36} width={100} radius="sm" />
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
          WebkitMaskImage:
            "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      >
        {[1, 1, 0.9, 0.75, 0.55, 0.35].map((opacity, i) => (
          <KeepInTouchRowSkeleton key={i} opacity={opacity} />
        ))}
      </Stack>
    </Box>
  );
}
