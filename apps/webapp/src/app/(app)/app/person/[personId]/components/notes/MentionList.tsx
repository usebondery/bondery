"use client";

import { Avatar, Group, Paper, Stack, Text, UnstyledButton, useMantineTheme } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionSuggestionItem {
  avatar?: string | null;
  headline?: string | null;
  id: string;
  label: string;
  location?: string | null;
}

interface MentionListProps {
  command: (item: MentionSuggestionItem) => void;
  items: MentionSuggestionItem[];
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
    <Paper p="xs" radius="md" shadow="sm" withBorder>
      <Stack gap={4}>
        {items.map((item, index) => (
          <UnstyledButton
            key={item.id}
            onClick={() => selectItem(index)}
            px="sm"
            py={6}
            style={{
              backgroundColor:
                index === selectedIndex
                  ? `var(--mantine-color-${theme.primaryColor}-light-hover)`
                  : "transparent",
              borderRadius: "var(--mantine-radius-sm)",
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <Avatar name={item.label} radius="xl" size="sm" src={item.avatar || undefined} />
              <Text size="sm">{item.label}</Text>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
});
