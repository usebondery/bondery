"use client";

import { Box, Group, Select, type SelectProps, Stack, Text, Tooltip } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

export interface DescribedSelectOption {
  /** Extra text beside the label, such as a version number. */
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  label: string;
  leftSection?: ReactNode;
  value: string;
}

export interface DescribedSelectProps
  extends Omit<SelectProps, "data" | "onChange" | "value" | "renderOption"> {
  data: DescribedSelectOption[];
  onChange: (value: string | null) => void;
  style?: CSSProperties;
  value: string | null;
}

/**
 * Select whose options can show a left section, a badge, a description, and a disabled tooltip.
 * The closed field uses the control `leftSection` when set, otherwise the selected option.
 */
export function DescribedSelect({
  value,
  data,
  onChange,
  disabled,
  size = "sm",
  style,
  allowDeselect = false,
  leftSection,
  ...selectProps
}: DescribedSelectProps) {
  const selectedOption = data.find((option) => option.value === value);

  const closedLeftSection =
    leftSection ??
    (selectedOption?.leftSection ? (
      <Box component="span" style={{ alignItems: "center", display: "flex" }}>
        {selectedOption.leftSection}
      </Box>
    ) : undefined);

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
      leftSection={closedLeftSection}
      onChange={onChange}
      renderOption={({ option }) => {
        const match = data.find((entry) => entry.value === option.value);
        const row = (
          <Group align="flex-start" gap="sm" wrap="nowrap">
            {match?.leftSection ? (
              <Box component="span" mt={2} style={{ display: "flex", flexShrink: 0 }}>
                {match.leftSection}
              </Box>
            ) : null}
            <Stack gap={0}>
              <Group gap={6} wrap="nowrap">
                <Text fw={match?.description ? 500 : undefined} size="sm">
                  {option.label}
                </Text>
                {match?.badge ? (
                  <Text component="span" data-option-muted="true" size="xs">
                    {match.badge}
                  </Text>
                ) : null}
              </Group>
              {match?.description ? (
                <Text data-option-muted="true" lineClamp={2} size="xs">
                  {match.description}
                </Text>
              ) : null}
            </Stack>
          </Group>
        );

        if (!match?.disabledTooltip) {
          return row;
        }

        return <Tooltip label={match.disabledTooltip}>{row}</Tooltip>;
      }}
      size={size}
      style={style}
      value={value}
    />
  );
}
