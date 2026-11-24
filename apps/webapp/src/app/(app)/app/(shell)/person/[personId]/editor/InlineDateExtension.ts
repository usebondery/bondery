import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InlineDateDisplay } from "../components/notes/InlineDateDisplay";

type InlineDateAttrs = {
  timestamp?: string;
};

/**
 * Tiptap inline atom node that stores a timestamp and renders it as a formatted date badge.
 * Serialises to/from <span data-type="inline-date" data-timestamp="..."> in HTML.
 */
export const InlineDateExtension = Node.create({
  addAttributes() {
    return {
      timestamp: {
        default: new Date().toISOString(),
        parseHTML: (element) => element.getAttribute("data-timestamp"),
        renderHTML: (attributes) => ({
          "data-timestamp": (attributes as InlineDateAttrs).timestamp ?? "",
        }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineDateDisplay);
  },
  atom: true,
  group: "inline",
  inline: true,
  name: "inlineDate",

  parseHTML() {
    return [
      {
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return el.getAttribute("data-type") === "inline-date" ? null : false;
        },
        tag: "span",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": "inline-date" }, HTMLAttributes)];
  },
});
