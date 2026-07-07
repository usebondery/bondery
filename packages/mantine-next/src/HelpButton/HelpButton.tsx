"use client";

import { ActionIcon, Tooltip, type TooltipProps } from "@mantine/core";
import { docHref, type DocId } from "@bondery/helpers";
import { IconHelpCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  ActionIconLink,
  type ActionIconLinkProps,
} from "#nextjs/ActionIconLink/ActionIconLink.js";

export interface HelpButtonProps
  extends Omit<ActionIconLinkProps, "ariaLabel" | "icon" | "href" | "children"> {
  /** Tooltip text shown on hover. Used as the default aria-label unless `ariaLabel` is set. */
  label: string;
  /** Stable doc ID resolved via `docHref`. Preferred over `href` for in-app help links. */
  doc?: DocId;
  /** Docs or help page URL. Opens in a new tab when provided. Omit for tooltip-only (no link). */
  href?: string;
  /** Screen reader label when `label` is too long for an accessible name. */
  ariaLabel?: string;
  /** Max width of the tooltip popover. Defaults to 320. */
  tooltipMaxWidth?: TooltipProps["maw"];
  /** Whether the tooltip supports multiple lines. Defaults to true. */
  tooltipMultiline?: boolean;
  /** Whether the tooltip shows an arrow. Defaults to true. */
  withArrow?: boolean;
  /** Size of the help icon. Defaults to 14. */
  iconSize?: number;
  /** Custom icon. Defaults to `IconHelpCircle`. */
  icon?: ReactNode;
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
      href={resolvedHref}
      target={target}
      rel={rel}
      ariaLabel={resolvedAriaLabel}
      variant={variant}
      color={color}
      radius={radius}
      size={size}
      icon={resolvedIcon}
      {...actionIconProps}
    />
  ) : (
    <ActionIcon
      variant={variant}
      color={color}
      radius={radius}
      size={size}
      aria-label={resolvedAriaLabel}
      {...actionIconProps}
    >
      {resolvedIcon}
    </ActionIcon>
  );

  return (
    <Tooltip
      label={label}
      multiline={tooltipMultiline}
      maw={tooltipMaxWidth}
      withArrow={withArrow}
    >
      {button}
    </Tooltip>
  );
}
