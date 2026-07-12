"use client";

import type { LooseTranslateFn } from "@bondery/translations";
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
import { useMemo } from "react";
import type { SlashCommandItem } from "@/lib/contacts/slash-command-types";
import { useNotesSlashCommandsTranslations } from "@/lib/i18n/generated/hooks";

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
    action: (editor) =>
      (
        editor.chain() as {
          focus: () => { toggleHeading: (o: { level: number }) => { run: () => void } };
        }
      )
        .focus()
        .toggleHeading({ level: 1 })
        .run(),
    descriptionKey: "Heading1Description",
    groupKey: "GroupText",
    icon: IconH1,
    id: "heading1",
    labelKey: "Heading1Label",
  },
  {
    action: (editor) =>
      (
        editor.chain() as {
          focus: () => { toggleHeading: (o: { level: number }) => { run: () => void } };
        }
      )
        .focus()
        .toggleHeading({ level: 2 })
        .run(),
    descriptionKey: "Heading2Description",
    groupKey: "GroupText",
    icon: IconH2,
    id: "heading2",
    labelKey: "Heading2Label",
  },
  {
    action: (editor) =>
      (
        editor.chain() as {
          focus: () => { toggleHeading: (o: { level: number }) => { run: () => void } };
        }
      )
        .focus()
        .toggleHeading({ level: 3 })
        .run(),
    descriptionKey: "Heading3Description",
    groupKey: "GroupText",
    icon: IconH3,
    id: "heading3",
    labelKey: "Heading3Label",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { setParagraph: () => { run: () => void } } })
        .focus()
        .setParagraph()
        .run(),
    descriptionKey: "ParagraphDescription",
    groupKey: "GroupText",
    icon: IconPilcrow,
    id: "paragraph",
    labelKey: "ParagraphLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBold: () => { run: () => void } } })
        .focus()
        .toggleBold()
        .run(),
    descriptionKey: "BoldDescription",
    groupKey: "GroupMarks",
    icon: IconBold,
    id: "bold",
    labelKey: "BoldLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleItalic: () => { run: () => void } } })
        .focus()
        .toggleItalic()
        .run(),
    descriptionKey: "ItalicDescription",
    groupKey: "GroupMarks",
    icon: IconItalic,
    id: "italic",
    labelKey: "ItalicLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleUnderline: () => { run: () => void } } })
        .focus()
        .toggleUnderline()
        .run(),
    descriptionKey: "UnderlineDescription",
    groupKey: "GroupMarks",
    icon: IconUnderline,
    id: "underline",
    labelKey: "UnderlineLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleStrike: () => { run: () => void } } })
        .focus()
        .toggleStrike()
        .run(),
    descriptionKey: "StrikethroughDescription",
    groupKey: "GroupMarks",
    icon: IconStrikethrough,
    id: "strikethrough",
    labelKey: "StrikethroughLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleHighlight: () => { run: () => void } } })
        .focus()
        .toggleHighlight()
        .run(),
    descriptionKey: "HighlightDescription",
    groupKey: "GroupMarks",
    icon: IconHighlight,
    id: "highlight",
    labelKey: "HighlightLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleCode: () => { run: () => void } } })
        .focus()
        .toggleCode()
        .run(),
    descriptionKey: "CodeDescription",
    groupKey: "GroupMarks",
    icon: IconCode,
    id: "code",
    labelKey: "CodeLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBulletList: () => { run: () => void } } })
        .focus()
        .toggleBulletList()
        .run(),
    descriptionKey: "BulletListDescription",
    groupKey: "GroupBlocks",
    icon: IconList,
    id: "bulletList",
    labelKey: "BulletListLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleOrderedList: () => { run: () => void } } })
        .focus()
        .toggleOrderedList()
        .run(),
    descriptionKey: "OrderedListDescription",
    groupKey: "GroupBlocks",
    icon: IconListNumbers,
    id: "orderedList",
    labelKey: "OrderedListLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleTaskList: () => { run: () => void } } })
        .focus()
        .toggleTaskList()
        .run(),
    descriptionKey: "TaskListDescription",
    groupKey: "GroupBlocks",
    icon: IconListCheck,
    id: "taskList",
    labelKey: "TaskListLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { toggleBlockquote: () => { run: () => void } } })
        .focus()
        .toggleBlockquote()
        .run(),
    descriptionKey: "BlockquoteDescription",
    groupKey: "GroupBlocks",
    icon: IconBlockquote,
    id: "blockquote",
    labelKey: "BlockquoteLabel",
  },
  {
    action: (editor) =>
      (editor.chain() as { focus: () => { setHorizontalRule: () => { run: () => void } } })
        .focus()
        .setHorizontalRule()
        .run(),
    descriptionKey: "DividerDescription",
    groupKey: "GroupBlocks",
    icon: IconMinus,
    id: "horizontalRule",
    labelKey: "DividerLabel",
  },
  {
    action: () => {
      window.dispatchEvent(new CustomEvent("edit-link"));
    },
    descriptionKey: "LinkDescription",
    groupKey: "GroupInsert",
    icon: IconLink,
    id: "link",
    labelKey: "LinkLabel",
  },
  {
    action: (editor) => {
      (editor.commands as { insertContent: (c: string) => void }).insertContent(":");
    },
    descriptionKey: "EmojiDescription",
    groupKey: "GroupInsert",
    icon: IconMoodSmile,
    id: "emoji",
    labelKey: "EmojiLabel",
  },
  {
    action: (editor) => {
      (editor.commands as { insertContent: (c: string) => void }).insertContent("@");
    },
    descriptionKey: "MentionDescription",
    groupKey: "GroupInsert",
    icon: IconAt,
    id: "mention",
    labelKey: "MentionLabel",
  },
  {
    action: (editor) => {
      (editor.commands as { insertContent: (c: unknown) => void }).insertContent({
        attrs: { timestamp: new Date().toISOString() },
        type: "inlineDate",
      });
    },
    descriptionKey: "DateDescription",
    groupKey: "GroupInsert",
    icon: IconCalendar,
    id: "date",
    labelKey: "DateLabel",
  },
];

export function useSlashCommands(): SlashCommandItem[] {
  const t = useNotesSlashCommandsTranslations() as LooseTranslateFn;

  return useMemo(
    () =>
      SLASH_COMMAND_DEFINITIONS.map((definition) => ({
        action: definition.action,
        description: t(definition.descriptionKey),
        group: t(definition.groupKey),
        icon: definition.icon,
        id: definition.id,
        label: t(definition.labelKey),
      })),
    [t],
  );
}
