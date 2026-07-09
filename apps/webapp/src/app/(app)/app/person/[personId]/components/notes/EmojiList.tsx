"use client";

import { Group, Paper, Stack, Text, UnstyledButton, useMantineTheme } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface EmojiItem {
  emoji: string;
  name: string;
}

interface EmojiListProps {
  command: (item: EmojiItem) => void;
  items: EmojiItem[];
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
  }, []);

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
    <Paper maw={300} p={4} radius="md" shadow="md" withBorder>
      <Stack gap={0}>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;

          return (
            <UnstyledButton
              key={item.name}
              onClick={() => selectItem(index)}
              px="sm"
              py={6}
              style={{
                backgroundColor: isSelected
                  ? `var(--mantine-color-${theme.primaryColor}-light-hover)`
                  : "transparent",
                borderRadius: "var(--mantine-radius-sm)",
                transition: "background-color 60ms ease",
              }}
            >
              <Group gap="sm" wrap="nowrap">
                <Text lh={1} size="lg" style={{ flexShrink: 0, textAlign: "center", width: 26 }}>
                  {item.emoji}
                </Text>
                <Text c={isSelected ? undefined : "dimmed"} fw={isSelected ? 500 : 400} size="sm">
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
