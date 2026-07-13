/**
 * Converts Tiptap-serialized HTML to a Markdown string.
 *
 * Regex-based implementation: compatible with React Native, Node.js, and browsers
 * (no DOMParser dependency).
 *
 * Handles the full set of marks/nodes used by the notes editor:
 * headings (h1-h3), paragraphs, bold, italic, underline, strikethrough,
 * highlights, inline code, links, ordered + unordered + task lists,
 * blockquotes, horizontal rules, line breaks, and @mention spans.
 *
 * Entity references use the unified `[[bp:type:id]]` wire format.
 *
 * @param html - Raw HTML string from editor.getHTML()
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") {
    return "";
  }

  let md = html;

  // @mention spans → [[bp:person:ID]]
  md = md.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]*)"[^>]*>.*?<\/span>/gs,
    (_, id) => `[[bp:person:${id}]]`,
  );

  // Inline date spans → [[bp:date:TIMESTAMP]]
  md = md.replace(
    /<span[^>]*data-type="inline-date"[^>]*data-timestamp="([^"]*)"[^>]*>.*?<\/span>/gs,
    (_, ts) => (ts ? `[[bp:date:${ts}]]` : ""),
  );

  // Colour spans — preserve as HTML for round-trips
  md = md.replace(
    /<span[^>]*style="([^"]*)"[^>]*>(.*?)<\/span>/gs,
    (_, style, inner) => `<span style="${style}">${inner}</span>`,
  );

  // Remaining generic spans — unwrap
  md = md.replace(/<span[^>]*>(.*?)<\/span>/gs, "$1");

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gs, (_, c) => `# ${stripTags(c)}\n\n`);
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gs, (_, c) => `## ${stripTags(c)}\n\n`);
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gs, (_, c) => `### ${stripTags(c)}\n\n`);

  // Marks (order matters: bold before italic to avoid partial matches)
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gs, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gs, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gs, "_$1_");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gs, "_$1_");
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gs, "~~$1~~");
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gs, "<u>$1</u>"); // keep as HTML
  md = md.replace(/<mark[^>]*>(.*?)<\/mark>/gs, "==$1==");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gs, "`$1`");

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs, "[$2]($1)");

  // Task lists (process before generic ul)
  md = md.replace(/<ul[^>]*data-type="taskList"[^>]*>(.*?)<\/ul>/gs, (_, body) => {
    const items = body.match(/<li[^>]*data-checked="([^"]*)"[^>]*>(.*?)<\/li>/gs) ?? [];
    const rows = items.map((item: string) => {
      const checkedMatch = item.match(/data-checked="([^"]*)"/);
      const checked = checkedMatch ? /^(true|1)$/i.test(checkedMatch[1]) : false;
      const content = stripTags(item.replace(/<li[^>]*>|<\/li>/g, "")).trim();
      return `- [${checked ? "x" : " "}] ${content}`;
    });
    return `${rows.join("\n")}\n\n`;
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (_, body) => {
    const items = body.match(/<li[^>]*>(.*?)<\/li>/gs) ?? [];
    const rows = items.map((item: string, i: number) => {
      const content = stripTags(item.replace(/<li[^>]*>|<\/li>/g, "")).trim();
      return `${i + 1}. ${content}`;
    });
    return `${rows.join("\n")}\n\n`;
  });

  // Unordered lists
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, body) => {
    const items = body.match(/<li[^>]*>(.*?)<\/li>/gs) ?? [];
    const rows = items.map((item: string) => {
      const content = stripTags(item.replace(/<li[^>]*>|<\/li>/g, "")).trim();
      return `- ${content}`;
    });
    return `${rows.join("\n")}\n\n`;
  });

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (_, inner) => {
    const text = stripTags(inner).trim();
    return `${text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}\n\n`;
  });

  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/g, "---\n\n");

  // Line breaks
  md = md.replace(/<br[^>]*\/?>/g, "\n");

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gs, (_, c) => {
    const content = c.trim();
    return content ? `${content}\n\n` : "";
  });

  // Strip any remaining tags
  md = stripTags(md);

  // Normalise excess blank lines
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
