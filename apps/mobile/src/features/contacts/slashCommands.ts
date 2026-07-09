import {
  IconAt,
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react-native";
import type { ComponentType } from "react";
import type { EnrichedMarkdownTextInputInstance } from "react-native-enriched-markdown";

export type SlashCommandId = "mention" | "bold" | "italic" | "underline" | "strikethrough";

export interface SlashCommandDefinition {
  description: string;
  group: "Insert" | "Format";
  icon: ComponentType<{ size?: number; stroke?: string }>;
  id: SlashCommandId;
  keywords: string[];
  label: string;
  run: (editor: EnrichedMarkdownTextInputInstance) => void;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    description: "Mention a person",
    group: "Insert",
    icon: IconAt,
    id: "mention",
    keywords: ["mention", "person", "contact", "at"],
    label: "Mention person",
    run: (editor) => {
      editor.startMention("@");
    },
  },
  {
    description: "Strong emphasis",
    group: "Format",
    icon: IconBold,
    id: "bold",
    keywords: ["bold", "strong"],
    label: "Bold",
    run: (editor) => {
      editor.toggleBold();
    },
  },
  {
    description: "Emphasis",
    group: "Format",
    icon: IconItalic,
    id: "italic",
    keywords: ["italic", "emphasis"],
    label: "Italic",
    run: (editor) => {
      editor.toggleItalic();
    },
  },
  {
    description: "Underlined text",
    group: "Format",
    icon: IconUnderline,
    id: "underline",
    keywords: ["underline"],
    label: "Underline",
    run: (editor) => {
      editor.toggleUnderline();
    },
  },
  {
    description: "Crossed out text",
    group: "Format",
    icon: IconStrikethrough,
    id: "strikethrough",
    keywords: ["strikethrough", "strike"],
    label: "Strikethrough",
    run: (editor) => {
      editor.toggleStrikethrough();
    },
  },
];

const GROUP_ORDER: SlashCommandDefinition["group"][] = ["Insert", "Format"];

export function filterSlashCommands(query: string): SlashCommandDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return SLASH_COMMANDS;
  }

  return SLASH_COMMANDS.filter((command) => {
    const haystack = [command.label, command.description, ...command.keywords]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function groupSlashCommands(commands: SlashCommandDefinition[]): Array<{
  group: SlashCommandDefinition["group"];
  items: SlashCommandDefinition[];
}> {
  return GROUP_ORDER.map((group) => ({
    group,
    items: commands.filter((command) => command.group === group),
  })).filter((section) => section.items.length > 0);
}
