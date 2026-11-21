"use client";

import { Group, Select } from "@mantine/core";
import { cn } from "cn";
import {
  filterTelephonePrefixOptions,
  findTelephonePrefixSelectOption,
  TELEPHONE_PREFIX_SELECT_DATA,
} from "@/lib/phone/telephonePrefixSelect";
import { nonEmpty } from "@/lib/shared/nonEmpty";

function flagIconClass(code: string): string {
  return `fi-${code}`;
}

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
      leftSection={<span className={cn("fi", flagIconClass(nonEmpty(selected?.flag) ?? "us"))} />}
      onChange={(val) => onChange(val || "+1")}
      renderOption={({ option }) => {
        const prefixOption = findTelephonePrefixSelectOption(option.value);
        return (
          <Group gap="xs">
            <span className={cn("fi", flagIconClass(nonEmpty(prefixOption?.flag) ?? "us"))} />
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
