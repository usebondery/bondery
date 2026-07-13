import { ActionIcon, type ActionIconProps } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";
import type { MouseEventHandler } from "react";

export interface DotsMenuButtonProps extends Omit<ActionIconProps, "children"> {
  "aria-label"?: string;
  /** Size passed to the icon. Defaults to 16. */
  iconSize?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Whether the associated menu is currently open. Controls the squeeze animation. */
  opened?: boolean;
}

/**
 * A reusable trigger button for dropdown menus, rendering a vertical dots (⋮) icon
 * inside an ActionIcon with variant="default". Applies the squeeze scale effect when
 * the menu is open, and a hover scale effect at all times.
 *
 * Wrap with `<Menu.Target>` to use as a menu trigger.
 */
export function DotsMenuButton({ iconSize = 16, opened = false, ...props }: DotsMenuButtonProps) {
  return (
    <ActionIcon
      className={opened ? "button-scale-effect-active" : undefined}
      size="md"
      variant="default"
      {...props}
    >
      <IconDotsVertical size={iconSize} />
    </ActionIcon>
  );
}
