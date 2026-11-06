import type { ReactNode } from "react";
import { DocsIcon } from "@/components/docs/DocsIcon";

/**
 * Turns an `icon` name from page frontmatter or `meta.json` into a sidebar icon.
 * Passed to the Fumadocs loader, which calls it for every page, folder, and
 * separator before it builds the page tree.
 */
export function resolveDocsIcon(icon: string | undefined): ReactNode {
  return icon ? <DocsIcon name={icon} /> : undefined;
}
