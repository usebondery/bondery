import { Box, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";
import { GroupCardSkeleton } from "../../../groups/components/GroupsSkeletons";
import { PeopleTableSkeleton } from "../../../people/components/chrome/PeopleSkeletons";

/**
 * Full-page skeleton for the group detail page.
 * Mirrors: PageHeader + GroupCard + contacts table.
 */
export function GroupDetailPageSkeleton() {
  return (
    <Box p="xl">
      <Stack gap="xl">
        <PageHeaderSkeleton primaryActionWidth={160} />
        <GroupCardSkeleton />
        <PeopleTableSkeleton />
      </Stack>
    </Box>
  );
}
