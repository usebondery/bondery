"use client";

import { Avatar, Group, Paper, Stack, Text, UnstyledButton, useMantineTheme } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionSuggestionItem {
  id: string;
  label: string;
  avatar?: string | null;
  headline?: string | null;
  location?: string | null;
}

interface MentionListProps {
  items: MentionSuggestionItem[];
  command: (item: MentionSuggestionItem) => void;
}

export interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList(
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
        setSelectedIndex((current) => {
          if (items.length === 0) {
            return 0;
          }

          return (current + items.length - 1) % items.length;
        });
        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (items.length === 0) {
            return 0;
          }

          return (current + 1) % items.length;
        });
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
    <Paper shadow="sm" radius="md" withBorder p="xs">
      <Stack gap={4}>
        {items.map((item, index) => (
          <UnstyledButton
            key={item.id}
            px="sm"
            py={6}
            onClick={() => selectItem(index)}
            style={{
              borderRadius: "var(--mantine-radius-sm)",
              backgroundColor:
                index === selectedIndex
                  ? `var(--mantine-color-${theme.primaryColor}-light-hover)`
                  : "transparent",
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <Avatar src={item.avatar || undefined} size="sm" radius="xl" name={item.label} />
              <Text size="sm">{item.label}</Text>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
});
