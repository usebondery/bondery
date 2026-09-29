"use client";

import { ActionIcon, type ActionIconProps } from "@mantine/core";
import type { ReactNode } from "react";
import {
  ACTION_ICON_GRAPHIC_SCALE,
  type ActionIconGraphic,
  renderActionIconGraphic,
} from "#ActionIconButton/actionIconGraphic.js";
import Link from "#nextjs/NextLink.js";

export type ActionIconLinkProps = Omit<ActionIconProps, "component" | "href" | "children"> & {
  href?: string;
  ariaLabel: string;
  /**
   * Icon graphic (Tabler icon, SVG, or `next/image` with `fill`).
   * Do not pass `size`, `stroke`, or fixed `width`/`height` — use ActionIcon `size` instead.
   */
  icon: ActionIconGraphic | ReactNode;
  /** @default {@link ACTION_ICON_GRAPHIC_SCALE} */
  iconScale?: number;
  onClick?: () => void;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
};

/**
 * Renders a Mantine ActionIcon that behaves as a Next.js Link.
 *
 * @param props ActionIcon props with required href, aria label, and children.
 * @returns A link-compatible Mantine ActionIcon component.
 */
export function ActionIconLink({
  href,
  ariaLabel,
  icon,
  iconScale = ACTION_ICON_GRAPHIC_SCALE,
  onClick,
  target,
  rel,
  ...actionIconProps
}: ActionIconLinkProps) {
  const renderedIcon = renderActionIconGraphic(icon, iconScale);

  if (!href) {
    return (
      <ActionIcon aria-label={ariaLabel} onClick={onClick} {...actionIconProps}>
        {renderedIcon}
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      aria-label={ariaLabel}
      onClick={onClick}
      renderRoot={(props) => <Link href={href} rel={rel} target={target} {...props} />}
      {...actionIconProps}
    >
      {renderedIcon}
    </ActionIcon>
  );
}
