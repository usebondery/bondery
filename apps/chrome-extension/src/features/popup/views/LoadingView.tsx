import { Center, Loader } from "@mantine/core";

export function LoadingView() {
  return (
    <Center h={300} p="xl">
      <Loader size="md" />
    </Center>
  );
}
