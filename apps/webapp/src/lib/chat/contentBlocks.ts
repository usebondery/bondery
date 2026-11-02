export type ContentBlock =
  | { kind: "text"; content: string }
  | { kind: "list"; listType: "ordered" | "unordered"; items: string[] };

export const ORDERED_RE = /^\d+\.\s+(.*)/;
export const UNORDERED_RE = /^[-*]\s+(.*)/;

/**
 * Splits raw text into blocks of plain text and markdown-style lists.
 * Consecutive list lines of the same type are grouped.
 */
export function parseContentBlocks(text: string): ContentBlock[] {
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let textBuffer: string[] = [];
  let currentList: { listType: "ordered" | "unordered"; items: string[] } | null = null;

  const flushText = () => {
    if (textBuffer.length > 0) {
      blocks.push({ content: textBuffer.join("\n"), kind: "text" });
      textBuffer = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push({ kind: "list", ...currentList });
      currentList = null;
    }
  };

  for (const line of lines) {
    const orderedMatch = line.match(ORDERED_RE);
    const unorderedMatch = !orderedMatch ? line.match(UNORDERED_RE) : null;

    if (orderedMatch || unorderedMatch) {
      flushText();
      const listType = orderedMatch ? "ordered" : "unordered";
      const match = orderedMatch ?? unorderedMatch;
      if (!match) {
        continue;
      }
      const itemContent = match[1];

      if (currentList && currentList.listType === listType) {
        currentList.items.push(itemContent);
      } else {
        flushList();
        currentList = { items: [itemContent], listType };
      }
    } else {
      flushList();
      textBuffer.push(line);
    }
  }
  flushList();
  flushText();
  return blocks;
}
