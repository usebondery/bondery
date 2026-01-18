import { Skeleton, Stack } from "@mantine/core";

export default function AppLoading() {
  return (
    <Stack gap="md" p="md">
      <Skeleton height={40} radius="md" />
      <Skeleton height={300} radius="md" />
      <Skeleton height={200} radius="md" />
    </Stack>
  );
}
