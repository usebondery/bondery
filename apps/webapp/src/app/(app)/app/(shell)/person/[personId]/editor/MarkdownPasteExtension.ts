import { Extension } from "@tiptap/core";
import { markdownToHtml } from "./markdownToHtml";

/** Patterns that suggest the pasted text is Markdown. */
const MARKDOWN_SIGNALS: RegExp[] = [
  /^#{1,6}\s?\S/mu, // headings — with or without space after #
  /\*\*[^*]+\*\*/u, // bold
  /~~[^~]+~~/u, // strikethrough
  /^[-*+]\s?\S/mu, // bullet list — with or without space after -
  /^\d+\.\s/mu, // ordered list
  /^>\s?\S/mu, // blockquote
  /^-\s?\[\s?[\sxX]?\s?\]\s?/mu, // task list (lenient)
  /\[.+\]\(.+\)/u, // link
  /`[^`]+`/u, // inline code
  /[=]=.+==/u, // highlight
];

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_SIGNALS.some((re) => re.test(text));
}

/**
 * Tiptap extension that converts pasted Markdown to formatted content.
 *
 * Attaches a native DOM paste listener in the **capture phase** on the
 * editor element. This fires before ProseMirror ever sees the event.
 * The handler calls stopImmediatePropagation + preventDefault to kill the
 * event entirely, then uses setTimeout to insert the converted HTML in a
 * clean execution context — no dispatch-during-dispatch conflicts.
 */
export const MarkdownPasteExtension = Extension.create({
  addStorage() {
    return { pasteHandler: null as ((e: Event) => void) | null };
  },
  name: "markdownPaste",

  onCreate() {
    // biome-ignore lint/nursery/noThisOutsideOfClass: TipTap binds `this` to the extension context in lifecycle hooks
    const { editor, storage } = this;

    const handler = (e: Event) => {
      const event = e as ClipboardEvent;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text || !looksLikeMarkdown(text)) {
        return;
      }

      const html = markdownToHtml(text);
      if (!html) {
        return;
      }

      // Kill the event before ProseMirror's own listener can see it
      event.stopImmediatePropagation();
      event.preventDefault();

      // Insert in a clean macrotask — completely outside the paste cycle
      setTimeout(() => {
        editor.commands.insertContent(html);
      }, 0);
    };

    storage.pasteHandler = handler;
    editor.view.dom.addEventListener("paste", handler, true);
  },

  onDestroy() {
    // biome-ignore lint/nursery/noThisOutsideOfClass: TipTap binds `this` to the extension context in lifecycle hooks
    const { editor, storage } = this;
    const handler = storage.pasteHandler;
    if (handler) {
      editor.view.dom.removeEventListener("paste", handler, true);
      storage.pasteHandler = null;
    }
  },
});
