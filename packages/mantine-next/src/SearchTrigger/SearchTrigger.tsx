"use client";

import { Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Kbd, type ShortcutKeyToken } from "#Kbd/index.js";

const ROW_PADDING = {
  paddingBottom: "var(--mantine-spacing-xs)",
  paddingLeft: "var(--sidebar-icon-pl, var(--mantine-spacing-sm))",
  paddingRight: "var(--sidebar-icon-pl, var(--mantine-spacing-sm))",
  paddingTop: "var(--mantine-spacing-xs)",
} as const;

export interface SearchTriggerProps {
  /** Icon-only row. The label and shortcut move into a tooltip. */
  collapsed?: boolean;
  /** Row height in pixels. Match the control it sits beside. @default 40 */
  height?: number;
  label: string;
  onClick: () => void;
  /** Platform shortcut shown at the end of the row. */
  shortcut?: readonly ShortcutKeyToken[];
}

/**
 * Bordered search control. A click opens search. Typing happens in the search UI, not in this row.
 */
export function SearchTrigger({
  collapsed = false,
  height = 40,
  label,
  onClick,
  shortcut,
}: SearchTriggerProps) {
  const { hovered, ref } = useHover<HTMLButtonElement>();
  const shortcutKeys = shortcut && shortcut.length > 0 ? <Kbd keys={shortcut} size="xs" /> : null;

  const button = (
    <UnstyledButton
      aria-label={label}
      className="button-scale-effect"
      h={height}
      onClick={onClick}
      ref={ref}
      style={{
        alignItems: "center",
        backgroundColor: hovered ? "var(--mantine-primary-color-light-hover)" : "transparent",
        borderRadius: "var(--mantine-radius-default)",
        color: "inherit",
        display: "flex",
        fontSize: "var(--mantine-font-size-sm)",
        gap: "var(--mantine-spacing-sm)",
        justifyContent: "flex-start",
        outline: "1px solid var(--mantine-color-default-border)",
        width: "100%",
        ...ROW_PADDING,
      }}
      type="button"
    >
      <IconSearch size={16} stroke={1.7} />
      {collapsed ? null : (
        <>
          <Text c="dimmed" size="sm" style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
            {label}
          </Text>
          {shortcutKeys}
        </>
      )}
    </UnstyledButton>
  );

  if (!collapsed) {
    return button;
  }

  const tooltipLabel: ReactNode = shortcutKeys ? (
    <Group gap="xs" wrap="nowrap">
      <span>{label}</span>
      {shortcutKeys}
    </Group>
  ) : (
    label
  );

  return (
    <Tooltip label={tooltipLabel} position="right">
      {button}
    </Tooltip>
  );
}
