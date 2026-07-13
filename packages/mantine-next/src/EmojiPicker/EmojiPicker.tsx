"use client";

import { Input, Popover, Text } from "@mantine/core";
import { useState } from "react";
import { EmojiPickerDropdownContent } from "#EmojiPicker/EmojiPickerDropdownContent.js";

interface EmojiPickerProps {
  disabled?: boolean;
  error?: string;
  onChange: (emoji: string) => void;
  /** Debounce delay in ms for the emoji search input. Defaults to 200 (local filter). */
  searchDebounceMs?: number;
  value: string;
}

export function EmojiPicker({
  value,
  onChange,
  error,
  searchDebounceMs,
  disabled = false,
}: EmojiPickerProps) {
  const [opened, setOpened] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpened(false);
  };

  return (
    <Input.Wrapper
      error={error}
      label="Emoji"
      required
      styles={{
        label: disabled ? { color: "var(--mantine-color-disabled-color)" } : undefined,
      }}
      withAsterisk
    >
      <Popover
        onChange={(nextOpened) => {
          if (!disabled) {
            setOpened(nextOpened);
          }
        }}
        opened={disabled ? false : opened}
        position="bottom-start"
        shadow="md"
        width={320}
      >
        <Popover.Target>
          <Input
            classNames={{
              input: `emoji-picker-trigger button-scale-effect ${opened && !disabled ? "button-scale-effect-active" : ""}`,
            }}
            component="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setOpened((current) => !current);
              }
            }}
            pointer={!disabled}
            styles={{
              input: {
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
              },
            }}
            type="button"
          >
            {value ? (
              <Text inherit lh={1} size="xl">
                {value}
              </Text>
            ) : (
              <Text c="dimmed" inherit lh={1} size="sm">
                Select emoji
              </Text>
            )}
          </Input>
        </Popover.Target>

        <Popover.Dropdown>
          <EmojiPickerDropdownContent
            onSelect={handleSelect}
            searchDebounceMs={searchDebounceMs}
            value={value}
          />
        </Popover.Dropdown>
      </Popover>
    </Input.Wrapper>
  );
}
