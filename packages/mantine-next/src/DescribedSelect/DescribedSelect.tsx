"use client";

import { Box, Group, Select, type SelectProps, Stack, Text } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

export interface DescribedSelectOption {
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  value: string;
}

export interface DescribedSelectProps
  extends Omit<SelectProps, "data" | "onChange" | "value" | "renderOption" | "leftSection"> {
  data: DescribedSelectOption[];
  onChange: (value: string) => void;
  style?: CSSProperties;
  value: string;
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
      allowDeselect={allowDeselect}
      data={data.map((option) => ({
        disabled: option.disabled,
        label: option.label,
        value: option.value,
      }))}
      disabled={disabled}
      leftSection={
        selectedOption?.icon ? (
          <Box component="span" style={{ alignItems: "center", display: "flex" }}>
            {selectedOption.icon}
          </Box>
        ) : undefined
      }
      renderOption={({ option }) => {
        const match = data.find((entry) => entry.value === option.value);
        return (
          <Group align="flex-start" gap="sm" wrap="nowrap">
            {match?.icon ? (
              <Box component="span" mt={2} style={{ display: "flex", flexShrink: 0 }}>
                {match.icon}
              </Box>
            ) : null}
            <Stack gap={0}>
              <Text fw={600} size="sm">
                {option.label}
              </Text>
              {match?.description ? (
                <Text lineClamp={2} size="xs">
                  {match.description}
                </Text>
              ) : null}
            </Stack>
          </Group>
        );
      }}
      size={size}
      style={style}
      value={value}
    />
  );
}
