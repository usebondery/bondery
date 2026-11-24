import {
  Badge,
  type BadgeProps,
  Box,
  Button,
  type ButtonProps,
  type MantineColor,
} from "@mantine/core";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

export type CornerLabeledButtonProps = ButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonProps | "color"> & {
    /** Badge color. Defaults to the theme primary (`branding-primary`). */
    cornerLabelColor?: MantineColor;
    /** Props forwarded to the corner badge, except positioning, color, and variant. */
    cornerLabelProps?: Omit<BadgeProps, "children" | "color" | "pos" | "right" | "top" | "variant">;
    /** `data-testid` for the corner badge. */
    cornerLabelTestId?: string;
    /** Renders a filled badge anchored to the button's top-right corner. */
    cornerLabel?: ReactNode;
  };

/**
 * Mantine `Button` with an optional badge pinned to the top-right corner.
 * Useful for "Last used" and similar contextual labels on full-width action buttons.
 */
export function CornerLabeledButton({
  cornerLabel,
  cornerLabelColor = "branding-primary",
  cornerLabelProps,
  cornerLabelTestId,
  fullWidth,
  w,
  ...buttonProps
}: CornerLabeledButtonProps): ReactElement {
  return (
    <Box display={fullWidth ? "block" : "inline-block"} pos="relative" w={fullWidth ? "100%" : w}>
      <Button fullWidth={fullWidth} w={w} {...buttonProps} />
      {cornerLabel ? (
        <Badge
          {...cornerLabelProps}
          color={cornerLabelColor}
          data-testid={cornerLabelTestId}
          pos="absolute"
          right={12}
          size="xs"
          style={{ pointerEvents: "none", zIndex: 1 }}
          top={-8}
          variant="filled"
        >
          {cornerLabel}
        </Badge>
      ) : null}
    </Box>
  );
}
