import { DOCS_GITHUB_BLOB_BASE } from "@bondery/helpers";
import { llms } from "fumadocs-core/source";
import { getWebsiteUrl } from "@/lib/config";
import { absolutizeDocsLinks, rewriteDocsMarkdownLinks } from "@/lib/docs-markdown-links";
import { isPublishedDocsPage } from "@/lib/docs-visibility";
import { loadOpenApiDocument } from "@/lib/openapi";
import { openApiPageMarkdown } from "@/lib/openapi-markdown";
import type { Page } from "@/lib/source";
import { getFilteredPageTree, source } from "@/lib/source";

type OpenApiMeta = {
  method?: string;
  preload?: string[];
  webhook?: boolean;
};

function docsFilePath(page: Page): string {
  const path = page.path;
  if (path.endsWith(".mdx") || path.endsWith(".md")) {
    return path;
  }
  return `${path}.mdx`;
}

export function getDocsPageUrl(page: Page): string {
  return new URL(page.url, getWebsiteUrl()).href;
}

/**
 * Operation detail for a generated OpenAPI page.
 *
 * The page body is a client `OpenAPIPage` element, so the processed Markdown
 * holds no operation data. Rebuild it from the OpenAPI document instead. The
 * generated frontmatter carries the method, and the page title is the route path.
 */
async function openApiMarkdown(page: Page): Promise<string> {
  const meta = (page.data as { _openapi?: OpenApiMeta })._openapi;
  const documentId = meta?.preload?.[0];
  const method = meta?.method;
  const path = page.data.title;

  if (!documentId || !method || !path.startsWith("/")) {
    return "";
  }

  const { bundled } = await loadOpenApiDocument(documentId);

  return openApiPageMarkdown(bundled, { method: method.toLowerCase(), path });
}

/** `true` when a docs page exists for these slugs, so the `.md` route can serve it. */
function hasDocsPage(slugs: string[]): boolean {
  return source.getPage(slugs) !== undefined;
}

/** `true` when a page is publicly served. Unpublished pages have no public route. */
function isPublicDocsPage(slugs: string[]): boolean {
  const page = source.getPage(slugs);
  return page !== undefined && isPublishedDocsPage(page);
}

export async function getLLMText(page: Page) {
  const pageUrl = getDocsPageUrl(page);
  const sourceUrl = `${DOCS_GITHUB_BLOB_BASE}/${docsFilePath(page)}`;
  const processed = await page.data.getText("processed");
  const openApi = await openApiMarkdown(page);

  // Source links name `.mdx` and carry no origin; an agent cannot follow either.
  const markdown = rewriteDocsMarkdownLinks(processed, {
    filePath: page.path,
    hasPage: hasDocsPage,
    isPublicPage: isPublicDocsPage,
    siteOrigin: getWebsiteUrl(),
    sourceBaseUrl: DOCS_GITHUB_BLOB_BASE,
  });

  return `# ${page.data.title}

URL: ${pageUrl}
Source: ${sourceUrl}

${page.data.description ?? ""}

${markdown}${openApi ? `\n\n${openApi}` : ""}`;
}

export function getDocsGithubUrl(page: Page): string {
  return `${DOCS_GITHUB_BLOB_BASE}/${docsFilePath(page)}`;
}

/** Public `.md` URL. `next.config.ts` rewrites it onto the internal Markdown route. */
export function getPageMarkdownUrl(page: Page): string {
  if (page.slugs.length === 0) {
    return "/docs.md";
  }

  return `/docs/${page.slugs.join("/")}.md`;
}

export const docsLlms = llms(source, {
  renderPage: (page) => getLLMText(page),
});

/**
 * `llms.txt`: one section per top-level tree node.
 *
 * Node titles and descriptions come from the page tree, so hidden pages stay out
 * without a second filter.
 */
export async function renderDocsIndex(): Promise<string> {
  const tree = getFilteredPageTree();
  const name = typeof tree.name === "string" ? tree.name : "Docs";
  const description = typeof tree.description === "string" ? tree.description : undefined;
  const sections = await Promise.all(tree.children.map((node) => docsLlms.indexNode(node)));
  const index = [`# ${name}`, ...(description ? ["", `> ${description}`] : []), ...sections].join(
    "\n",
  );

  // `llms.txt` links are root-relative; an agent needs the host to request them.
  return absolutizeDocsLinks(index, getWebsiteUrl());
}

/** `llms-full.txt`: every published page, joined. */
export async function renderDocsFull(): Promise<string> {
  const pages = source.getPages().filter(isPublishedDocsPage);
  const rendered = await Promise.all(pages.map((page) => getLLMText(page)));

  return rendered.join("\n\n");
}
