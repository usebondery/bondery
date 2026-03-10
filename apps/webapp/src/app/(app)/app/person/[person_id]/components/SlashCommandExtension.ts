import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { SlashCommandItem } from "./SlashCommandList";

/**
 * Tiptap extension that opens a slash command menu when the user types `/`.
 * The selected command's `action` is invoked on the editor, then the
 * triggering `/query` text is deleted.
 */
export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: { chain: () => unknown; commands: Record<string, unknown> };
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          // Delete the `/query` text, then run the command action
          (
            editor.chain() as {
              focus: () => {
                deleteRange: (r: { from: number; to: number }) => { run: () => void };
              };
            }
          )
            .focus()
            .deleteRange(range)
            .run();

          props.action(editor);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
