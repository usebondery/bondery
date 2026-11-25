import { Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { GroupCardSkeleton } from "../../../groups/components/groupsSkeletons";
import { PeopleTableSkeleton } from "../../../people/components/chrome/peopleSkeletons";

/**
 * Full-page skeleton for the group detail page.
 * Mirrors: PageHeader + GroupCard + contacts table.
 */
export function GroupDetailPageSkeleton() {
  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeaderSkeleton primaryActionWidth={160} />
        <GroupCardSkeleton />
        <PeopleTableSkeleton />
      </Stack>
    </PageWrapper>
  );
}
