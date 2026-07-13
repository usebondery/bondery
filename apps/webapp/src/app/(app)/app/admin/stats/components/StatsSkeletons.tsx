import { Center, Loader } from "@mantine/core";
import { PageWrapper } from "@/components/shell/PageWrapper";

export function StatsPageSkeleton() {
  return (
    <PageWrapper>
      <Center py="xl">
        <Loader />
      </Center>
    </PageWrapper>
  );
}
