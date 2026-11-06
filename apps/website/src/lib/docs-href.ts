/**
 * Resolve an MDX href against the current docs page URL.
 * Strips `.mdx` so relative source links stay on `/docs` routes.
 */
export function resolveDocsHref(href: string, pageUrl: string): string {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("http://") ||
    href.startsWith("https://")
  ) {
    return href;
  }

  const withSlash = pageUrl.endsWith("/") ? pageUrl : `${pageUrl}/`;
  const base = href.startsWith("/") ? "https://docs.local" : `https://docs.local${withSlash}`;
  const url = new URL(href, base);
  let path = url.pathname.replace(/\.mdx$/, "").replace(/\.md$/, "");

  if (path.endsWith("/index")) {
    path = path.slice(0, -"/index".length);
  }

  if (path.length === 0) {
    path = "/docs";
  }

  return `${path}${url.search}${url.hash}`;
}
