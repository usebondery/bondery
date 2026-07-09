import { Center, Loader } from "@mantine/core";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";

export function StatsPageSkeleton() {
  return (
    <PageWrapper>
      <Center py="xl">
        <Loader />
      </Center>
    </PageWrapper>
  );
}
