"use client";

import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import tippy, { type GetReferenceClientRect, type Instance as TippyInstance } from "tippy.js";
import { MentionList, type MentionListHandle, type MentionSuggestionItem } from "./MentionList";

const MAX_MENTION_RESULTS = 8;

function filterMentionItems(
  items: MentionSuggestionItem[],
  query: string,
): MentionSuggestionItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items.slice(0, MAX_MENTION_RESULTS);
  }

  return items
    .filter((item) => item.label.toLowerCase().includes(normalizedQuery))
    .slice(0, MAX_MENTION_RESULTS);
}

export function createMentionSuggestion(items: MentionSuggestionItem[]) {
  return {
    items: ({ query }: { query: string }) => filterMentionItems(items, query),

    render: () => {
      let reactRenderer: ReactRenderer<MentionListHandle> | null = null;
      let popup: TippyInstance | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          if (!props.clientRect || props.items.length === 0) {
            return;
          }

          reactRenderer = new ReactRenderer(MentionList, {
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

        onUpdate: (props: SuggestionProps) => {
          if (!reactRenderer) {
            return;
          }

          reactRenderer.updateProps(props);

          if (!popup || !props.clientRect) {
            return;
          }

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

          return (reactRenderer?.ref as MentionListHandle | null)?.onKeyDown(props) ?? false;
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
}
