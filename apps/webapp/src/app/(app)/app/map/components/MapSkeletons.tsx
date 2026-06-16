import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";
import { PeopleTableSkeleton } from "@/app/(app)/app/people/components/PeopleSkeletons";

/**
 * Full-page skeleton for the Map page.
 * Mirrors: PageHeader + split layout — contacts table on left, map placeholder on right.
 * The map itself always loads client-side, so only the table side needs a skeleton.
 */
export function MapPageSkeleton() {
  return (
    <Box p="xl">
      {/* Header: Locations/Addresses SegmentedControl (~190px), no primary action */}
      <PageHeaderSkeleton secondaryActionWidth={190} />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Left: contacts table */}
        <PeopleTableSkeleton columns={["name", "location", "headline"]} />

        {/* Right: map area placeholder */}
        <Paper withBorder shadow="sm" radius="md" style={{ minHeight: 400 }}>
          <Skeleton height="100%" radius="md" style={{ minHeight: 400 }} />
        </Paper>
      </SimpleGrid>
    </Box>
  );
}
