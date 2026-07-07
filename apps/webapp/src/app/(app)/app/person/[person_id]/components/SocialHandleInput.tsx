"use client";

import type { ClipboardEvent } from "react";
import { InlineEditableInput } from "./InlineEditableInput";
import type { SocialFieldKey } from "./useSocialFieldEditor";

interface SocialHandleInputProps {
  field: SocialFieldKey;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onPaste?: (raw: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
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
      placeholder={placeholder}
      value={value}
      onChange={onChange}
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
      error={error}
      style={{ width: "100%" }}
      disabled={disabled}
      autoFocus={autoFocus}
      data-field={field}
    />
  );
}
