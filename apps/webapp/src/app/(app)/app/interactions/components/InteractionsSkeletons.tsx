import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Skeleton for a single interaction row in the timeline view.
 * Mirrors: avatar circle + title + date + participant chips.
 */
function InteractionRowSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper p="md" radius="md" style={{ opacity }} withBorder>
      <Group align="flex-start" gap="sm">
        <Skeleton height={36} radius="xl" width={36} />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between">
            <Skeleton height={16} radius="sm" width={180} />
            <Skeleton height={12} radius="sm" width={70} />
          </Group>
          <Skeleton height={12} radius="sm" width="70%" />
          <Group gap="xs">
            <Skeleton height={24} radius="xl" width={80} />
            <Skeleton height={24} radius="xl" width={80} />
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

/**
 * Full-page skeleton for the Interactions page.
 * Mirrors: PageHeader (SegmentedControl + Log Interaction) + interaction list.
 */
export function InteractionsPageSkeleton() {
  return (
    <Box p="xl">
      {/* Header: SegmentedControl (~180px) + Log Interaction button (~145px) */}
      <PageHeaderSkeleton primaryActionWidth={145} secondaryActionWidth={180} />

      <Stack
        gap="md"
        style={{
          maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
        }}
      >
        {Array.from({ length: 6 }, (_, slot) => slot).map((slot) => (
          <InteractionRowSkeleton key={slot} opacity={[1, 1, 0.85, 0.65, 0.45, 0.25][slot] ?? 1} />
        ))}
      </Stack>
    </Box>
  );
}
