import { mergeAttributes } from "@tiptap/core";
import Mention, { type MentionOptions } from "@tiptap/extension-mention";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MentionNodeView } from "../components/notes/MentionNodeView";

function optionalDataAttr(name: string, value: unknown): Record<string, string> {
  if (typeof value !== "string" || value.length === 0) {
    return {};
  }
  return { [name]: value };
}

function mentionLabelFromElement(element: HTMLElement): string | null {
  const fromAttr = element.getAttribute("data-label")?.trim();
  if (fromAttr) {
    return fromAttr;
  }
  const text = element.textContent?.replace(/^@/, "").trim();
  return text || null;
}

/** TipTap Mention with PersonChip NodeView and HTML attrs that survive getHTML/setContent. */
export function createPersonMentionExtension(suggestion: MentionOptions["suggestion"]) {
  return Mention.extend({
    addAttributes() {
      return {
        avatar: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-avatar"),
          renderHTML: (attributes) => optionalDataAttr("data-avatar", attributes.avatar),
        },
        firstName: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-first-name"),
          renderHTML: (attributes) => optionalDataAttr("data-first-name", attributes.firstName),
        },
        headline: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-headline"),
          renderHTML: (attributes) => optionalDataAttr("data-headline", attributes.headline),
        },
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-id"),
          renderHTML: (attributes) => optionalDataAttr("data-id", attributes.id),
        },
        label: {
          default: null,
          parseHTML: mentionLabelFromElement,
          renderHTML: (attributes) => optionalDataAttr("data-label", attributes.label),
        },
        lastName: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-last-name"),
          renderHTML: (attributes) => optionalDataAttr("data-last-name", attributes.lastName),
        },
        location: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-location"),
          renderHTML: (attributes) => optionalDataAttr("data-location", attributes.location),
        },
        mentionSuggestionChar: {
          default: "@",
          parseHTML: (element) => element.getAttribute("data-mention-suggestion-char") || "@",
          renderHTML: (attributes) => ({
            "data-mention-suggestion-char": attributes.mentionSuggestionChar ?? "@",
          }),
        },
      };
    },
    addNodeView() {
      return ReactNodeViewRenderer(MentionNodeView);
    },
    renderHTML({ node, HTMLAttributes }) {
      const label = node.attrs.label || node.attrs.id || "";
      const char = node.attrs.mentionSuggestionChar || "@";
      return [
        "span",
        mergeAttributes({ "data-type": "mention" }, HTMLAttributes),
        `${char}${label}`,
      ];
    },
  }).configure({ suggestion });
}
