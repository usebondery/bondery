export type DocsTabKey = "product" | "selfhost" | "integrate" | "develop";

/**
 * Tab for a docs URL.
 * Prefix rules match `getActiveTabKey` in `docs-tree.ts`.
 */
export function getTabForUrl(url: string): DocsTabKey {
  if (url.startsWith("/docs/deploy")) {
    return "selfhost";
  }
  if (url.startsWith("/docs/api")) {
    return "integrate";
  }
  if (url.startsWith("/docs/contributing")) {
    return "develop";
  }
  return "product";
}

/** True when `pathname` is this page, ignoring a trailing slash. */
export function isCurrentDocsPage(url: string, pathname: string): boolean {
  return pathname === url || pathname === `${url}/`;
}

/**
 * True when `pathname` is this page or a child path.
 * `/docs` stays exact so the index does not match every page.
 */
export function docsPageContainsPath(url: string, pathname: string): boolean {
  if (isCurrentDocsPage(url, pathname)) {
    return true;
  }
  if (url === "/docs") {
    return false;
  }
  return pathname.startsWith(`${url}/`);
}
