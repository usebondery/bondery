import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single merge recommendation card.
 * Mirrors: 2 PersonChips side-by-side + conflict field badges below.
 */
function MergeRecommendationCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper p="md" radius="md" style={{ opacity }} withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xl">
            {/* Left person */}
            <Group gap="xs">
              <Skeleton height={32} radius="xl" width={32} />
              <Skeleton height={14} radius="sm" width={110} />
            </Group>
            <Skeleton height={14} radius="sm" width={20} />
            {/* Right person */}
            <Group gap="xs">
              <Skeleton height={32} radius="xl" width={32} />
              <Skeleton height={14} radius="sm" width={110} />
            </Group>
          </Group>
          {/* Action buttons */}
          <Group gap="sm">
            <Skeleton height={36} radius="sm" width={80} />
            <Skeleton height={36} radius="sm" width={36} />
          </Group>
        </Group>
        {/* Conflict field badges */}
        <Group gap="xs">
          <Skeleton height={22} radius="xl" width={70} />
          <Skeleton height={22} radius="xl" width={55} />
          <Skeleton height={22} radius="xl" width={80} />
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
      <PageHeaderSkeleton primaryActionWidth={100} secondaryActionWidth={200} />

      <Stack
        gap="md"
        style={{
          maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
        }}
      >
        {Array.from({ length: 5 }, (_, slot) => slot).map((slot) => (
          <MergeRecommendationCardSkeleton
            key={slot}
            opacity={[1, 1, 0.85, 0.65, 0.4][slot] ?? 1}
          />
        ))}
      </Stack>
    </Box>
  );
}
