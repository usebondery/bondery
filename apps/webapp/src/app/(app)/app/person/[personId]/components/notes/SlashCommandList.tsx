"use client";

import {
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SlashCommandItem } from "@/lib/contacts/slash-command-types";
import { useNotesSlashCommandsTranslations } from "@/lib/i18n/generated/hooks";

export type { SlashCommandItem } from "@/lib/contacts/slash-command-types";

interface SlashCommandListProps {
  command: (item: SlashCommandItem) => void;
  items: SlashCommandItem[];
}

export interface SlashCommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  function SlashCommandList({ items, command }, ref) {
    const t = useNotesSlashCommandsTranslations();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
      const container = scrollAreaRef.current;
      if (!container) {
        return;
      }
      const selected = container.querySelector<HTMLElement>(
        `[data-slash-index="${selectedIndex}"]`,
      );
      selected?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

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
          setSelectedIndex((current) =>
            items.length === 0 ? 0 : (current + items.length - 1) % items.length,
          );
          return true;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((current) => (items.length === 0 ? 0 : (current + 1) % items.length));
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
      return (
        <Paper maw={280} p="sm" radius="md" shadow="md" withBorder>
          <Text c="dimmed" size="sm">
            {t("NoResults")}
          </Text>
        </Paper>
      );
    }

    // Build grouped output
    const groups: { label: string; items: { item: SlashCommandItem; globalIndex: number }[] }[] =
      [];
    let currentGroup: (typeof groups)[number] | null = null;

    items.forEach((item, globalIndex) => {
      if (!currentGroup || currentGroup.label !== item.group) {
        currentGroup = { items: [], label: item.group };
        groups.push(currentGroup);
      }
      currentGroup.items.push({ globalIndex, item });
    });

    return (
      <Paper maw={280} p={4} radius="md" shadow="md" withBorder>
        <ScrollArea.Autosize mah={320} viewportRef={scrollAreaRef}>
          <Stack gap={2}>
            {groups.map((group) => (
              <div key={group.label}>
                <Text c="dimmed" fw={600} pb={2} pt={6} px="sm" size="xs">
                  {group.label}
                </Text>
                {group.items.map(({ item, globalIndex }) => {
                  const isSelected = globalIndex === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <UnstyledButton
                      data-slash-index={globalIndex}
                      display="block"
                      key={item.id}
                      onClick={() => selectItem(globalIndex)}
                      px="sm"
                      py={6}
                      style={{
                        backgroundColor: isSelected
                          ? `var(--mantine-color-${theme.primaryColor}-light-hover)`
                          : "transparent",
                        borderRadius: "var(--mantine-radius-sm)",
                        transition: "background-color 60ms ease",
                      }}
                      w="100%"
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Icon size={18} style={{ flexShrink: 0, opacity: 0.7 }} />
                        <div style={{ minWidth: 0 }}>
                          <Text fw={500} size="sm" truncate>
                            {item.label}
                          </Text>
                          <Text c="dimmed" size="xs" truncate>
                            {item.description}
                          </Text>
                        </div>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </div>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Paper>
    );
  },
);
