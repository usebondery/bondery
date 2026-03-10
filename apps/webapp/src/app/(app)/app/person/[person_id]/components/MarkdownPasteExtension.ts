import { Extension } from "@tiptap/core";
import { markdownToHtml } from "./markdownToHtml";

/** Patterns that suggest the pasted text is Markdown. */
const MARKDOWN_SIGNALS: RegExp[] = [
  /^#{1,6}\s?\S/m, // headings — with or without space after #
  /\*\*[^*]+\*\*/, // bold
  /~~[^~]+~~/, // strikethrough
  /^[-*+]\s?\S/m, // bullet list — with or without space after -
  /^\d+\.\s/m, // ordered list
  /^>\s?\S/m, // blockquote
  /^-\s?\[\s?[\sxX]?\s?\]\s?/m, // task list (lenient)
  /\[.+\]\(.+\)/, // link
  /`[^`]+`/, // inline code
  /==.+==/, // highlight
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
  name: "markdownPaste",

  addStorage() {
    return { pasteHandler: null as ((e: Event) => void) | null };
  },

  onCreate() {
    const { editor } = this;

    const handler = (e: Event) => {
      const event = e as ClipboardEvent;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text || !looksLikeMarkdown(text)) return;

      const html = markdownToHtml(text);
      if (!html) return;

      // Kill the event before ProseMirror's own listener can see it
      event.stopImmediatePropagation();
      event.preventDefault();

      // Insert in a clean macrotask — completely outside the paste cycle
      setTimeout(() => {
        editor.commands.insertContent(html);
      }, 0);
    };

    this.storage.pasteHandler = handler;
    editor.view.dom.addEventListener("paste", handler, true);
  },

  onDestroy() {
    const handler = this.storage.pasteHandler;
    if (handler) {
      this.editor.view.dom.removeEventListener("paste", handler, true);
      this.storage.pasteHandler = null;
    }
  },
});
