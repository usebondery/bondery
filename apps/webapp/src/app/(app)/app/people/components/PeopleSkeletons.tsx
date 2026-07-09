import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";
import type { ColumnKey } from "@/lib/contacts/table-types";

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
  return <PageHeaderSkeleton primaryActionWidth={120} secondaryActionWidth={148} />;
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
    return <Skeleton height={14} radius="sm" style={{ flex: 1, minWidth: 240 }} width={60} />;
  }
  if (col === "social") {
    return <Skeleton height={14} mx="md" radius="sm" width={50} />;
  }
  const widthByCol: Partial<Record<ColumnKey, number>> = {
    email: 50,
    headline: 70,
    lastInteraction: 110,
    location: 60,
    phone: 50,
  };
  const w = widthByCol[col];
  if (!w) {
    return null;
  }
  return <Skeleton height={14} mx="md" radius="sm" width={w} />;
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
        <Group gap="xs" style={{ flex: 1, marginRight: "auto", minWidth: 240 }}>
          <Skeleton height={32} radius="xl" width={32} />
          <Skeleton height={14} radius="sm" width={130} />
        </Group>
      );
    case "social":
      // 7 icon slots matching SOCIAL_ACTION_ORDER, size="md" = 28px, gap-1 = 4px
      return (
        <Group gap={4} mx="md" wrap="nowrap">
          {[0, 1, 2, 3, 4, 5, 6].map((slot) => (
            <Skeleton height={28} key={slot} radius="sm" width={28} />
          ))}
        </Group>
      );
    case "headline":
      return <Skeleton height={14} mx="md" radius="sm" width={110} />;
    case "location":
      return <Skeleton height={14} mx="md" radius="sm" width={80} />;
    case "lastInteraction":
      return <Skeleton height={14} mx="md" radius="sm" width={70} />;
    case "phone":
      return <Skeleton height={14} mx="md" radius="sm" width={100} />;
    case "email":
      return <Skeleton height={14} mx="md" radius="sm" width={120} />;
    case "avatar":
      return <Skeleton height={32} mx="md" radius="xl" width={32} />;
    default:
      return <Skeleton height={14} mx="md" radius="sm" width={90} />;
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
    <Paper p="md" radius="md" shadow="sm" withBorder>
      {/* Toolbar: search + sort + columns button */}
      <Group justify="space-between" mb="md">
        <Skeleton height={36} radius="sm" width={280} />
        <Group gap="xs">
          <Skeleton height={36} radius="sm" width={36} />
          <Skeleton height={36} radius="sm" width={36} />
        </Group>
      </Group>

      {/* Table header row */}
      <Group gap={0} mb="xs" px="xs">
        <Skeleton height={14} mr={12} radius="sm" width={16} />
        {columns.map((col) => (
          <ColumnHeaderSkeleton col={col} key={col} />
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
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      >
        {Array.from({ length: 8 }, (_, row) => row).map((row) => (
          <Group
            gap={0}
            key={row}
            px="xs"
            py="sm"
            style={{
              borderTop: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Skeleton height={14} mr={12} radius="sm" width={16} />
            {columns.map((col) => (
              <ColumnCellSkeleton col={col} key={col} />
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
