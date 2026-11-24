import { Box } from "@mantine/core";

interface PageWrapperProps {
  children: React.ReactNode;
  /** Fill the shell viewport. Use on a page whose body is a locked canvas. */
  fill?: boolean;
}

/**
 * Page body inside `AppShellMainScrollArea`.
 *
 * The scroller owns the base `md` inset, which matches the phone header gutter.
 * This wrapper adds the wider desktop gutter from `sm` up only. A phone keeps
 * one 16px inset, and a desktop keeps its 48px column.
 */
export function PageWrapper({ children, fill = false }: PageWrapperProps) {
  return (
    <Box
      h={fill ? "100%" : undefined}
      mih={fill ? 0 : undefined}
      px={{ base: 0, sm: "xl" }}
      py="xl"
      style={
        fill ? { boxSizing: "border-box", display: "flex", flexDirection: "column" } : undefined
      }
    >
      {children}
    </Box>
  );
}
