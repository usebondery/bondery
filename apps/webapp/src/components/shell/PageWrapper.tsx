import { Box } from "@mantine/core";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return <Box p="xl">{children}</Box>;
}
