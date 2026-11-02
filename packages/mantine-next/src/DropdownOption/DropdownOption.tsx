"use client";

import { Box, Group, Menu, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * One option inside a dropdown menu.
 *
 * Hover, keyboard focus, and the selected row use the same light primary
 * background as `DescribedSelect`. Text stays the default color. A description
 * stays dimmed. The label is medium weight only when a description is present.
 *
 * Two layouts:
 * - `inline` puts the description on the same line, after the label.
 * - `stacked` puts the description on a second line, under the label.
 */

export type DropdownOptionLayout = "inline" | "stacked";

export interface DropdownOptionProps {
  /** Extra text beside the label, such as a version number. */
  badge?: string;
  /** Secondary text. Placed per `layout`. */
  description?: string;
  disabled?: boolean;
  /** Mark shown before the text. A plain string is treated as an emoji. */
  icon?: ReactNode;
  label: string;
  layout?: DropdownOptionLayout;
  onSelect: () => void;
  selected?: boolean;
  /** Text and icon tone. `danger` is for a destructive choice. */
  tone?: "default" | "danger";
}

/** Same light primary fill as a hovered or selected `Select` option. */
function selectedOptionStyle(isSelected: boolean): CSSProperties | undefined {
  if (!isSelected) {
    return undefined;
  }

  return {
    backgroundColor: "var(--mantine-primary-color-light)",
  };
}

function renderIcon(icon: ReactNode): ReactNode {
  if (typeof icon === "string") {
    return (
      <Text aria-hidden="true" size="sm">
        {icon}
      </Text>
    );
  }

  return icon;
}

function SecondaryText({ children }: { children: ReactNode }) {
  return (
    <Text c="dimmed" component="span" size="xs">
      {children}
    </Text>
  );
}

export function DropdownOption({
  badge,
  description,
  disabled = false,
  icon,
  label,
  layout = "inline",
  onSelect,
  selected = false,
  tone = "default",
}: DropdownOptionProps) {
  const isStacked = layout === "stacked";
  const toneColor = tone === "danger" ? "red" : undefined;

  return (
    <Menu.Item
      disabled={disabled}
      onClick={onSelect}
      style={selectedOptionStyle(selected)}
      value={label}
    >
      <Group gap="xs" justify="space-between" w="100%" wrap="nowrap">
        <Group align={isStacked ? "flex-start" : "center"} gap="xs" wrap="nowrap">
          {icon ? (
            <Box c={toneColor ?? "dimmed"} style={{ display: "flex", flexShrink: 0 }}>
              {renderIcon(icon)}
            </Box>
          ) : null}
          <Box style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Text c={toneColor} fw={description ? 500 : undefined} size="sm">
                {label}
              </Text>
              {badge ? <SecondaryText>{badge}</SecondaryText> : null}
              {!isStacked && description ? <SecondaryText>{description}</SecondaryText> : null}
            </Group>
            {isStacked && description ? <SecondaryText>{description}</SecondaryText> : null}
          </Box>
        </Group>
        {selected ? (
          <Text component="span" style={{ display: "flex", flexShrink: 0 }}>
            <IconCheck size={14} />
          </Text>
        ) : null}
      </Group>
    </Menu.Item>
  );
}
