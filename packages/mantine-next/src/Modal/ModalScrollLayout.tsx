import type { MantineSpacing } from "@mantine/core";
import { Box, ScrollArea, Stack } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";

const DEFAULT_SCROLL_MAX_HEIGHT = "min(70dvh, calc(100dvh - 14rem))";

export interface ModalScrollLayoutProps {
  children: ReactNode;
  /**
   * Size the body to its content, up to `maxHeight`, instead of holding a fixed tall box.
   *
   * Leave it off for a body that changes height a lot, such as a table or a paged list: a fixed
   * height stops the footer from jumping. Turn it on for a short body, such as a summary, so the
   * modal does not show empty space below the content.
   */
  fitContent?: boolean;
  footer: ReactNode;
  gap?: MantineSpacing;
  header?: ReactNode;
  maxHeight?: string | number;
}

export function ModalScrollLayout({
  children,
  footer,
  header,
  maxHeight = DEFAULT_SCROLL_MAX_HEIGHT,
  gap = "md",
  fitContent = false,
}: ModalScrollLayoutProps): ReactElement {
  const scrollMaxHeight = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  if (header) {
    if (fitContent) {
      return (
        <Stack gap={gap} style={{ minHeight: 0 }}>
          <Box style={{ flexShrink: 0, minWidth: 0 }}>{header}</Box>
          <ScrollArea.Autosize mah={scrollMaxHeight} style={{ minHeight: 0 }} type="auto">
            {children}
          </ScrollArea.Autosize>
          <Box style={{ flexShrink: 0, minWidth: 0 }}>{footer}</Box>
        </Stack>
      );
    }

    return (
      <Stack gap={gap} h={scrollMaxHeight} style={{ minHeight: 0, overflow: "hidden" }}>
        <Box style={{ flexShrink: 0, minWidth: 0 }}>{header}</Box>

        <Box style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
          <ScrollArea h="100%" type="auto">
            {children}
          </ScrollArea>
        </Box>

        <Box style={{ flexShrink: 0, minWidth: 0 }}>{footer}</Box>
      </Stack>
    );
  }

  return (
    <Stack gap={gap} style={{ minHeight: 0 }}>
      <ScrollArea.Autosize mah={scrollMaxHeight} style={{ minHeight: 0 }} type="auto">
        {children}
      </ScrollArea.Autosize>

      <Box style={{ flexShrink: 0 }}>{footer}</Box>
    </Stack>
  );
}
