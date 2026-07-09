"use client";

import { extractUsername, formatWhatsAppNumber } from "@bondery/helpers";
import {
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
  TELEPHONE_PREFIX_OPTIONS,
} from "@bondery/helpers/phone";
import { Group, Input, Select } from "@mantine/core";
import { type ClipboardEvent, memo, useMemo } from "react";
import { IMaskInput } from "react-imask";
import type { SocialFieldKey } from "../../hooks/useSocialFieldEditor";

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
      data={TELEPHONE_PREFIX_OPTIONS}
      disabled={disabled}
      leftSection={<span className={`fi fi-${selectedOption?.flag || "us"}`} />}
      onChange={(val) => onChange(val || "+1")}
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
      searchable
      size="sm"
      style={{ width: 100 }}
      value={value}
    />
  );
});

interface SocialPhoneInputProps {
  autoFocus?: boolean;
  disabled?: boolean;
  field: Extract<SocialFieldKey, "whatsapp" | "signal">;
  label: string;
  onCommit: () => void;
  onDiscard: () => void;
  onPaste?: (raw: string) => void;
  onPrefixChange: (value: string) => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  prefix: string;
  value: string;
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
    <Group align="center" gap="xs" style={{ width: 390 }} wrap="nowrap">
      <PrefixSelect disabled={disabled} onChange={onPrefixChange} value={prefix} />
      <Input
        aria-label={label}
        autoFocus={autoFocus}
        component={IMaskInput}
        data-field={field}
        disabled={disabled}
        mask={getTelephoneReactMaskExpression(prefix)}
        onAccept={(accepted: string) => {
          const parsed = parsePhoneNumber(accepted);
          if (parsed && accepted.includes("+")) {
            onPrefixChange(parsed.dialCode);
            onValueChange(parsed.number);
            return;
          }

          onValueChange(accepted || "");
        }}
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
        onPaste={handlePaste}
        placeholder={placeholder}
        size="sm"
        style={{ flex: "1 1 auto" }}
        unmask
        value={value}
      />
    </Group>
  );
}
