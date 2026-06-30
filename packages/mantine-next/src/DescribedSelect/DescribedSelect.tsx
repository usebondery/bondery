"use client";

import { Box, Group, Select, Stack, Text, type SelectProps } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

export interface DescribedSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface DescribedSelectProps
  extends Omit<SelectProps, "data" | "onChange" | "value" | "renderOption" | "leftSection"> {
  value: string;
  data: DescribedSelectOption[];
  onChange: (value: string) => void;
  style?: CSSProperties;
}

/**
 * Select with icon, label, and short description shown in the dropdown.
 */
export function DescribedSelect({
  value,
  data,
  onChange,
  disabled,
  size = "sm",
  style,
  allowDeselect = false,
  ...selectProps
}: DescribedSelectProps) {
  const selectedOption = data.find((option) => option.value === value);

  return (
    <Select
      {...selectProps}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? value)}
      data={data.map((option) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled,
      }))}
      leftSection={
        selectedOption?.icon ? (
          <Box component="span" style={{ display: "flex", alignItems: "center" }}>
            {selectedOption.icon}
          </Box>
        ) : undefined
      }
      renderOption={({ option }) => {
        const match = data.find((entry) => entry.value === option.value);
        return (
          <Group gap="sm" wrap="nowrap" align="flex-start">
            {match?.icon ? (
              <Box component="span" mt={2} style={{ display: "flex", flexShrink: 0 }}>
                {match.icon}
              </Box>
            ) : null}
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                {option.label}
              </Text>
              {match?.description ? (
                <Text size="xs" lineClamp={2}>
                  {match.description}
                </Text>
              ) : null}
            </Stack>
          </Group>
        );
      }}
      disabled={disabled}
      size={size}
      style={style}
      allowDeselect={allowDeselect}
    />
  );
}
