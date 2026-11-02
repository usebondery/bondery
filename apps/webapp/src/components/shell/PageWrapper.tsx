import { Box } from "@mantine/core";

interface PageWrapperProps {
  children: React.ReactNode;
  /** Fill the shell viewport. Use on a page whose body is a locked canvas. */
  fill?: boolean;
}

export function PageWrapper({ children, fill = false }: PageWrapperProps) {
  return (
    <Box
      h={fill ? "100%" : undefined}
      mih={fill ? 0 : undefined}
      p="xl"
      style={
        fill ? { boxSizing: "border-box", display: "flex", flexDirection: "column" } : undefined
      }
    >
      {children}
    </Box>
  );
}
