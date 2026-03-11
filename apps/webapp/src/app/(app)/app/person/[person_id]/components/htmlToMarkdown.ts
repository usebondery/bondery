/**
 * Converts Tiptap-serialized HTML to a readable Markdown string.
 *
 * Handles the full set of marks/nodes used by the notes editor:
 * headings (h1-h3), paragraphs, bold, italic, underline, strikethrough,
 * highlights, inline code, links, ordered + unordered + task lists,
 * blockquotes, horizontal rules, line breaks, and @mention spans.
 *
 * Runs client-side only (uses DOMParser). Returns an empty string on the server.
 *
 * @param html - Raw HTML string from editor.getHTML()
 * @param options.formatDate - Optional locale-aware date formatter for inline-date nodes
 * @returns Markdown string representation
 */
export function htmlToMarkdown(
  html: string,
  options?: { formatDate?: (date: Date) => string },
): string {
  if (typeof window === "undefined") return "";
  if (!html || html === "<p></p>") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return nodeToMarkdown(doc.body, options?.formatDate)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nodeToMarkdown(node: Node, formatDate?: (d: Date) => string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = () =>
    Array.from(el.childNodes)
      .map((n) => nodeToMarkdown(n, formatDate))
      .join("");

  // @mention span — serialised by Tiptap with data-type="mention" and data-label
  if (tag === "span" && el.getAttribute("data-type") === "mention") {
    const label = el.getAttribute("data-label") ?? el.textContent ?? "";
    const id = el.getAttribute("data-id") ?? "";
    return `[@${label}](${id})`;
  }

  // Inline date node — serialised as a locale-aware date string
  if (tag === "span" && el.getAttribute("data-type") === "inline-date") {
    const ts = el.getAttribute("data-timestamp") ?? "";
    if (ts) {
      const d = new Date(ts);
      if (formatDate) return formatDate(d);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}/${dd}/${d.getFullYear()}`;
    }
    return el.textContent ?? "";
  }

  switch (tag) {
    case "h1":
      return `# ${children()}\n\n`;
    case "h2":
      return `## ${children()}\n\n`;
    case "h3":
      return `### ${children()}\n\n`;

    case "p": {
      const c = children();
      return c.trim() ? `${c}\n\n` : "";
    }

    case "strong":
    case "b":
      return `**${children()}**`;
    case "em":
    case "i":
      return `_${children()}_`;
    case "s":
      return `~~${children()}~~`;
    case "u":
      return `<u>${children()}</u>`;
    case "mark":
      return `==${children()}==`;
    case "code":
      return `\`${children()}\``;

    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[${children()}](${href})`;
    }

    case "ul": {
      const isTaskList = el.getAttribute("data-type") === "taskList";
      const rows = Array.from(el.children)
        .map((li) => {
          const liContent = Array.from(li.childNodes)
            .map((n) => nodeToMarkdown(n, formatDate))
            .join("")
            .trim();
          if (isTaskList) {
            const checked = li.getAttribute("data-checked") === "true";
            return `- [${checked ? "x" : " "}] ${liContent}`;
          }

          return `- ${liContent}`;
        })
        .join("\n");
      return `${rows}\n\n`;
    }

    case "ol": {
      const rows = Array.from(el.children)
        .map((li, i) => {
          const liContent = Array.from(li.childNodes)
            .map((n) => nodeToMarkdown(n, formatDate))
            .join("")
            .trim();
          return `${i + 1}. ${liContent}`;
        })
        .join("\n");
      return `${rows}\n\n`;
    }

    case "li":
      return children();

    case "blockquote": {
      const inner = children().trim();
      return `${inner
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}\n\n`;
    }

    case "hr":
      return `---\n\n`;

    case "br":
      return "\n";

    case "span": {
      const style = (el as HTMLElement).getAttribute("style");
      if (style) {
        // Colour span — preserve as HTML so colour survives round-trips
        return `<span style="${style}">${children()}</span>`;
      }
      return children();
    }

    case "body":
    default:
      return children();
  }
}
