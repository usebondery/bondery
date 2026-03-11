import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InlineDateDisplay } from "./InlineDateDisplay";

/**
 * Tiptap inline atom node that stores a timestamp and renders it as a formatted date badge.
 * Serialises to/from <span data-type="inline-date" data-timestamp="..."> in HTML.
 */
export const InlineDateExtension = Node.create({
  name: "inlineDate",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      timestamp: {
        default: new Date().toISOString(),
        parseHTML: (element) => element.getAttribute("data-timestamp"),
        renderHTML: (attributes) => ({
          "data-timestamp": attributes.timestamp as string,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return el.getAttribute("data-type") === "inline-date" ? null : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-type": "inline-date" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineDateDisplay);
  },
});
