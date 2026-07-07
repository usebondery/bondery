"use client";

import { Group, Input, Select } from "@mantine/core";
import { IMaskInput } from "react-imask";
import { memo, useMemo, type ClipboardEvent } from "react";
import {
  extractUsername,
  formatWhatsAppNumber,
} from "@bondery/helpers";
import {
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
  TELEPHONE_PREFIX_OPTIONS,
} from "@bondery/helpers/phone";
import type { SocialFieldKey } from "./useSocialFieldEditor";

const PrefixSelect = memo(function PrefixSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selectedOption = useMemo(
    () => TELEPHONE_PREFIX_OPTIONS.find((option) => option.value === value),
    [value],
  );

  return (
    <Select
      value={value}
      onChange={(val) => onChange(val || "+1")}
      data={TELEPHONE_PREFIX_OPTIONS}
      disabled={disabled}
      renderOption={({ option }) => (
        <Group gap="xs">
          <span
            className={`fi fi-${
              TELEPHONE_PREFIX_OPTIONS.find((item) => item.value === option.value)?.flag || "us"
            }`}
          />
          <span>{option.value}</span>
        </Group>
      )}
      leftSection={<span className={`fi fi-${selectedOption?.flag || "us"}`} />}
      searchable
      style={{ width: 100 }}
      size="sm"
    />
  );
});

interface SocialPhoneInputProps {
  field: Extract<SocialFieldKey, "whatsapp" | "signal">;
  label: string;
  placeholder: string;
  value: string;
  prefix: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onPrefixChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onPaste?: (raw: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
}

function applyPhonePaste(
  field: "whatsapp" | "signal",
  raw: string,
  onPrefixChange: (value: string) => void,
  onValueChange: (value: string) => void,
) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return;
  }

  if (field === "whatsapp") {
    const fromUrl = extractUsername("whatsapp", trimmed);
    if (fromUrl !== trimmed) {
      const digits = formatWhatsAppNumber(fromUrl);
      if (digits) {
        const parsed = parsePhoneNumber(`+${digits}`);
        if (parsed) {
          onPrefixChange(parsed.dialCode);
          onValueChange(parsed.number);
          return;
        }
      }
    }
  }

  const parsed = parsePhoneNumber(trimmed);
  if (parsed) {
    onPrefixChange(parsed.dialCode);
    onValueChange(parsed.number);
    return;
  }

  onValueChange(trimmed);
}

export function SocialPhoneInput({
  field,
  label,
  placeholder,
  value,
  prefix,
  disabled,
  autoFocus,
  onPrefixChange,
  onValueChange,
  onPaste,
  onCommit,
  onDiscard,
}: SocialPhoneInputProps) {
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const raw = event.clipboardData.getData("text");
    if (!raw) {
      return;
    }

    event.preventDefault();
    applyPhonePaste(field, raw, onPrefixChange, onValueChange);
    onPaste?.(raw);
  };

  return (
    <Group gap="xs" wrap="nowrap" align="center" style={{ width: 390 }}>
      <PrefixSelect value={prefix} onChange={onPrefixChange} disabled={disabled} />
      <Input
        component={IMaskInput}
        mask={getTelephoneReactMaskExpression(prefix)}
        unmask
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onAccept={(accepted: string) => {
          const parsed = parsePhoneNumber(accepted);
          if (parsed && accepted.includes("+")) {
            onPrefixChange(parsed.dialCode);
            onValueChange(parsed.number);
            return;
          }

          onValueChange(accepted || "");
        }}
        onPaste={handlePaste}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            onDiscard();
          }
        }}
        style={{ flex: "1 1 auto" }}
        disabled={disabled}
        size="sm"
        autoFocus={autoFocus}
        data-field={field}
      />
    </Group>
  );
}
