"use client";

import { TELEPHONE_PREFIX_OPTIONS } from "@bondery/helpers/phone";
import { Group, Select } from "@mantine/core";

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
  const selected = TELEPHONE_PREFIX_OPTIONS.find((option) => option.value === value);

  return (
    <Select
      aria-label={ariaLabel}
      data={TELEPHONE_PREFIX_OPTIONS}
      leftSection={<span className={`fi fi-${selected?.flag || "us"}`} />}
      onChange={(val) => onChange(val || "+1")}
      renderOption={({ option }) => {
        const country = TELEPHONE_PREFIX_OPTIONS.find((item) => item.value === option.value);
        return (
          <Group gap="xs">
            <span className={`fi fi-${country?.flag || "us"}`} />
            <span>{option.value}</span>
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
