import path from "node:path";

/**
 * Rewrite links in docs Markdown so agents can follow them.
 *
 * `includeProcessedMarkdown` keeps the source href, which is a `.mdx` path
 * relative to the source file. Three problems follow:
 *
 * - A reader cannot open `.mdx`.
 * - A relative href breaks when the page URL has no directory (`/docs.md`).
 * - A root-relative href carries no origin, so the same text read from
 *   `llms-full.txt` gives the agent no host to request.
 *
 * Rewrite every docs link to an absolute Markdown URL on the public site, in the
 * same form that `getPageMarkdownUrl` returns. Other links keep their text:
 * external URLs are already absolute, and links that leave the `docs` tree point
 * at repository source files.
 */

const DOCS_DIR = "docs";

const FENCE = /^\s*(`{3,}|~{3,})/;

const SKIP_PREFIXES = ["http://", "https://", "mailto:", "tel:", "#"];

/** Page slugs without the `docs/` prefix and without the file extension. */
export type HasDocsPage = (slugs: string[]) => boolean;

export type RewriteOptions = {
  /** Source path of the page, relative to the docs root (for example `api/index.mdx`). */
  filePath: string;
  /** `true` when a docs page exists for these slugs, so the `.md` route can serve it. */
  hasPage: HasDocsPage;
  /** Public site origin with no trailing slash. */
  siteOrigin: string;
  /**
   * `true` when the page is unpublished (hidden or unreleased). Such a page has
   * no public route, so a link to it must name the repository file instead.
   */
  isPublicPage: HasDocsPage;
  /** Repository blob base for unpublished sources, with no trailing slash. */
  sourceBaseUrl: string;
};

const GITHUB_BLOB = "https://github.com/usebondery/bondery/blob/main/docs";

function stripDocsSuffix(target: string): string {
  return target.replace(/\.mdx?$/i, "").replace(/\/index$/, "");
}

function splitSuffix(href: string): [string, string] {
  const indexes = [href.indexOf("#"), href.indexOf("?")].filter((index) => index >= 0);
  const splitAt = indexes.length === 0 ? -1 : Math.min(...indexes);

  return splitAt < 0 ? [href, ""] : [href.slice(0, splitAt), href.slice(splitAt)];
}

function absolute(siteOrigin: string, urlPath: string): string {
  return `${siteOrigin.replace(/\/+$/, "")}${urlPath}`;
}

/**
 * Path for a docs page named relative to the docs root.
 *
 * An unpublished page has no public route, so it links to the repository file.
 * A folder index has no `.md` route either, so it keeps the HTML path.
 */
function docsPath(
  relativePath: string,
  suffix: string,
  hasPage: HasDocsPage,
  isPublicPage: HasDocsPage,
  sourceBaseUrl: string,
): string {
  const trimmed = stripDocsSuffix(relativePath.replace(/\\/g, "/"));

  if (trimmed.length === 0 || trimmed === "index") {
    return `/docs.md${suffix}`;
  }

  const slugs = trimmed.split("/");

  if (hasPage(slugs) && !isPublicPage(slugs)) {
    return `${sourceBaseUrl.replace(/\/+$/, "")}/${trimmed}.mdx${suffix}`;
  }

  return hasPage(slugs) ? `/docs/${trimmed}.md${suffix}` : `/docs/${trimmed}${suffix}`;
}

/** Resolve one href against the source file that holds it. */
export function rewriteDocsHref(href: string, options: RewriteOptions): string {
  const { filePath, hasPage, isPublicPage, siteOrigin, sourceBaseUrl } = options;
  const resolvePath = (relativePath: string, suffix: string) =>
    docsPath(relativePath, suffix, hasPage, isPublicPage, sourceBaseUrl);

  if (href.length === 0 || SKIP_PREFIXES.some((prefix) => href.startsWith(prefix))) {
    return href;
  }

  const [pathname, suffix] = splitSuffix(href);

  if (pathname.length === 0 || pathname.endsWith("/")) {
    return href;
  }

  if (pathname.startsWith("/")) {
    if (pathname === "/docs" || pathname === "/docs/index") {
      return absolute(siteOrigin, `/docs.md${suffix}`);
    }

    if (!pathname.startsWith("/docs/")) {
      return href;
    }

    const rewritten = resolvePath(pathname.slice("/docs/".length), suffix);

    // An unpublished target already resolves to a repository URL.
    return rewritten.startsWith("http") ? rewritten : absolute(siteOrigin, rewritten);
  }

  const sourceDir = path.posix.dirname(`${DOCS_DIR}/${filePath.replace(/\\/g, "/")}`);
  const resolved = path.posix.normalize(path.posix.join(sourceDir, pathname));

  if (!resolved.startsWith(`${DOCS_DIR}/`) && resolved !== DOCS_DIR) {
    return href;
  }

  const relative = resolved === DOCS_DIR ? "" : resolved.slice(`${DOCS_DIR}/`.length);

  const rewritten = resolvePath(relative, suffix);

  return rewritten.startsWith("http") ? rewritten : absolute(siteOrigin, rewritten);
}

/**
 * Add the site origin to root-relative docs links.
 *
 * `llms.txt` is built from the page tree, which stores `page.url` — a path with
 * no origin. An agent reading the file has no host to request.
 */
export function absolutizeDocsLinks(markdown: string, siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/+$/, "");

  // Match `/docs`, `/docs.md`, and `/docs/<slug>` link targets only.
  return markdown.replace(/\]\(\/docs(?=[).md/#?])([^)\s]*)\)/g, (_match, rest: string) => {
    return `](${origin}/docs${rest})`;
  });
}

/**
 * Rewrite every link target outside fenced code blocks.
 *
 * Content inside a fence is an example, so it must keep the literal text.
 */
export function rewriteDocsMarkdownLinks(markdown: string, options: RewriteOptions): string {
  const lines = markdown.split("\n");
  let fence: string | undefined;

  for (const [index, line] of lines.entries()) {
    const marker = FENCE.exec(line)?.[1];

    if (marker) {
      if (fence === undefined) {
        fence = marker;
      } else if (marker[0] === fence[0] && marker.length >= fence.length) {
        // Only a fence of the same character, at least as long, closes the block.
        fence = undefined;
      }

      continue;
    }

    if (fence !== undefined) {
      continue;
    }

    lines[index] = line.replace(/\]\(([^()\s]+)\)/g, (match, target: string) => {
      const rewritten = rewriteDocsHref(target, options);
      return rewritten === target ? match : `](${rewritten})`;
    });
  }

  return lines.join("\n");
}
