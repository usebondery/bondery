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
import {
  IconH1,
  IconH2,
  IconH3,
  IconPilcrow,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconHighlight,
  IconCode,
  IconList,
  IconListNumbers,
  IconListCheck,
  IconBlockquote,
  IconMinus,
  IconLink,
  IconMoodSmile,
  IconAt,
  IconCalendar,
} from "@tabler/icons-react";

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: TablerIcon;
  group: string;
  action: (editor: { chain: () => unknown; commands: Record<string, unknown> }) => void;
}

/** All available slash commands, grouped by category. */
export const SLASH_COMMANDS: SlashCommandItem[] = [
  // ── Text ───────────────────────────────────────────────────────────────
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    icon: IconH1,
    group: "Text",
    action: (editor) =>
      (
        editor.chain() as {
          focus: () => { toggleHeading: (o: { level: number }) => { run: () => void } };
        }
      )
        .focus()
        .toggleHeading({ level: 1 })
        .run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: IconH2,
    group: "Text",
    action: (editor) =>
      (
        editor.chain() as {
          focus: () => { toggleHeading: (o: { level: number }) => { run: () => void } };
        }
      )
        .focus()
        .toggleHeading({ level: 2 })
        .run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    icon: IconH3,
    group: "Text",
    action: (editor) =>
      (
        editor.chain() as {
          focus: () => { toggleHeading: (o: { level: number }) => { run: () => void } };
        }
      )
        .focus()
        .toggleHeading({ level: 3 })
        .run(),
  },
  {
    id: "paragraph",
    label: "Paragraph",
    description: "Plain text block",
    icon: IconPilcrow,
    group: "Text",
    action: (editor) =>
      (editor.chain() as { focus: () => { setParagraph: () => { run: () => void } } })
        .focus()
        .setParagraph()
        .run(),
  },
  // ── Marks ──────────────────────────────────────────────────────────────
  {
    id: "bold",
    label: "Bold",
    description: "Strong emphasis",
    icon: IconBold,
    group: "Marks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBold: () => { run: () => void } } })
        .focus()
        .toggleBold()
        .run(),
  },
  {
    id: "italic",
    label: "Italic",
    description: "Emphasis",
    icon: IconItalic,
    group: "Marks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleItalic: () => { run: () => void } } })
        .focus()
        .toggleItalic()
        .run(),
  },
  {
    id: "underline",
    label: "Underline",
    description: "Underlined text",
    icon: IconUnderline,
    group: "Marks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleUnderline: () => { run: () => void } } })
        .focus()
        .toggleUnderline()
        .run(),
  },
  {
    id: "strikethrough",
    label: "Strikethrough",
    description: "Crossed out text",
    icon: IconStrikethrough,
    group: "Marks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleStrike: () => { run: () => void } } })
        .focus()
        .toggleStrike()
        .run(),
  },
  {
    id: "highlight",
    label: "Highlight",
    description: "Highlight text",
    icon: IconHighlight,
    group: "Marks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleHighlight: () => { run: () => void } } })
        .focus()
        .toggleHighlight()
        .run(),
  },
  {
    id: "code",
    label: "Inline Code",
    description: "Monospace text",
    icon: IconCode,
    group: "Marks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleCode: () => { run: () => void } } })
        .focus()
        .toggleCode()
        .run(),
  },
  // ── Blocks ─────────────────────────────────────────────────────────────
  {
    id: "bulletList",
    label: "Bullet List",
    description: "Unordered list",
    icon: IconList,
    group: "Blocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBulletList: () => { run: () => void } } })
        .focus()
        .toggleBulletList()
        .run(),
  },
  {
    id: "orderedList",
    label: "Numbered List",
    description: "Ordered list",
    icon: IconListNumbers,
    group: "Blocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleOrderedList: () => { run: () => void } } })
        .focus()
        .toggleOrderedList()
        .run(),
  },
  {
    id: "taskList",
    label: "To-do List",
    description: "Checklist with checkboxes",
    icon: IconListCheck,
    group: "Blocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleTaskList: () => { run: () => void } } })
        .focus()
        .toggleTaskList()
        .run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    description: "Blockquote",
    icon: IconBlockquote,
    group: "Blocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBlockquote: () => { run: () => void } } })
        .focus()
        .toggleBlockquote()
        .run(),
  },
  {
    id: "horizontalRule",
    label: "Divider",
    description: "Horizontal rule",
    icon: IconMinus,
    group: "Blocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { setHorizontalRule: () => { run: () => void } } })
        .focus()
        .setHorizontalRule()
        .run(),
  },
  // ── Insert ─────────────────────────────────────────────────────────────
  {
    id: "link",
    label: "Link",
    description: "Insert a hyperlink",
    icon: IconLink,
    group: "Insert",
    action: () => {
      window.dispatchEvent(new CustomEvent("edit-link"));
    },
  },
  {
    id: "emoji",
    label: "Emoji",
    description: "Insert an emoji",
    icon: IconMoodSmile,
    group: "Insert",
    action: (editor) => {
      (editor.commands as { insertContent: (c: string) => void }).insertContent(":");
    },
  },
  {
    id: "mention",
    label: "Mention",
    description: "Mention a person",
    icon: IconAt,
    group: "Insert",
    action: (editor) => {
      (editor.commands as { insertContent: (c: string) => void }).insertContent("@");
    },
  },
  {
    id: "date",
    label: "Date",
    description: "Insert today's date",
    icon: IconCalendar,
    group: "Insert",
    action: (editor) => {
      (editor.commands as { insertContent: (c: unknown) => void }).insertContent({
        type: "inlineDate",
        attrs: { timestamp: new Date().toISOString() },
      });
    },
  },
];

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  function SlashCommandList({ items, command }, ref) {
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
            No results
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
