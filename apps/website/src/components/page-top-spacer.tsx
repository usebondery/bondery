import { Box } from "@mantine/core";

/**
 * Space between the sticky site header and the first page content.
 *
 * Use this at the top of every page so the gap stays the same. The header keeps
 * its flow height, then `top-6` moves the sticky pill 24px lower. Content that
 * follows the header in flow starts behind that pill. This spacer clears the
 * shift, then adds one page gap.
 *
 * Sizes come from `--page-top-spacer` in `globals.css`.
 */
const SPACER_HEIGHT = {
  /** Standard pages. */
  default: "var(--page-top-spacer)",
  /** Pages that open with a centered title. The title stands alone, so it needs more air. */
  large: "var(--page-top-spacer-large)",
} as const;

type PageTopSpacerSize = keyof typeof SPACER_HEIGHT;

interface PageTopSpacerProps {
  /** `large` is for pages that open with a centered title, such as the blog. */
  size?: PageTopSpacerSize;
}

export function PageTopSpacer({ size = "default" }: PageTopSpacerProps) {
  return <Box aria-hidden h={SPACER_HEIGHT[size]} />;
}
