/**
 * Unified inline token format for the Bondery app.
 *
 * Wire format: `[[bp:type:value]]`
 * Examples:
 *   [[bp:person:UUID]]
 *   [[bp:interaction:UUID]]
 *   [[bp:group:UUID]]
 *   [[bp:tag:UUID]]
 *   [[bp:date:2025-04-08T00:00:00.000Z]]
 *
 * External links remain standard markdown: [label](https://...)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InlineTokenType = "person" | "interaction" | "group" | "tag" | "date" | "action";

export type InlineToken =
  | { type: "person"; id: string }
  | { type: "interaction"; id: string }
  | { type: "group"; id: string }
  | { type: "tag"; id: string }
  | { type: "date"; iso: string }
  | { type: "action"; name: string; id: string }
  | { type: "link"; href: string; label: string }
  | { type: "text"; value: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches `[[bp:type:value]]` tokens. */
export const BP_TOKEN_RE = /\[\[bp:(\w+):([^\]]+)\]\]/g;

/** Matches standard markdown links `[label](url)`. */
const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** Combined regex that matches both bp tokens and markdown links. */
const COMBINED_RE = new RegExp(`${BP_TOKEN_RE.source}|${MD_LINK_RE.source}`, "g");

/** Valid bp token types. */
const VALID_TYPES = new Set<InlineTokenType>([
  "person",
  "interaction",
  "group",
  "tag",
  "date",
  "action",
]);

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses a text string into an array of inline tokens.
 *
 * Recognises two patterns:
 * - `[[bp:type:value]]` → app entity tokens
 * - `[label](https://...)` → external links
 *
 * Everything else becomes a `text` token.
 *
 * @param text - Raw text (e.g. from LLM output or stored markdown)
 * @returns Ordered array of inline tokens
 */
export function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = new RegExp(COMBINED_RE.source, "g");
  let lastIndex = 0;

  for (const match of text.matchAll(re)) {
    const idx = match.index!;

    // Push preceding plain text
    if (idx > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, idx) });
    }

    const [fullMatch, bpType, bpValue, linkLabel, linkUrl] = match;

    if (bpType !== undefined && bpValue !== undefined) {
      // [[bp:type:value]]
      const token = bpTokenToInlineToken(bpType, bpValue);
      tokens.push(token);
    } else if (linkLabel !== undefined && linkUrl !== undefined) {
      // [label](https://...)
      tokens.push({ type: "link", href: linkUrl, label: linkLabel });
    }

    lastIndex = idx + fullMatch.length;
  }

  // Push trailing plain text
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Converts a bp token type + value into a typed InlineToken.
 */
function bpTokenToInlineToken(rawType: string, value: string): InlineToken {
  const tokenType = rawType as InlineTokenType;

  if (!VALID_TYPES.has(tokenType)) {
    // Unknown type — treat as plain text so nothing is silently lost
    return { type: "text", value: `[[bp:${rawType}:${value}]]` };
  }

  switch (tokenType) {
    case "person":
      return { type: "person", id: value };
    case "interaction":
      return { type: "interaction", id: value };
    case "group":
      return { type: "group", id: value };
    case "tag":
      return { type: "tag", id: value };
    case "date":
      return { type: "date", iso: value };
    case "action": {
      const pipeIdx = value.indexOf("|");
      const name = pipeIdx === -1 ? value : value.slice(0, pipeIdx);
      const id = pipeIdx === -1 ? "" : value.slice(pipeIdx + 1);
      return { type: "action", name, id };
    }
  }
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serializes an InlineToken back to its wire format string.
 *
 * @param token - The token to serialize
 * @returns Wire-format string (e.g. `[[bp:person:UUID]]`)
 */
export function tokenToString(token: InlineToken): string {
  switch (token.type) {
    case "person":
      return `[[bp:person:${token.id}]]`;
    case "interaction":
      return `[[bp:interaction:${token.id}]]`;
    case "group":
      return `[[bp:group:${token.id}]]`;
    case "tag":
      return `[[bp:tag:${token.id}]]`;
    case "date":
      return `[[bp:date:${token.iso}]]`;
    case "action":
      return `[[bp:action:${token.name}|${token.id}]]`;
    case "link":
      return `[${token.label}](${token.href})`;
    case "text":
      return token.value;
  }
}

/**
 * Serializes an array of InlineTokens back to a single string.
 */
export function tokensToString(tokens: InlineToken[]): string {
  return tokens.map(tokenToString).join("");
}
