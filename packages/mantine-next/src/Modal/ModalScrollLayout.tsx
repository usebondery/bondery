import { Box, Stack } from "@mantine/core";
import type { MantineSpacing } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

const DEFAULT_SCROLL_MAX_HEIGHT = "min(70dvh, calc(100dvh - 14rem))";

export interface ModalScrollLayoutProps {
  children: ReactNode;
  footer: ReactNode;
  maxHeight?: string | number;
  gap?: MantineSpacing;
}

export function ModalScrollLayout({
  children,
  footer,
  maxHeight = DEFAULT_SCROLL_MAX_HEIGHT,
  gap = "md",
}: ModalScrollLayoutProps) {
  const scrollMaxHeight =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  const scrollRegionStyle: CSSProperties = {
    minHeight: 0,
    maxHeight: scrollMaxHeight,
    overflowY: "auto",
  };

  return (
    <Stack gap={gap} style={{ minHeight: 0 }}>
      <Box style={scrollRegionStyle}>{children}</Box>

      <Box style={{ flexShrink: 0 }}>{footer}</Box>
    </Stack>
  );
}
