import { Box, Paper, Skeleton, Stack } from "@mantine/core";
import { cardStyles as styles } from "@/components/contacts/recommendationCardLayout";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Skeleton for a single recommendation card.
 * Mirrors the real card: badge, the people, then the action row. The shared
 * layout classes give it the same mobile-centred and desktop-row shapes as the
 * real card.
 */
function MergeRecommendationCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper p="md" radius="md" style={{ opacity }} withBorder>
      <div className={styles.layout}>
        <div className={styles.content}>
          {/* Badge */}
          <Skeleton height={20} radius="xl" width={70} />
          {/* Person, "merge with", person */}
          <div className={styles.people}>
            <Skeleton height={32} radius="xl" width={150} />
            <Skeleton height={14} radius="sm" width={72} />
            <Skeleton height={32} radius="xl" width={150} />
          </div>
        </div>
        {/* Action buttons */}
        <div className={styles.actions}>
          <Skeleton height={36} radius="sm" width={80} />
          <Skeleton height={36} radius="sm" width={80} />
        </div>
      </div>
    </Paper>
  );
}

/**
 * Full-page skeleton for the Fix & Merge page.
 * Mirrors: PageHeader (SegmentedControl + Refresh button) + merge recommendation cards.
 */
export function FixPageSkeleton() {
  return (
    <Box p={{ base: 0, sm: "xl" }}>
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
