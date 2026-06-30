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
import type { TablerIcon } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: TablerIcon;
  group: string;
  action: (editor: { chain: () => unknown; commands: Record<string, unknown> }) => void;
}

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  function SlashCommandList({ items, command }, ref) {
    const t = useTranslations("NotesSlashCommands");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // Scroll selected item into view
    useEffect(() => {
      const container = scrollAreaRef.current;
      if (!container) return;
      const selected = container.querySelector<HTMLElement>(
        `[data-slash-index="${selectedIndex}"]`,
      );
      selected?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (!item) return;
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
        <Paper shadow="md" radius="md" withBorder p="sm" maw={280}>
          <Text size="sm" c="dimmed">
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
        currentGroup = { label: item.group, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push({ item, globalIndex });
    });

    return (
      <Paper shadow="md" radius="md" withBorder p={4} maw={280}>
        <ScrollArea.Autosize mah={320} viewportRef={scrollAreaRef}>
          <Stack gap={2}>
            {groups.map((group) => (
              <div key={group.label}>
                <Text size="xs" fw={600} c="dimmed" px="sm" pt={6} pb={2}>
                  {group.label}
                </Text>
                {group.items.map(({ item, globalIndex }) => {
                  const isSelected = globalIndex === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <UnstyledButton
                      key={item.id}
                      data-slash-index={globalIndex}
                      px="sm"
                      py={6}
                      display="block"
                      w="100%"
                      onClick={() => selectItem(globalIndex)}
                      style={{
                        borderRadius: "var(--mantine-radius-sm)",
                        backgroundColor: isSelected
                          ? `var(--mantine-color-${theme.primaryColor}-light-hover)`
                          : "transparent",
                        transition: "background-color 60ms ease",
                      }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Icon size={18} style={{ flexShrink: 0, opacity: 0.7 }} />
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>
                            {item.label}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
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
