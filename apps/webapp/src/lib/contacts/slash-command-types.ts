import type { TablerIcon } from "@tabler/icons-react";

/** Slash command entry for rich-text note editors. */
export interface SlashCommandItem {
  action: (editor: { chain: () => unknown; commands: Record<string, unknown> }) => void;
  description: string;
  group: string;
  icon: TablerIcon;
  id: string;
  label: string;
}
