"use client";

import { Button, type ButtonProps } from "@mantine/core";
import type { MouseEventHandler, ReactNode, Ref } from "react";

export interface ToolbarMenuButtonProps extends Omit<ButtonProps, "color" | "variant"> {
  children: ReactNode;
  /** Light primary when a filter, sort, or column choice is not the idle default. */
  isActive?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Adds the open-menu scale class while the menu or popover is open. */
  opened?: boolean;
  /** Menu and popover targets attach their ref here. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Shared trigger for toolbar menus and filter popovers.
 * Both states use variant `light`. Idle is gray. A non-default choice uses the theme primary.
 */
export function ToolbarMenuButton({
  children,
  className,
  isActive = false,
  opened = false,
  ref,
  ...props
}: ToolbarMenuButtonProps) {
  const openedClassName = opened ? "button-scale-effect-active" : undefined;
  const mergedClassName = [className, openedClassName].filter(Boolean).join(" ") || undefined;

  return (
    <Button
      {...props}
      className={mergedClassName}
      color={isActive ? undefined : "gray"}
      ref={ref}
      variant="light"
    >
      {children}
    </Button>
  );
}
