"use client";

import { ReactRenderer } from "@tiptap/react";
import { emojis } from "@tiptap/extension-emoji";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import tippy, { type GetReferenceClientRect, type Instance as TippyInstance } from "tippy.js";
import { EmojiList, type EmojiItem, type EmojiListHandle } from "./EmojiList";

/**
 * Suggestion render configuration for the Tiptap Emoji extension.
 * Provides a tippy.js-anchored popup that lists matching emoji when the
 * user types `:query` in the editor.
 */
export const emojiSuggestionRender = {
  items: ({ query }: { query: string }): EmojiItem[] => {
    const q = query.toLowerCase();

    return emojis
      .filter(
        ({ shortcodes, emoji }) => emoji !== undefined && shortcodes.some((s) => s.startsWith(q)),
      )
      .slice(0, 10)
      .map(({ emoji, name }) => ({ emoji: emoji as string, name }));
  },

  render: () => {
    let reactRenderer: ReactRenderer<EmojiListHandle> | null = null;
    let popup: TippyInstance | null = null;

    return {
      onStart: (props: SuggestionProps<EmojiItem>) => {
        if (!props.clientRect || props.items.length === 0) {
          return;
        }

        reactRenderer = new ReactRenderer(EmojiList, {
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

      onUpdate: (props: SuggestionProps<EmojiItem>) => {
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

        return (reactRenderer?.ref as EmojiListHandle | null)?.onKeyDown(props) ?? false;
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
