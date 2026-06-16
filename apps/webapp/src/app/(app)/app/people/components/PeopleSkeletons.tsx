import { Box, Paper, Skeleton, Stack, Group } from "@mantine/core";
import type { ColumnKey } from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "name",
  "headline",
  "location",
  "lastInteraction",
  "social",
];

/**
 * Skeleton for the People page header.
 * Import Contacts (~148px) + Add Person (~120px).
 */
export function PeoplePageHeaderSkeleton() {
  return (
    <PageHeaderSkeleton secondaryActionWidth={148} primaryActionWidth={120} />
  );
}

interface PeopleTableSkeletonProps {
  /**
   * Visible column keys in display order.
   * Defaults to the standard 5 columns so the loading state always matches
   * what a first-time visitor sees.
   */
  columns?: ColumnKey[];
}

/**
 * Header cell skeleton for a given column key.
 * Widths approximate the real column header labels.
 */
function ColumnHeaderSkeleton({ col }: { col: ColumnKey }) {
  if (col === "name") {
    // Name column header is hidden in the real table but needs to fill the flex space
    return (
      <Skeleton
        height={14}
        width={60}
        radius="sm"
        style={{ flex: 1, minWidth: 240 }}
      />
    );
  }
  if (col === "social") {
    return <Skeleton height={14} width={50} radius="sm" mx="md" />;
  }
  const widthByCol: Partial<Record<ColumnKey, number>> = {
    headline: 70,
    location: 60,
    lastInteraction: 110,
    phone: 50,
    email: 50,
  };
  const w = widthByCol[col];
  if (!w) return null;
  return <Skeleton height={14} width={w} radius="sm" mx="md" />;
}

/**
 * Data cell skeleton for a given column key.
 * Each case mirrors the real renderer in ContactsTableV2:
 *  - name     → PersonChip: 32px avatar + text (avatarEdgeSize for size="md")
 *  - social   → 7 × 28px ActionIconLink slots with 4px gap
 *  - others   → single-line text at realistic widths
 */
function ColumnCellSkeleton({ col }: { col: ColumnKey }) {
  switch (col) {
    case "name":
      return (
        <Group gap="xs" style={{ flex: 1, minWidth: 240, marginRight: "auto" }}>
          <Skeleton height={32} width={32} radius="xl" />
          <Skeleton height={14} width={130} radius="sm" />
        </Group>
      );
    case "social":
      // 7 icon slots matching SOCIAL_ACTION_ORDER, size="md" = 28px, gap-1 = 4px
      return (
        <Group gap={4} mx="md" wrap="nowrap">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} height={28} width={28} radius="sm" />
          ))}
        </Group>
      );
    case "headline":
      return <Skeleton height={14} width={110} radius="sm" mx="md" />;
    case "location":
      return <Skeleton height={14} width={80} radius="sm" mx="md" />;
    case "lastInteraction":
      return <Skeleton height={14} width={70} radius="sm" mx="md" />;
    case "phone":
      return <Skeleton height={14} width={100} radius="sm" mx="md" />;
    case "email":
      return <Skeleton height={14} width={120} radius="sm" mx="md" />;
    case "avatar":
      return <Skeleton height={32} width={32} radius="xl" mx="md" />;
    default:
      return <Skeleton height={14} width={90} radius="sm" mx="md" />;
  }
}

/**
 * Skeleton for the contacts table Paper section only.
 * Column shapes match the real cell renderers so the layout does not shift
 * when data arrives. Used as the Suspense fallback while contacts data loads.
 */
export function PeopleTableSkeleton({
  columns = DEFAULT_VISIBLE_COLUMNS,
}: PeopleTableSkeletonProps) {
  return (
    <Paper withBorder shadow="sm" radius="md" p="md">
      {/* Toolbar: search + sort + columns button */}
      <Group justify="space-between" mb="md">
        <Skeleton height={36} width={280} radius="sm" />
        <Group gap="xs">
          <Skeleton height={36} width={36} radius="sm" />
          <Skeleton height={36} width={36} radius="sm" />
        </Group>
      </Group>

      {/* Table header row */}
      <Group gap={0} mb="xs" px="xs">
        <Skeleton height={14} width={16} radius="sm" mr={12} />
        {columns.map((col) => (
          <ColumnHeaderSkeleton key={col} col={col} />
        ))}
      </Group>

      {/*
       * 8 data rows. Fade via CSS mask-image gradient on the Stack so the
       * browser composites it on the GPU with no layout repaints.
       */}
      <Stack
        gap={0}
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Group
            key={i}
            gap={0}
            py="sm"
            px="xs"
            style={{
              borderTop: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Skeleton height={14} width={16} radius="sm" mr={12} />
            {columns.map((col) => (
              <ColumnCellSkeleton key={col} col={col} />
            ))}
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

/**
 * Full-page skeleton for the People page.
 * Used by people/loading.tsx (covers navigations and hard reloads).
 */
/**
 * Full-page skeleton for the People page.
 * Used by people/loading.tsx (covers navigations and hard reloads).
 */
export function PeoplePageSkeleton() {
  return (
    <Box p="xl">
      <PeoplePageHeaderSkeleton />
      <PeopleTableSkeleton />
    </Box>
  );
}
