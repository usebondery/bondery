import { HELP_DOCS_URL } from "#globals/paths.js";
import { DOC_LINKS, type DocId } from "#docs/doc-links.generated.js";

/**
 * Resolves a stable doc ID to the canonical GitBook URL.
 */
export function docHref(id: DocId): string {
  const entry = DOC_LINKS[id];
  const base = entry.path ? `${HELP_DOCS_URL}/${entry.path}` : HELP_DOCS_URL;
  const hash = "hash" in entry ? entry.hash : undefined;
  return hash ? `${base}#${hash}` : base;
}

export { DOC_LINKS, type DocId };
