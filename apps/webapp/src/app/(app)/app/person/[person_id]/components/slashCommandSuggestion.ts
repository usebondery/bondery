"use client";

import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import tippy, { type GetReferenceClientRect, type Instance as TippyInstance } from "tippy.js";
import {
  SlashCommandList,
  SLASH_COMMANDS,
  type SlashCommandItem,
  type SlashCommandListHandle,
} from "./SlashCommandList";

const MAX_RESULTS = 12;

function filterCommands(query: string): SlashCommandItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_COMMANDS.slice(0, MAX_RESULTS);

  return SLASH_COMMANDS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q),
  ).slice(0, MAX_RESULTS);
}

export const slashCommandSuggestion = {
  items: ({ query }: { query: string }) => filterCommands(query),

  render: () => {
    let reactRenderer: ReactRenderer<SlashCommandListHandle> | null = null;
    let popup: TippyInstance | null = null;

    return {
      onStart: (props: SuggestionProps<SlashCommandItem>) => {
        if (!props.clientRect || props.items.length === 0) return;

        reactRenderer = new ReactRenderer(SlashCommandList, {
          props,
          editor: props.editor,
        });

        popup = tippy(document.body, {
          appendTo: () => document.body,
          content: reactRenderer.element,
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          interactive: true,
          placement: "bottom-start",
          showOnCreate: true,
          trigger: "manual",
        });
      },

      onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
        if (!reactRenderer) return;

        reactRenderer.updateProps(props);

        if (!popup || !props.clientRect) return;

        if (props.items.length === 0) {
          popup.hide();
          return;
        }

        popup.setProps({
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
        });
        popup.show();
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === "Escape") {
          popup?.hide();
          return true;
        }

        return (reactRenderer?.ref as SlashCommandListHandle | null)?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        popup?.destroy();
        reactRenderer?.destroy();
        popup = null;
        reactRenderer = null;
      },
    };
  },
};
