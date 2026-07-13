"use client";

import { type DocId, docHref } from "@bondery/helpers";
import { ActionIcon, Tooltip, type TooltipProps } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ActionIconLink, type ActionIconLinkProps } from "#nextjs/ActionIconLink/ActionIconLink.js";

export interface HelpButtonProps
  extends Omit<ActionIconLinkProps, "ariaLabel" | "icon" | "href" | "children"> {
  /** Screen reader label when `label` is too long for an accessible name. */
  ariaLabel?: string;
  /** Stable doc ID resolved via `docHref`. Preferred over `href` for in-app help links. */
  doc?: DocId;
  /** Docs or help page URL. Opens in a new tab when provided. Omit for tooltip-only (no link). */
  href?: string;
  /** Custom icon. Defaults to `IconHelpCircle`. */
  icon?: ReactNode;
  /** Size of the help icon. Defaults to 14. */
  iconSize?: number;
  /** Tooltip text shown on hover. Used as the default aria-label unless `ariaLabel` is set. */
  label: string;
  /** Max width of the tooltip popover. Defaults to 320. */
  tooltipMaxWidth?: TooltipProps["maw"];
  /** Whether the tooltip supports multiple lines. Defaults to true. */
  tooltipMultiline?: boolean;
  /** Whether the tooltip shows an arrow. Defaults to true. */
  withArrow?: boolean;
}

/**
 * Standard help affordance: question-circle icon with tooltip, optionally linking to docs.
 *
 * Hover shows context; click opens `href` in a new tab when provided.
 * Without `href`, renders a tooltip-only info icon (no navigation).
 */
export function HelpButton({
  label,
  doc,
  href,
  ariaLabel,
  tooltipMaxWidth = 320,
  tooltipMultiline = true,
  withArrow = true,
  iconSize = 14,
  icon,
  target = "_blank",
  rel = "noopener noreferrer",
  variant = "light",
  color = "gray",
  radius = "xl",
  size = "sm",
  ...actionIconProps
}: HelpButtonProps) {
  const resolvedAriaLabel = ariaLabel ?? label;
  const resolvedIcon = icon ?? <IconHelpCircle size={iconSize} />;
  const resolvedHref = doc ? docHref(doc) : href;

  const button = resolvedHref ? (
    <ActionIconLink
      ariaLabel={resolvedAriaLabel}
      color={color}
      href={resolvedHref}
      icon={resolvedIcon}
      radius={radius}
      rel={rel}
      size={size}
      target={target}
      variant={variant}
      {...actionIconProps}
    />
  ) : (
    <ActionIcon
      aria-label={resolvedAriaLabel}
      color={color}
      radius={radius}
      size={size}
      variant={variant}
      {...actionIconProps}
    >
      {resolvedIcon}
    </ActionIcon>
  );

  return (
    <Tooltip label={label} maw={tooltipMaxWidth} multiline={tooltipMultiline} withArrow={withArrow}>
      {button}
    </Tooltip>
  );
}
