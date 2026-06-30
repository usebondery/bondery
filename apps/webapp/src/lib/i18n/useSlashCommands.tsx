"use client";

import { useMemo } from "react";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconAt,
  IconBlockquote,
  IconBold,
  IconCalendar,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconHighlight,
  IconItalic,
  IconLink,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconMinus,
  IconMoodSmile,
  IconPilcrow,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react";
import type { SlashCommandItem } from "@/app/(app)/app/person/[person_id]/components/SlashCommandList";
import { useWebTranslations as useTranslations } from "./useWebTranslations";

type SlashCommandDefinition = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: TablerIcon;
  groupKey: string;
  action: SlashCommandItem["action"];
};

const SLASH_COMMAND_DEFINITIONS: SlashCommandDefinition[] = [
  {
    id: "heading1",
    labelKey: "Heading1Label",
    descriptionKey: "Heading1Description",
    icon: IconH1,
    groupKey: "GroupText",
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
    labelKey: "Heading2Label",
    descriptionKey: "Heading2Description",
    icon: IconH2,
    groupKey: "GroupText",
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
    labelKey: "Heading3Label",
    descriptionKey: "Heading3Description",
    icon: IconH3,
    groupKey: "GroupText",
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
    labelKey: "ParagraphLabel",
    descriptionKey: "ParagraphDescription",
    icon: IconPilcrow,
    groupKey: "GroupText",
    action: (editor) =>
      (editor.chain() as { focus: () => { setParagraph: () => { run: () => void } } })
        .focus()
        .setParagraph()
        .run(),
  },
  {
    id: "bold",
    labelKey: "BoldLabel",
    descriptionKey: "BoldDescription",
    icon: IconBold,
    groupKey: "GroupMarks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBold: () => { run: () => void } } })
        .focus()
        .toggleBold()
        .run(),
  },
  {
    id: "italic",
    labelKey: "ItalicLabel",
    descriptionKey: "ItalicDescription",
    icon: IconItalic,
    groupKey: "GroupMarks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleItalic: () => { run: () => void } } })
        .focus()
        .toggleItalic()
        .run(),
  },
  {
    id: "underline",
    labelKey: "UnderlineLabel",
    descriptionKey: "UnderlineDescription",
    icon: IconUnderline,
    groupKey: "GroupMarks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleUnderline: () => { run: () => void } } })
        .focus()
        .toggleUnderline()
        .run(),
  },
  {
    id: "strikethrough",
    labelKey: "StrikethroughLabel",
    descriptionKey: "StrikethroughDescription",
    icon: IconStrikethrough,
    groupKey: "GroupMarks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleStrike: () => { run: () => void } } })
        .focus()
        .toggleStrike()
        .run(),
  },
  {
    id: "highlight",
    labelKey: "HighlightLabel",
    descriptionKey: "HighlightDescription",
    icon: IconHighlight,
    groupKey: "GroupMarks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleHighlight: () => { run: () => void } } })
        .focus()
        .toggleHighlight()
        .run(),
  },
  {
    id: "code",
    labelKey: "CodeLabel",
    descriptionKey: "CodeDescription",
    icon: IconCode,
    groupKey: "GroupMarks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleCode: () => { run: () => void } } })
        .focus()
        .toggleCode()
        .run(),
  },
  {
    id: "bulletList",
    labelKey: "BulletListLabel",
    descriptionKey: "BulletListDescription",
    icon: IconList,
    groupKey: "GroupBlocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBulletList: () => { run: () => void } } })
        .focus()
        .toggleBulletList()
        .run(),
  },
  {
    id: "orderedList",
    labelKey: "OrderedListLabel",
    descriptionKey: "OrderedListDescription",
    icon: IconListNumbers,
    groupKey: "GroupBlocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleOrderedList: () => { run: () => void } } })
        .focus()
        .toggleOrderedList()
        .run(),
  },
  {
    id: "taskList",
    labelKey: "TaskListLabel",
    descriptionKey: "TaskListDescription",
    icon: IconListCheck,
    groupKey: "GroupBlocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleTaskList: () => { run: () => void } } })
        .focus()
        .toggleTaskList()
        .run(),
  },
  {
    id: "blockquote",
    labelKey: "BlockquoteLabel",
    descriptionKey: "BlockquoteDescription",
    icon: IconBlockquote,
    groupKey: "GroupBlocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBlockquote: () => { run: () => void } } })
        .focus()
        .toggleBlockquote()
        .run(),
  },
  {
    id: "horizontalRule",
    labelKey: "DividerLabel",
    descriptionKey: "DividerDescription",
    icon: IconMinus,
    groupKey: "GroupBlocks",
    action: (editor) =>
      (editor.chain() as { focus: () => { setHorizontalRule: () => { run: () => void } } })
        .focus()
        .setHorizontalRule()
        .run(),
  },
  {
    id: "link",
    labelKey: "LinkLabel",
    descriptionKey: "LinkDescription",
    icon: IconLink,
    groupKey: "GroupInsert",
    action: () => {
      window.dispatchEvent(new CustomEvent("edit-link"));
    },
  },
  {
    id: "emoji",
    labelKey: "EmojiLabel",
    descriptionKey: "EmojiDescription",
    icon: IconMoodSmile,
    groupKey: "GroupInsert",
    action: (editor) => {
      (editor.commands as { insertContent: (c: string) => void }).insertContent(":");
    },
  },
  {
    id: "mention",
    labelKey: "MentionLabel",
    descriptionKey: "MentionDescription",
    icon: IconAt,
    groupKey: "GroupInsert",
    action: (editor) => {
      (editor.commands as { insertContent: (c: string) => void }).insertContent("@");
    },
  },
  {
    id: "date",
    labelKey: "DateLabel",
    descriptionKey: "DateDescription",
    icon: IconCalendar,
    groupKey: "GroupInsert",
    action: (editor) => {
      (editor.commands as { insertContent: (c: unknown) => void }).insertContent({
        type: "inlineDate",
        attrs: { timestamp: new Date().toISOString() },
      });
    },
  },
];

export function useSlashCommands(): SlashCommandItem[] {
  const t = useTranslations("NotesSlashCommands");

  return useMemo(
    () =>
      SLASH_COMMAND_DEFINITIONS.map((definition) => ({
        id: definition.id,
        label: t(definition.labelKey),
        description: t(definition.descriptionKey),
        icon: definition.icon,
        group: t(definition.groupKey),
        action: definition.action,
      })),
    [t],
  );
}
