"use client";

import { useState, useMemo } from "react";
import { Popover, Button, SimpleGrid, Text, Stack, TextInput, ScrollArea } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { EMOJI_CATEGORIES } from "./emojiData";
import type { EmojiData } from "./emojiData";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  error?: string;
}

export function EmojiPicker({ value, onChange, error }: EmojiPickerProps) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);

  // Filter emojis based on search keywords
  const filteredContent = useMemo(() => {
    if (!debouncedSearch) {
      return Object.entries(EMOJI_CATEGORIES);
    }

    const searchLower = debouncedSearch.toLowerCase();
    const filtered: [string, EmojiData[]][] = [];

    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matchedEmojis = emojis.filter((item) =>
        item.keywords.some((keyword) => keyword.includes(searchLower)),
      );
      if (matchedEmojis.length > 0) {
        filtered.push([category, matchedEmojis]);
      }
    });

    return filtered;
  }, [debouncedSearch]);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpened(false);
    setSearch("");
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
          <Stack gap="sm">
            <TextInput
              placeholder="Search by emoji name or keyword...)"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              size="xs"
              leftSection={<IconSearch size={14} />}
            />

            <ScrollArea h={250} type="auto">
              {filteredContent.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No emojis found
                </Text>
              ) : (
                <Stack gap="md">
                  {filteredContent.map(([category, emojis]) => (
                    <Stack key={category} gap={4}>
                      <Text size="xs" fw={600} c="dimmed">
                        {category}
                      </Text>
                      <SimpleGrid cols={7} spacing={4}>
                        {emojis.map((item) => (
                          <Button
                            key={item.emoji}
                            variant={value === item.emoji ? "primary" : "subtle"}
                            color={value === item.emoji ? "" : "gray"}
                            size="compact-md"
                            onClick={() => handleSelect(item.emoji)}
                            style={{ fontSize: "1.2rem", padding: 4 }}
                          >
                            {item.emoji}
                          </Button>
                        ))}
                      </SimpleGrid>
                    </Stack>
                  ))}
                </Stack>
              )}
            </ScrollArea>
          </Stack>
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
