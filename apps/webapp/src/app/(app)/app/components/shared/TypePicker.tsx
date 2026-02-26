"use client";

import { Group, Select, Text } from "@mantine/core";
import type { CSSProperties } from "react";

export interface TypePickerOption {
  value: string;
  label: string;
  emoji: string;
  disabled?: boolean;
}

interface TypePickerProps {
  value: string;
  data: TypePickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  style?: CSSProperties;
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
      value={value}
      onChange={(nextValue) => onChange(nextValue || value)}
      data={data.map((option) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled,
      }))}
      leftSection={<span>{selectedOption?.emoji || ""}</span>}
      renderOption={({ option }) => {
        const match = data.find((entry) => entry.value === option.value);
        return (
          <Group gap="xs" wrap="nowrap">
            <span>{match?.emoji || ""}</span>
            <Text size="sm">{option.label}</Text>
          </Group>
        );
      }}
      disabled={disabled}
      size={size}
      style={style}
      aria-label={ariaLabel}
    />
  );
}
