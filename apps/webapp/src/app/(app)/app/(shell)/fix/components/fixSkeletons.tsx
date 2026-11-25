import { Paper, Skeleton, Stack } from "@mantine/core";
import classes from "@/components/contacts/MergeRecommendationCard.module.css";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";
import { PageWrapper } from "@/components/shell/PageWrapper";

/**
 * Skeleton for a single merge recommendation card.
 * Mirrors: duplicate badge, two PersonChips around the "merge with" label, and
 * the two action buttons.
 */
function MergeRecommendationCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper className={classes["card"]} p="md" radius="md" style={{ opacity }} withBorder>
      <div className={classes["badge"]}>
        <Skeleton height={18} radius="sm" width={72} />
      </div>

      <div className={classes["pair"]}>
        <div className={classes["person"]}>
          <Skeleton height={32} radius="xl" width={140} />
        </div>
        <Skeleton className={classes["label"]} height={14} radius="sm" width={64} />
        <div className={classes["person"]}>
          <Skeleton height={32} radius="xl" width={140} />
        </div>
      </div>

      <div className={classes["actions"]}>
        <Skeleton height={36} radius="sm" width={96} />
        <Skeleton height={36} radius="sm" width={120} />
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
    <PageWrapper>
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
    </PageWrapper>
  );
}
