"use client";

import { Menu, type MenuProps } from "@mantine/core";

/**
 * Menu dropdown with the same hover tint as a `Select` option.
 *
 * `DropdownOption` paints the selected row. This wrapper sets the hover and
 * keyboard color so a menu matches `DescribedSelect`.
 */
export function DropdownOptionMenu({ children, ...props }: MenuProps) {
  return (
    <Menu
      shadow="md"
      styles={{
        dropdown: {
          "--menu-item-hover": "var(--mantine-primary-color-light)",
        },
      }}
      {...props}
    >
      {children}
    </Menu>
  );
}
