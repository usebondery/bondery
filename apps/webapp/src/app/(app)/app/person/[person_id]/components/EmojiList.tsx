"use client";

import { Group, Paper, Stack, Text, UnstyledButton, useMantineTheme } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface EmojiItem {
  name: string;
  emoji: string;
}

interface EmojiListProps {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
}

export interface EmojiListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const EmojiList = forwardRef<EmojiListHandle, EmojiListProps>(function EmojiList(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];

    if (!item) {
      return;
    }

    command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (current + items.length - 1) % Math.max(items.length, 1));
        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % Math.max(items.length, 1));
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  const theme = useMantineTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <Paper shadow="md" radius="md" withBorder p={4} maw={300}>
      <Stack gap={0}>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;

          return (
            <UnstyledButton
              key={item.name}
              px="sm"
              py={6}
              onClick={() => selectItem(index)}
              style={{
                borderRadius: "var(--mantine-radius-sm)",
                backgroundColor: isSelected
                  ? `var(--mantine-color-${theme.primaryColor}-light-hover)`
                  : "transparent",
                transition: "background-color 60ms ease",
              }}
            >
              <Group gap="sm" wrap="nowrap">
                <Text size="lg" lh={1} style={{ width: 26, textAlign: "center", flexShrink: 0 }}>
                  {item.emoji}
                </Text>
                <Text size="sm" c={isSelected ? undefined : "dimmed"} fw={isSelected ? 500 : 400}>
                  :{item.name}:
                </Text>
              </Group>
            </UnstyledButton>
          );
        })}
      </Stack>
    </Paper>
  );
});
