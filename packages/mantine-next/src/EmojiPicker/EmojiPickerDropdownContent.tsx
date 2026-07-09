"use client";

import { filterEmojiCategories } from "@bondery/helpers/emoji";
import { Button, ScrollArea, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

interface EmojiPickerDropdownContentProps {
  /** Called when the user clicks an emoji. */
  onSelect: (emoji: string) => void;
  /** Debounce delay in ms for the search input. Local filter only — no API call. */
  searchDebounceMs?: number;
  /** Currently selected emoji (highlighted in the grid). */
  value?: string;
}

/**
 * The inner content of the EmojiPicker — search bar + scrollable emoji grid.
 * Extracted so it can be reused inside different containers (Popover, Menu, etc.)
 * without duplicating the filtering logic.
 */
export function EmojiPickerDropdownContent({
  value,
  onSelect,
  searchDebounceMs = 200,
}: EmojiPickerDropdownContentProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, searchDebounceMs);

  const filteredContent = useMemo(() => filterEmojiCategories(debouncedSearch), [debouncedSearch]);

  return (
    <Stack gap="sm">
      <TextInput
        autoFocus
        leftSection={<IconSearch size={14} />}
        onChange={(e) => setSearch(e.currentTarget.value)}
        placeholder="Search by emoji name or keyword..."
        size="xs"
        value={search}
      />

      <ScrollArea h={250} type="auto">
        {filteredContent.length === 0 ? (
          <Text c="dimmed" py="md" size="sm" ta="center">
            No emojis found
          </Text>
        ) : (
          <Stack gap="md">
            {filteredContent.map(([category, emojis]) => (
              <Stack gap={4} key={category}>
                <Text c="dimmed" fw={600} size="xs">
                  {category}
                </Text>
                <SimpleGrid cols={7} spacing={4}>
                  {emojis.map((item) => (
                    <Button
                      color={value === item.emoji ? "" : "gray"}
                      key={item.emoji}
                      onClick={() => onSelect(item.emoji)}
                      size="compact-md"
                      style={{ fontSize: "1.2rem", padding: 4 }}
                      variant={value === item.emoji ? "primary" : "subtle"}
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
