/**
 * Converts Tiptap-serialized HTML to a Markdown string.
 *
 * Regex-based implementation: compatible with React Native, Node.js, and browsers
 * (no DOMParser dependency).
 *
 * Handles the full set of marks/nodes used by the notes editor:
 * headings (h1-h3), paragraphs, bold, italic, underline, strikethrough,
 * highlights, inline code, links, ordered + unordered + task lists,
 * blockquotes, horizontal rules, line breaks, and @mention spans
 * (`[@Name](bp://person/ID)` when a label is present).
 *
 * Entity references use the unified `[[bp:type:id]]` wire format.
 *
 * @param html - Raw HTML string from editor.getHTML()
 * @returns Markdown string
 */
const DATA_CHECKED_RE = /data-checked="(?<group1>[^"]*)"/u;
const TRUE_RE = /^(?<group1>true|1)$/iu;
const DATA_ID_RE = /data-id="(?<group1>[^"]*)"/u;
const DATA_LABEL_RE = /data-label="(?<group1>[^"]*)"/u;
const PATTERN_5E40_RE = /^@/u;

const HTML_ENTITIES: Record<string, string> = {
  "&#39;": "'",
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
};

/** One pass, so `&amp;lt;` becomes `&lt;` and not `<`. */
function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#39|amp|gt|lt|nbsp|quot);/gu,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/gu, "");
}

function mentionSpanToMarkdown(span: string): string {
  const id = span.match(DATA_ID_RE)?.[1];
  if (!id) {
    return "";
  }
  const labelAttr = span.match(DATA_LABEL_RE)?.[1]?.trim();
  const inner = stripTags(span).replace(PATTERN_5E40_RE, "").trim();
  const label = labelAttr || inner;
  if (!label) {
    return `[[bp:person:${id}]]`;
  }
  return `[@${label.replace(/\]/gu, "")}](bp://person/${id})`;
}

export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") {
    return "";
  }

  let md = html;

  // @mention spans → named mobile link when the label survived, else [[bp:person:ID]]
  md = md.replace(/<span[^>]*data-type="mention"[^>]*>.*?<\/span>/gsu, (span) =>
    mentionSpanToMarkdown(span),
  );

  // Inline date spans → [[bp:date:TIMESTAMP]]
  md = md.replace(
    /<span[^>]*data-type="inline-date"[^>]*data-timestamp="(?<group1>[^"]*)"[^>]*>.*?<\/span>/gsu,
    (_, ts) => (ts ? `[[bp:date:${ts}]]` : ""),
  );

  // Colour spans — preserve as HTML for round-trips
  md = md.replace(
    /<span[^>]*style="(?<group1>[^"]*)"[^>]*>(?<group2>.*?)<\/span>/gsu,
    (_, style, inner) => `<span style="${style}">${inner}</span>`,
  );

  // Remaining generic spans — unwrap
  md = md.replace(/<span[^>]*>(?<group1>.*?)<\/span>/gsu, "$1");

  // Headings
  md = md.replace(/<h1[^>]*>(?<group1>.*?)<\/h1>/gsu, (_, c) => `# ${stripTags(c)}\n\n`);
  md = md.replace(/<h2[^>]*>(?<group1>.*?)<\/h2>/gsu, (_, c) => `## ${stripTags(c)}\n\n`);
  md = md.replace(/<h3[^>]*>(?<group1>.*?)<\/h3>/gsu, (_, c) => `### ${stripTags(c)}\n\n`);

  // Marks (order matters: bold before italic to avoid partial matches)
  md = md.replace(/<strong[^>]*>(?<group1>.*?)<\/strong>/gsu, "**$1**");
  md = md.replace(/<b[^>]*>(?<group1>.*?)<\/b>/gsu, "**$1**");
  md = md.replace(/<em[^>]*>(?<group1>.*?)<\/em>/gsu, "_$1_");
  md = md.replace(/<i[^>]*>(?<group1>.*?)<\/i>/gsu, "_$1_");
  md = md.replace(/<s[^>]*>(?<group1>.*?)<\/s>/gsu, "~~$1~~");
  md = md.replace(/<u[^>]*>(?<group1>.*?)<\/u>/gsu, "<u>$1</u>"); // keep as HTML
  md = md.replace(/<mark[^>]*>(?<group1>.*?)<\/mark>/gsu, "==$1==");
  md = md.replace(/<code[^>]*>(?<group1>.*?)<\/code>/gsu, "`$1`");

  // Links
  md = md.replace(/<a[^>]*href="(?<group1>[^"]*)"[^>]*>(?<group2>.*?)<\/a>/gsu, "[$2]($1)");

  // Task lists (process before generic ul)
  md = md.replace(/<ul[^>]*data-type="taskList"[^>]*>(?<group1>.*?)<\/ul>/gsu, (_, body) => {
    const items =
      body.match(/<li[^>]*data-checked="(?<group1>[^"]*)"[^>]*>(?<group2>.*?)<\/li>/gsu) ?? [];
    const rows = items.map((item: string) => {
      const checkedMatch = item.match(DATA_CHECKED_RE);
      const checked = checkedMatch ? TRUE_RE.test(checkedMatch[1] ?? "") : false;
      const content = stripTags(item.replace(/<li[^>]*>|<\/li>/gu, "")).trim();
      return `- [${checked ? "x" : " "}] ${content}`;
    });
    return `${rows.join("\n")}\n\n`;
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>(?<group1>.*?)<\/ol>/gsu, (_, body) => {
    const items = body.match(/<li[^>]*>(?<group1>.*?)<\/li>/gsu) ?? [];
    const rows = items.map((item: string, i: number) => {
      const content = stripTags(item.replace(/<li[^>]*>|<\/li>/gu, "")).trim();
      return `${i + 1}. ${content}`;
    });
    return `${rows.join("\n")}\n\n`;
  });

  // Unordered lists
  md = md.replace(/<ul[^>]*>(?<group1>.*?)<\/ul>/gsu, (_, body) => {
    const items = body.match(/<li[^>]*>(?<group1>.*?)<\/li>/gsu) ?? [];
    const rows = items.map((item: string) => {
      const content = stripTags(item.replace(/<li[^>]*>|<\/li>/gu, "")).trim();
      return `- ${content}`;
    });
    return `${rows.join("\n")}\n\n`;
  });

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(?<group1>.*?)<\/blockquote>/gsu, (_, inner) => {
    const text = stripTags(inner).trim();
    return `${text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}\n\n`;
  });

  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gu, "---\n\n");

  // Line breaks
  md = md.replace(/<br[^>]*\/?>/gu, "\n");

  // Paragraphs
  md = md.replace(/<p[^>]*>(?<group1>.*?)<\/p>/gsu, (_, c) => {
    const content = c.trim();
    return content ? `${content}\n\n` : "";
  });

  // Strip any remaining tags
  md = stripTags(md);

  // Normalise excess blank lines, then turn entities back into the characters they stand for.
  // Last, after every tag is gone: `markdownToHtml` escapes `& < > " '` on the way back in, so
  // leaving `&lt;` here would come back as the literal text `&lt;`.
  return decodeEntities(md.replace(/\n{3,}/gu, "\n\n").trim());
}
