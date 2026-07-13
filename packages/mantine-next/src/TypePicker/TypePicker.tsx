"use client";

import { Group, Select, Text } from "@mantine/core";
import type { CSSProperties } from "react";

export interface TypePickerOption {
  disabled?: boolean;
  emoji: string;
  label: string;
  value: string;
}

interface TypePickerProps {
  ariaLabel?: string;
  data: TypePickerOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  style?: CSSProperties;
  value: string;
}

/**
 * Reusable type picker with emoji-aware selected value and dropdown options.
 */
export function TypePicker({
  value,
  data,
  onChange,
  disabled,
  ariaLabel,
  size = "sm",
  style,
}: TypePickerProps) {
  const selectedOption = data.find((option) => option.value === value);

  return (
    <Select
      aria-label={ariaLabel}
      data={data.map((option) => ({
        disabled: option.disabled,
        label: option.label,
        value: option.value,
      }))}
      disabled={disabled}
      leftSection={<span>{selectedOption?.emoji || ""}</span>}
      onChange={(nextValue) => onChange(nextValue || value)}
      renderOption={({ option }) => {
        const match = data.find((entry) => entry.value === option.value);
        return (
          <Group gap="xs" wrap="nowrap">
            <span>{match?.emoji || ""}</span>
            <Text size="sm">{option.label}</Text>
          </Group>
        );
      }}
      size={size}
      style={style}
      value={value}
    />
  );
}
