"use client";

import { ActionIcon, type ActionIconProps } from "@mantine/core";
import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from "react";
import {
  ACTION_ICON_GRAPHIC_SCALE,
  type ActionIconGraphic,
  renderActionIconGraphic,
} from "#ActionIconButton/actionIconGraphic.js";

export interface ActionIconButtonProps extends Omit<ActionIconProps, "children"> {
  /**
   * Icon graphic (Tabler icon, SVG, or `next/image` with `fill`).
   * Do not pass `size`, `stroke`, or fixed `width`/`height` — use ActionIcon `size` instead.
   */
  icon: ActionIconGraphic | ReactNode;
  /** Fraction of the ActionIcon box used by the graphic. @default {@link ACTION_ICON_GRAPHIC_SCALE} */
  iconScale?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: ComponentPropsWithoutRef<"button">["type"];
}

/**
 * Mantine ActionIcon with a required `icon` prop and consistent inset scaling.
 */
export function ActionIconButton({
  icon,
  iconScale = ACTION_ICON_GRAPHIC_SCALE,
  ...actionIconProps
}: ActionIconButtonProps) {
  return <ActionIcon {...actionIconProps}>{renderActionIconGraphic(icon, iconScale)}</ActionIcon>;
}
