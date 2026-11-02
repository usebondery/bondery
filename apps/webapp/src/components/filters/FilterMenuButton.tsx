"use client";

import { ToolbarMenuButton } from "@bondery/mantine-next";
import { IconFilter } from "@tabler/icons-react";
import type { MouseEventHandler, ReactNode, Ref } from "react";

interface FilterMenuButtonProps {
  children: ReactNode;
  /** Light primary while a filter value is set. */
  isActive?: boolean;
  /** Popover target click handler. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Scale the button while the menu is open. */
  opened?: boolean;
  /** Popover target ref. */
  ref?: Ref<HTMLButtonElement>;
}

/** Shared filter trigger. Idle is gray. An active filter uses the theme primary. */
export function FilterMenuButton({
  children,
  isActive = false,
  onClick,
  opened = false,
  ref,
}: FilterMenuButtonProps) {
  return (
    <ToolbarMenuButton
      isActive={isActive}
      leftSection={<IconFilter size={16} />}
      onClick={onClick}
      opened={opened}
      ref={ref}
      size="sm"
    >
      {children}
    </ToolbarMenuButton>
  );
}
