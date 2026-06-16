import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single merge recommendation card.
 * Mirrors: 2 PersonChips side-by-side + conflict field badges below.
 */
function MergeRecommendationCardSkeleton({
  opacity = 1,
}: {
  opacity?: number;
}) {
  return (
    <Paper withBorder p="md" radius="md" style={{ opacity }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xl">
            {/* Left person */}
            <Group gap="xs">
              <Skeleton height={32} width={32} radius="xl" />
              <Skeleton height={14} width={110} radius="sm" />
            </Group>
            <Skeleton height={14} width={20} radius="sm" />
            {/* Right person */}
            <Group gap="xs">
              <Skeleton height={32} width={32} radius="xl" />
              <Skeleton height={14} width={110} radius="sm" />
            </Group>
          </Group>
          {/* Action buttons */}
          <Group gap="sm">
            <Skeleton height={36} width={80} radius="sm" />
            <Skeleton height={36} width={36} radius="sm" />
          </Group>
        </Group>
        {/* Conflict field badges */}
        <Group gap="xs">
          <Skeleton height={22} width={70} radius="xl" />
          <Skeleton height={22} width={55} radius="xl" />
          <Skeleton height={22} width={80} radius="xl" />
        </Group>
      </Stack>
    </Paper>
  );
}

/**
 * Full-page skeleton for the Fix & Merge page.
 * Mirrors: PageHeader (SegmentedControl + Refresh button) + merge recommendation cards.
 */
export function FixPageSkeleton() {
  return (
    <Box p="xl">
      {/* Header: Active/Hidden SegmentedControl (~200px) + Refresh button (~100px) */}
      <PageHeaderSkeleton secondaryActionWidth={200} primaryActionWidth={100} />

      <Stack
        gap="md"
        style={{
          maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 50%, transparent 100%)",
        }}
      >
        {[1, 1, 0.85, 0.65, 0.4].map((opacity, i) => (
          <MergeRecommendationCardSkeleton key={i} opacity={opacity} />
        ))}
      </Stack>
    </Box>
  );
}
