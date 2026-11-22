const MDX_EXT_RE = /\.mdx$/;
const MD_EXT_RE = /\.md$/;
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
  let path = url.pathname.replace(MDX_EXT_RE, "").replace(MD_EXT_RE, "");

  if (path.endsWith("/index")) {
    path = path.slice(0, -"/index".length);
  }

  if (path.length === 0) {
    path = "/docs";
  }

  return `${path}${url.search}${url.hash}`;
}
