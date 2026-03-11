"use client";

import { useState } from "react";
import { Popover, Button, Text, Stack } from "@mantine/core";
import { EmojiPickerDropdownContent } from "./EmojiPickerDropdownContent";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  error?: string;
}

export function EmojiPicker({ value, onChange, error }: EmojiPickerProps) {
  const [opened, setOpened] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpened(false);
  };

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        Emoji <span style={{ color: "var(--mantine-color-red-6)" }}>*</span>
      </Text>
      <Popover opened={opened} onChange={setOpened} position="bottom-start" width={320} shadow="md">
        <Popover.Target>
          <Button
            className={`emoji-picker-trigger button-scale-effect ${opened ? "button-scale-effect-active" : ""}`}
            onClick={() => setOpened((o) => !o)}
            variant="light"
          >
            {value ? (
              <Text size="xl">{value}</Text>
            ) : (
              <Text size="sm" c="dimmed">
                Select emoji
              </Text>
            )}
          </Button>
        </Popover.Target>

        <Popover.Dropdown>
          <EmojiPickerDropdownContent value={value} onSelect={handleSelect} />
        </Popover.Dropdown>
      </Popover>
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
