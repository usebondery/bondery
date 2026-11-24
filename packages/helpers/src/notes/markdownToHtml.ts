const PATTERN_5E40_RE = /^@/;
const PATTERN_5E282D2D2D2B_RE = /^(---+|\*\*\*+|___+)$/;
const PATTERN_5E28237B312C_RE = /^(#{1,3})\s*(.+)$/;
const PATTERN_5E3E5C733F28_RE = /^>\s?(.*)$/;
const XX_RE_2 = /^[-*]\s*\[([\s\t]*[xX]?[\s\t]*)\]\s*(.*)$/;
const XX_RE = /[xX]/;
const PATTERN_5E5B2D2A2B5D_RE = /^[-*+]\s*(.+)$/;
const PATTERN_5E5C642B5C2E_RE = /^\d+\. (.+)$/;

const HTML_ESCAPES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

/** Escape text so it can sit in element content or a double-quoted attribute. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Link targets a note may hold. Anything else renders as plain text, never as an `href`. */
const SAFE_LINK_URL = /^(?:https?:\/\/|mailto:|tel:)/i;

/**
 * Converts a Markdown string to Tiptap-compatible HTML.
 *
 * Handles: headings (h1–h3), bold, italic, strikethrough, inline code,
 * highlight (==...==), links ([text](url)), person mentions
 * (`[@Name](bp://person/ID)` and `[[bp:person:ID]]`), blockquotes, un/ordered lists,
 * task lists (- [ ] / - [x]), horizontal rules, and plain paragraphs.
 *
 * Security: Markdown input is text, not HTML. Every character that could open a tag or leave an
 * attribute (`& < > " '`) is escaped before any Markdown rule runs, so `<script>` and
 * `<img onerror=…>` come out as visible text. Links keep only `http(s):`, `mailto:`, and `tel:`
 * targets; `javascript:` and `data:` links render as plain text. The one raw-HTML exception is
 * `<u>…</u>`, which `htmlToMarkdown` emits for underline. The API sanitizes again on write
 * (`apps/api/src/lib/notes/sanitize-notes-html.ts`); this function must not rely on that.
 *
 * Cross-platform: works in React Native, Node.js, and browsers.
 *
 * @param markdown - Raw markdown string
 * @returns HTML string ready for TipTap or API storage
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) {
    return "";
  }

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let listType: "ul" | "ol" | "taskList" | null = null;
  let inBlockquote = false;

  const closeList = () => {
    if (listType === "ol") {
      html += "</ol>";
    } else if (listType === "ul" || listType === "taskList") {
      html += "</ul>";
    }
    listType = null;
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      html += "</blockquote>";
      inBlockquote = false;
    }
  };

  const inline = (rawText: string): string =>
    escapeHtml(rawText)
      // bold: **…** or __…__
      .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
      // italic: *…* or _…_ (not touching bold markers)
      .replace(
        /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g,
        (_, a, b) => `<em>${a ?? b}</em>`,
      )
      // strikethrough: ~~…~~
      .replace(/~~(.+?)~~/g, (_, a) => `<s>${a}</s>`)
      // highlight: ==…==
      .replace(/[=]=(.+?)==/g, (_, a) => `<mark>${a}</mark>`)
      // inline code: `…`
      .replace(/`([^`]+)`/g, (_, a) => `<code>${a}</code>`)
      // Person mention links must run before generic markdown links.
      .replace(/\[(@[^\]]*)\]\(bp:\/\/person\/([^)]+)\)/g, (_, rawLabel: string, id: string) => {
        const label = rawLabel.replace(PATTERN_5E40_RE, "").trim();
        const text = label.length > 0 ? `@${label}` : "@";
        return `<span data-type="mention" data-id="${id}" data-label="${label}">${text}</span>`;
      })
      // bp tokens: [[bp:person:UUID]], [[bp:date:ISO]], etc.
      .replace(
        /\[\[bp:person:([^\]]+)\]\]/g,
        (_, id) => `<span data-type="mention" data-id="${id}" data-label="">@</span>`,
      )
      .replace(
        /\[\[bp:date:([^\]]+)\]\]/g,
        (_, ts) => `<span data-type="inline-date" data-timestamp="${ts}"></span>`,
      )
      // link: [text](url). A target outside the allowlist keeps its text and loses the link.
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t: string, url: string) =>
        SAFE_LINK_URL.test(url.trim())
          ? `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer">${t}</a>`
          : t,
      )
      // underline: the only raw tag htmlToMarkdown writes (it has no Markdown syntax)
      .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, (_, a) => `<u>${a}</u>`);

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (PATTERN_5E282D2D2D2B_RE.test(trimmed)) {
      closeList();
      closeBlockquote();
      html += "<hr>";
      continue;
    }

    // ── Heading ──────────────────────────────────────────────────────────────
    const headingMatch = line.match(PATTERN_5E28237B312C_RE);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      const level = (headingMatch[1] ?? "").length;
      html += `<h${level}>${inline(headingMatch[2] ?? "")}</h${level}>`;
      continue;
    }

    // ── Blockquote ───────────────────────────────────────────────────────────
    const bqMatch = line.match(PATTERN_5E3E5C733F28_RE);
    if (bqMatch) {
      if (listType) {
        closeList();
      }
      if (!inBlockquote) {
        html += "<blockquote>";
        inBlockquote = true;
      }
      html += `<p>${inline(bqMatch[1] ?? "")}</p>`;
      continue;
    }
    closeBlockquote();

    // ── Task list ─────────────────────────────────────────────────────────────
    const taskMatch = line.match(XX_RE_2);
    if (taskMatch) {
      if (listType !== "taskList") {
        if (listType) {
          closeList();
        }
        html += `<ul data-type="taskList">`;
        listType = "taskList";
      }
      const checked = XX_RE.test(taskMatch[1] ?? "");
      const taskContent = (taskMatch[2] ?? "").trim();
      html +=
        `<li data-type="taskItem" data-checked="${checked}">` +
        `<label><input type="checkbox"${checked ? " checked" : ""}></label>` +
        `<div><p>${inline(taskContent)}</p></div></li>`;
      continue;
    }

    // ── Unordered list ───────────────────────────────────────────────────────
    const ulMatch = line.match(PATTERN_5E5B2D2A2B5D_RE);
    if (ulMatch) {
      if (listType !== "ul") {
        if (listType) {
          closeList();
        }
        html += "<ul>";
        listType = "ul";
      }
      html += `<li><p>${inline(ulMatch[1] ?? "")}</p></li>`;
      continue;
    }

    // ── Ordered list ─────────────────────────────────────────────────────────
    const olMatch = line.match(PATTERN_5E5C642B5C2E_RE);
    if (olMatch) {
      if (listType !== "ol") {
        if (listType) {
          closeList();
        }
        html += "<ol>";
        listType = "ol";
      }
      html += `<li><p>${inline(olMatch[1] ?? "")}</p></li>`;
      continue;
    }

    // ── Empty line ────────────────────────────────────────────────────────────
    if (trimmed === "") {
      closeList();
      closeBlockquote();
      html += "<p></p>";
      continue;
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    closeList();
    html += `<p>${inline(line)}</p>`;
  }

  closeList();
  closeBlockquote();

  return html;
}
