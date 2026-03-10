"use client";

import { useMemo, useState } from "react";
import { Button, ScrollArea, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { EMOJI_CATEGORIES } from "./emojiData";
import type { EmojiData } from "./emojiData";

interface EmojiPickerDropdownContentProps {
  /** Currently selected emoji (highlighted in the grid). */
  value?: string;
  /** Called when the user clicks an emoji. */
  onSelect: (emoji: string) => void;
}

/**
 * The inner content of the EmojiPicker — search bar + scrollable emoji grid.
 * Extracted so it can be reused inside different containers (Popover, Menu, etc.)
 * without duplicating the filtering logic.
 */
export function EmojiPickerDropdownContent({ value, onSelect }: EmojiPickerDropdownContentProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);

  const filteredContent = useMemo<[string, EmojiData[]][]>(() => {
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

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search by emoji name or keyword..."
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        size="xs"
        autoFocus
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
                      onClick={() => onSelect(item.emoji)}
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
  );
}
