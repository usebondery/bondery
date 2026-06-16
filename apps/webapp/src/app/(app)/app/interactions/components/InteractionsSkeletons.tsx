import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single interaction row in the timeline view.
 * Mirrors: avatar circle + title + date + participant chips.
 */
function InteractionRowSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper withBorder p="md" radius="md" style={{ opacity }}>
      <Group gap="sm" align="flex-start">
        <Skeleton height={36} width={36} radius="xl" />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between">
            <Skeleton height={16} width={180} radius="sm" />
            <Skeleton height={12} width={70} radius="sm" />
          </Group>
          <Skeleton height={12} width="70%" radius="sm" />
          <Group gap="xs">
            <Skeleton height={24} width={80} radius="xl" />
            <Skeleton height={24} width={80} radius="xl" />
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
      <PageHeaderSkeleton secondaryActionWidth={180} primaryActionWidth={145} />

      <Stack
        gap="md"
        style={{
          maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 50%, transparent 100%)",
        }}
      >
        {[1, 1, 0.85, 0.65, 0.45, 0.25].map((opacity, i) => (
          <InteractionRowSkeleton key={i} opacity={opacity} />
        ))}
      </Stack>
    </Box>
  );
}
