import type { MouseEventHandler } from "react";
import { ActionIcon, type ActionIconProps } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";

export interface DotsMenuButtonProps extends Omit<ActionIconProps, "children"> {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  /** Size passed to the icon. Defaults to 16. */
  iconSize?: number;
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
export function DotsMenuButton({
  iconSize = 16,
  opened = false,
  ...props
}: DotsMenuButtonProps) {
  return (
    <ActionIcon
      variant="default"
      size="md"
      className={opened ? "button-scale-effect-active" : undefined}
      {...props}
    >
      <IconDotsVertical size={iconSize} />
    </ActionIcon>
  );
}
