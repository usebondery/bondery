import { Box, Paper, SimpleGrid, Skeleton } from "@mantine/core";
import { PeopleTableSkeleton } from "@/app/(app)/app/people/components/PeopleSkeletons";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

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
        <Paper radius="md" shadow="sm" style={{ minHeight: 400 }} withBorder>
          <Skeleton height="100%" radius="md" style={{ minHeight: 400 }} />
        </Paper>
      </SimpleGrid>
    </Box>
  );
}
