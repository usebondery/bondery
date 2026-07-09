"use client";

import type { ClipboardEvent } from "react";
import type { SocialFieldKey } from "../../hooks/useSocialFieldEditor";
import { InlineEditableInput } from "../info/InlineEditableInput";

interface SocialHandleInputProps {
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  field: SocialFieldKey;
  label: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
  onPaste?: (raw: string) => void;
  placeholder: string;
  value: string;
}

export function SocialHandleInput({
  field,
  label,
  placeholder,
  value,
  error,
  disabled,
  autoFocus,
  onChange,
  onPaste,
  onCommit,
  onDiscard,
}: SocialHandleInputProps) {
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const raw = event.clipboardData.getData("text");
    if (raw && onPaste) {
      event.preventDefault();
      onPaste(raw);
    }
  };

  return (
    <InlineEditableInput
      aria-label={label}
      autoFocus={autoFocus}
      data-field={field}
      disabled={disabled}
      error={error}
      onChange={onChange}
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
      style={{ width: "100%" }}
      value={value}
    />
  );
}
