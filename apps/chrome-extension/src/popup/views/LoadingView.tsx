import React from "react";
import { Center, Loader } from "@mantine/core";

export function LoadingView() {
  return (
    <Center p="xl" h={300}>
      <Loader size="md" />
    </Center>
  );
}
