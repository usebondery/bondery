/** URL scheme used by the mobile markdown editor for person mentions. */
export const BP_PERSON_URL_PREFIX = "bp://person/";

const BP_PERSON_LINK_RE = /\[([^\]]+)\]\(bp:\/\/person\/([^)]+)\)/g;
const BP_PERSON_TOKEN_RE = /\[\[bp:person:([^\]]+)\]\]/g;

/**
 * Converts Bondery wire-format person tokens to mobile-editor markdown links.
 *
 * `[[bp:person:UUID]]` → `[@Name](bp://person/UUID)`
 */
export function expandPersonMentionsForEditor(
  markdown: string,
  getName: (id: string) => string | undefined,
): string {
  return markdown.replace(BP_PERSON_TOKEN_RE, (_, id: string) => {
    const name = getName(id)?.trim();
    const displayText = name ? `@${name}` : "@";
    return `[${displayText}](${BP_PERSON_URL_PREFIX}${id})`;
  });
}

/**
 * Converts mobile-editor person mention links back to Bondery wire-format tokens.
 *
 * `[@Name](bp://person/UUID)` → `[[bp:person:UUID]]`
 */
export function collapsePersonMentionsFromEditor(markdown: string): string {
  return markdown.replace(BP_PERSON_LINK_RE, (_, _display: string, id: string) => {
    return `[[bp:person:${id}]]`;
  });
}

/**
 * Builds the display text and URL for inserting a person mention in the mobile editor.
 */
export function formatPersonMentionLink(displayName: string, contactId: string): {
  displayText: string;
  url: string;
} {
  const trimmed = displayName.trim();
  const displayText = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  return {
    displayText,
    url: `${BP_PERSON_URL_PREFIX}${contactId}`,
  };
}

/**
 * Parses a person mention URL from the mobile editor. Returns null if not a person link.
 */
export function parsePersonMentionUrl(url: string): string | null {
  if (!url.startsWith(BP_PERSON_URL_PREFIX)) {
    return null;
  }
  const id = url.slice(BP_PERSON_URL_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}
