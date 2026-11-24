"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { cn } from "cn";
import type { MouseEventHandler, ReactElement, ReactNode, Ref } from "react";

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
}: ToolbarMenuButtonProps): ReactElement {
  const mergedClassName = cn(className, opened && "button-scale-effect-active") || undefined;

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
