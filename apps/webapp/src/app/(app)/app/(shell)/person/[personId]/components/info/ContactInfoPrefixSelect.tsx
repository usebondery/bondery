"use client";

import { Group, Select } from "@mantine/core";
import {
  filterTelephonePrefixOptions,
  findTelephonePrefixSelectOption,
  TELEPHONE_PREFIX_SELECT_DATA,
} from "@/lib/phone/telephonePrefixSelect";

interface ContactInfoPrefixSelectProps {
  ariaLabel?: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  value: string;
}

export function ContactInfoPrefixSelect({
  value,
  onChange,
  style,
  ariaLabel,
}: ContactInfoPrefixSelectProps) {
  const selected = findTelephonePrefixSelectOption(value);

  return (
    <Select
      aria-label={ariaLabel}
      data={TELEPHONE_PREFIX_SELECT_DATA}
      filter={filterTelephonePrefixOptions}
      leftSection={<span className={`fi fi-${selected?.flag || "us"}`} />}
      onChange={(val) => onChange(val || "+1")}
      renderOption={({ option }) => {
        const prefixOption = findTelephonePrefixSelectOption(option.value);
        return (
          <Group gap="xs">
            <span className={`fi fi-${prefixOption?.flag || "us"}`} />
            <span>{option.label}</span>
          </Group>
        );
      }}
      searchable
      size="sm"
      style={style}
      value={value}
    />
  );
}
