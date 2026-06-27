import type { ComponentType } from "react";
import type { EnrichedMarkdownTextInputInstance } from "react-native-enriched-markdown";
import {
  IconAt,
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react-native";

export type SlashCommandId = "mention" | "bold" | "italic" | "underline" | "strikethrough";

export interface SlashCommandDefinition {
  id: SlashCommandId;
  label: string;
  description: string;
  group: "Insert" | "Format";
  keywords: string[];
  icon: ComponentType<{ size?: number; stroke?: string }>;
  run: (editor: EnrichedMarkdownTextInputInstance) => void;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    id: "mention",
    label: "Mention person",
    description: "Mention a person",
    group: "Insert",
    keywords: ["mention", "person", "contact", "at"],
    icon: IconAt,
    run: (editor) => {
      editor.startMention("@");
    },
  },
  {
    id: "bold",
    label: "Bold",
    description: "Strong emphasis",
    group: "Format",
    keywords: ["bold", "strong"],
    icon: IconBold,
    run: (editor) => {
      editor.toggleBold();
    },
  },
  {
    id: "italic",
    label: "Italic",
    description: "Emphasis",
    group: "Format",
    keywords: ["italic", "emphasis"],
    icon: IconItalic,
    run: (editor) => {
      editor.toggleItalic();
    },
  },
  {
    id: "underline",
    label: "Underline",
    description: "Underlined text",
    group: "Format",
    keywords: ["underline"],
    icon: IconUnderline,
    run: (editor) => {
      editor.toggleUnderline();
    },
  },
  {
    id: "strikethrough",
    label: "Strikethrough",
    description: "Crossed out text",
    group: "Format",
    keywords: ["strikethrough", "strike"],
    icon: IconStrikethrough,
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
