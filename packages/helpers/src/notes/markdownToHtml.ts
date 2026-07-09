/**
 * Converts a Markdown string to Tiptap-compatible HTML.
 *
 * Handles: headings (h1–h3), bold, italic, strikethrough, inline code,
 * highlight (==...==), links ([text](url)), blockquotes, un/ordered lists,
 * task lists (- [ ] / - [x]), horizontal rules, and plain paragraphs.
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

  const inline = (text: string): string =>
    text
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
      .replace(/==(.+?)==/g, (_, a) => `<mark>${a}</mark>`)
      // inline code: `…`
      .replace(/`([^`]+)`/g, (_, a) => `<code>${a}</code>`)
      // bp tokens: [[bp:person:UUID]], [[bp:date:ISO]], etc.
      .replace(
        /\[\[bp:person:([^\]]+)\]\]/g,
        (_, id) => `<span data-type="mention" data-id="${id}" data-label="">@</span>`,
      )
      .replace(
        /\[\[bp:date:([^\]]+)\]\]/g,
        (_, ts) => `<span data-type="inline-date" data-timestamp="${ts}"></span>`,
      )
      // link: [text](url)
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_, t, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${t}</a>`,
      );

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      closeList();
      closeBlockquote();
      html += "<hr>";
      continue;
    }

    // ── Heading ──────────────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,3})\s*(.+)$/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      html += `<h${level}>${inline(headingMatch[2])}</h${level}>`;
      continue;
    }

    // ── Blockquote ───────────────────────────────────────────────────────────
    const bqMatch = line.match(/^>\s?(.*)$/);
    if (bqMatch) {
      if (listType) {
        closeList();
      }
      if (!inBlockquote) {
        html += "<blockquote>";
        inBlockquote = true;
      }
      html += `<p>${inline(bqMatch[1])}</p>`;
      continue;
    }
    closeBlockquote();

    // ── Task list ─────────────────────────────────────────────────────────────
    const taskMatch = line.match(/^[-*]\s*\[([\s\t]*[xX]?[\s\t]*)\]\s*(.*)$/);
    if (taskMatch) {
      if (listType !== "taskList") {
        if (listType) {
          closeList();
        }
        html += `<ul data-type="taskList">`;
        listType = "taskList";
      }
      const checked = /[xX]/.test(taskMatch[1]);
      const taskContent = taskMatch[2].trim();
      html +=
        `<li data-type="taskItem" data-checked="${checked}">` +
        `<label><input type="checkbox"${checked ? " checked" : ""}></label>` +
        `<div><p>${inline(taskContent)}</p></div></li>`;
      continue;
    }

    // ── Unordered list ───────────────────────────────────────────────────────
    const ulMatch = line.match(/^[-*+]\s*(.+)$/);
    if (ulMatch) {
      if (listType !== "ul") {
        if (listType) {
          closeList();
        }
        html += "<ul>";
        listType = "ul";
      }
      html += `<li><p>${inline(ulMatch[1])}</p></li>`;
      continue;
    }

    // ── Ordered list ─────────────────────────────────────────────────────────
    const olMatch = line.match(/^\d+\. (.+)$/);
    if (olMatch) {
      if (listType !== "ol") {
        if (listType) {
          closeList();
        }
        html += "<ol>";
        listType = "ol";
      }
      html += `<li><p>${inline(olMatch[1])}</p></li>`;
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
