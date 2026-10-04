"use client";

import type { PeoplePickerOptionPerson } from "@bondery/mantine-next";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import tippy, { type GetReferenceClientRect, type Instance as TippyInstance } from "tippy.js";
import { searchContactsPage } from "@/lib/contacts/searchContacts";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import {
  MentionList,
  type MentionListHandle,
  type MentionSuggestionItem,
} from "../components/notes/MentionList";

export function createMentionSuggestion(options: {
  getContactsHasMore: () => boolean;
  getCurrentPerson: () => PeoplePickerOptionPerson | null | undefined;
  getSeed: () => PeoplePickerOptionPerson[];
}) {
  return {
    items: () => {
      const seed = options.getSeed();
      return seed.length > 0 ? seed : [{ firstName: "", id: "__mention_placeholder__" }];
    },

    render: () => {
      let reactRenderer: ReactRenderer<MentionListHandle> | null = null;
      let popup: TippyInstance | null = null;

      function mentionListProps(props: SuggestionProps) {
        return {
          command: (item: MentionSuggestionItem) => {
            props.command(item);
          },
          contactsHasMore: options.getContactsHasMore(),
          currentPerson: options.getCurrentPerson() ?? null,
          onSearch: searchContactsPage,
          query: props.query,
          searchDebounceMs: DEBOUNCE_MS.search,
          seed: options.getSeed(),
        };
      }

      return {
        onExit: () => {
          popup?.destroy();
          reactRenderer?.destroy();
          popup = null;
          reactRenderer = null;
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === "Escape") {
            popup?.hide();
            return true;
          }

          return reactRenderer?.ref?.onKeyDown(props) ?? false;
        },
        onStart: (props: SuggestionProps) => {
          if (!props.clientRect) {
            return;
          }

          reactRenderer = new ReactRenderer(MentionList, {
            editor: props.editor,
            props: mentionListProps(props),
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

          reactRenderer.updateProps(mentionListProps(props));

          if (!popup || !props.clientRect) {
            return;
          }

          popup.setProps({
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          });
          popup.show();
        },
      };
    },
  };
}
