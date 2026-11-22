import sanitizeHtml, { type IOptions } from "sanitize-html";

/**
 * Contact notes are stored as HTML written by the Tiptap editor (web) or built from Markdown
 * (mobile, MCP, imports). The API never trusts that HTML: every write path runs it through
 * {@link sanitizeNotesHtml}, so the stored value only ever holds the tags below.
 *
 * Why the server and not only the client: the API is the trust boundary. Mobile, the Chrome
 * extension, API keys, MCP tools, the chat assistant, and ZIP imports all write notes without
 * going through the web editor, and any future consumer (email, export, share, a read-only view)
 * can render the value without an editor schema in between.
 *
 * Keep this list in step with the Tiptap extensions in
 * `apps/webapp/.../person/[personId]/hooks/usePersonNotesEditor.ts`. A tag or attribute missing
 * here is dropped on save, which shows up as formatting that does not survive a reload.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "mark",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "span",
  "div",
  "label",
  "input",
];

/** Opaque data attributes written by the person mention, inline date, emoji, and task nodes. */
const DATA_ATTRIBUTES = [
  "data-avatar",
  "data-checked",
  "data-color",
  "data-first-name",
  "data-headline",
  "data-id",
  "data-label",
  "data-last-name",
  "data-location",
  "data-mention-suggestion-char",
  "data-name",
  "data-timestamp",
  "data-type",
];

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const RGB_COLOR =
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;
const CSS_COLOR = [HEX_COLOR, RGB_COLOR];

/** Only these URL schemes survive. `javascript:`, `data:`, and `vbscript:` never match. */
const ABSOLUTE_LINK = /^(?:https?:\/\/|mailto:|tel:)/i;

const OPTIONS: IOptions = {
  allowedAttributes: {
    a: ["href", "rel", "target"],
    code: ["class"],
    input: ["type", "checked"],
    li: DATA_ATTRIBUTES,
    mark: ["style", ...DATA_ATTRIBUTES],
    span: ["style", ...DATA_ATTRIBUTES],
    ul: DATA_ATTRIBUTES,
  },
  allowedClasses: { code: ["language-*"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowedStyles: {
    mark: { "background-color": CSS_COLOR },
    span: { color: CSS_COLOR },
  },
  allowedTags: ALLOWED_TAGS,
  allowProtocolRelative: false,
  // Drop the tag and keep its text, except `script`, `style`, and `textarea`, whose body is
  // discarded by `nonTextTags` so a payload never survives as visible text.
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => {
      const href = (attribs["href"] ?? "").trim();
      const next: Record<string, string> = {
        rel: "noopener noreferrer",
        target: "_blank",
      };
      if (ABSOLUTE_LINK.test(href)) {
        next["href"] = href;
      }
      return { attribs: next, tagName };
    },
    input: (tagName, attribs) => {
      const next: Record<string, string> = { type: "checkbox" };
      if (attribs["checked"] !== undefined) {
        next["checked"] = "";
      }
      return { attribs: next, tagName };
    },
  },
};

/**
 * Reduce contact notes to the HTML dialect the notes editor produces.
 *
 * Idempotent: running it on its own output returns the same string. `null` and `undefined`
 * pass through so callers can use it on patch fields that clear or omit the value.
 *
 * @param notes - Notes HTML (or plain text) from any client.
 * @returns The sanitized HTML, `null`, or `undefined` as given.
 */
export function sanitizeNotesHtml(notes: string): string;
export function sanitizeNotesHtml(notes: string | null): string | null;
export function sanitizeNotesHtml(notes: string | null | undefined): string | null | undefined;
export function sanitizeNotesHtml(notes: string | null | undefined): string | null | undefined {
  if (notes === null || notes === undefined) {
    return notes;
  }
  return sanitizeHtml(notes, OPTIONS);
}
