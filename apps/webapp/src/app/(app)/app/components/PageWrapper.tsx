import { Box, Group, Stack, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return <Box p="xl">{children}</Box>;
}
