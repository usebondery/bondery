"use client";

import { Button, Popover, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { EmojiPickerDropdownContent } from "#EmojiPicker/EmojiPickerDropdownContent.js";

interface EmojiPickerProps {
  error?: string;
  onChange: (emoji: string) => void;
  /** Debounce delay in ms for the emoji search input. Defaults to 200 (local filter). */
  searchDebounceMs?: number;
  value: string;
}

export function EmojiPicker({ value, onChange, error, searchDebounceMs }: EmojiPickerProps) {
  const [opened, setOpened] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpened(false);
  };

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        Emoji <span style={{ color: "var(--mantine-color-red-6)" }}>*</span>
      </Text>
      <Popover onChange={setOpened} opened={opened} position="bottom-start" shadow="md" width={320}>
        <Popover.Target>
          <Button
            className={`emoji-picker-trigger button-scale-effect ${opened ? "button-scale-effect-active" : ""}`}
            onClick={() => setOpened((o) => !o)}
            variant="light"
          >
            {value ? (
              <Text size="xl">{value}</Text>
            ) : (
              <Text c="dimmed" size="sm">
                Select emoji
              </Text>
            )}
          </Button>
        </Popover.Target>

        <Popover.Dropdown>
          <EmojiPickerDropdownContent
            onSelect={handleSelect}
            searchDebounceMs={searchDebounceMs}
            value={value}
          />
        </Popover.Dropdown>
      </Popover>
      {error && (
        <Text c="red" size="xs">
          {error}
        </Text>
      )}
    </Stack>
  );
}
