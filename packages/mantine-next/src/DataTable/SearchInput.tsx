"use client";

import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";

/**
 * Isolated search input that owns its own local state.
 * Keeping state here prevents the parent DataTable (and all its rows)
 * from re-rendering on every keystroke.
 */
export function SearchInput({
  initialValue,
  placeholder,
  onChange,
  loading,
}: {
  initialValue: string;
  placeholder?: string;
  onChange: (value: string) => void;
  loading?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <TextInput
      aria-label={placeholder}
      leftSection={<IconSearch size={16} />}
      loading={loading}
      onChange={(e) => {
        setValue(e.currentTarget.value);
        onChange(e.currentTarget.value);
      }}
      placeholder={placeholder}
      style={{ flex: 1 }}
      value={value}
    />
  );
}
