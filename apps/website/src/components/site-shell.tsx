import { Box, Flex } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";
import { PageTopSpacer } from "@/components/page-top-spacer";

/**
 * Outer width for every page type and for the header and footer pills.
 * One number keeps the three edges aligned.
 */
export const SITE_MAX_WIDTH = 1440;

/**
 * Horizontal inset from the viewport edge. The header and footer pills shrink by
 * this much, so `SiteShell` must shrink by the same amount or it overflows them
 * on viewports narrower than the max width.
 */
export const SITE_INSET = {
  base: "calc(100% - var(--mantine-spacing-xs) * 2)",
  md: "calc(100% - var(--mantine-spacing-xl) * 2)",
} as const;

/** Width, centring, and inset for the header pill, the footer pill, and `SiteShell`. */
export const siteFrameProps = {
  maw: SITE_MAX_WIDTH,
  mx: "auto",
  w: SITE_INSET,
} as const;

interface SiteShellProps {
  children: ReactNode;
  /**
   * Optional left column, for navigation. It shows beside the center from `lg`.
   * Keep a mobile control inside `children` when this column carries navigation.
   */
  left?: ReactNode;
  /** Left track width. Fixed, never shrinks. */
  leftWidth?: string;
  /**
   * Optional right column, for a page table of contents. It shows beside the center from `md`.
   * An empty slot leaves no track and no gap.
   */
  right?: ReactNode;
  /** Right track width. Fixed, never shrinks. */
  rightWidth?: string;
}

function track(width: string): CSSProperties {
  return { flex: "0 0 auto", width };
}

/**
 * Page width, top gap, and up to three columns.
 *
 * The box matches the header and footer pills, so all three share one width and
 * one inset. `children` go in the center column. With no side slots, the center
 * takes the full width. A hidden or empty slot leaves no track and no gap.
 * The shell adds the page gap below the header. A side slot holds its own sticky box.
 * Rows stretch, so a sticky rail has room to move.
 */
export function SiteShell({
  children,
  left,
  leftWidth = "17rem",
  right,
  rightWidth = "15rem",
}: SiteShellProps) {
  return (
    <Box data-site-shell="" {...siteFrameProps} px="xs">
      <PageTopSpacer />
      <Flex data-site-shell-body="" gap="xl" px="md">
        {left !== undefined ? (
          <Box data-site-shell-left="" style={track(leftWidth)} visibleFrom="lg">
            {left}
          </Box>
        ) : null}
        <Box data-site-shell-main="" flex="1 1 0" mih={0} miw={0}>
          {children}
        </Box>
        {right !== undefined ? (
          <Box data-site-shell-right="" style={track(rightWidth)} visibleFrom="md">
            {right}
          </Box>
        ) : null}
      </Flex>
    </Box>
  );
}
