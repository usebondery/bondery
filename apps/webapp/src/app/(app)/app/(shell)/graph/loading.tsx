import { Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";
import { PageWrapper } from "@/components/shell/PageWrapper";

export function GraphPageSkeleton() {
  return (
    <PageWrapper fill>
      <Stack gap="xl" mih={0} style={{ flex: 1 }}>
        <PageHeaderSkeleton />
        <Skeleton flex={1} mih={240} radius="md" />
      </Stack>
    </PageWrapper>
  );
}

export default function GraphLoading() {
  return <GraphPageSkeleton />;
}
