import type * as PageTree from "fumadocs-core/page-tree";
import { loader } from "fumadocs-core/source";
import { openapiPlugin } from "fumadocs-openapi/server";
import { docs } from "@/lib/collections";
import { decorateApiTree } from "@/lib/docs-api-tree";
import { decorateErrorsTree } from "@/lib/docs-errors-tree";
import { resolveDocsIcon } from "@/lib/docs-icon";

/** Folder the OpenAPI generator writes into. It is a build detail, not part of a URL. */
const GENERATED_SEGMENT = "_generated";

/**
 * Drop the generator folder from public slugs. The files stay under `_generated`, so the
 * gitignore rule, the Turbo output and the docs check scripts keep working, while URLs
 * read `/docs/api/api-reference/health/live` instead of the same path with `_generated`.
 * `page.path` still holds the real file, so source links resolve.
 */
function stripGeneratedSegment(_file: unknown, next: () => string[]): string[] | undefined {
  const slugs = next();

  if (!slugs.includes(GENERATED_SEGMENT)) {
    return undefined;
  }

  return slugs.filter((slug) => slug !== GENERATED_SEGMENT);
}

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
  },
  {
    baseUrl: "/docs",
    icon: resolveDocsIcon,
    plugins: [openapiPlugin()],
    slugs: stripGeneratedSegment,
  },
);

export type Page = (typeof source)["$inferPage"];

function getHiddenPageUrls(): Set<string> {
  return new Set(
    source
      .getPages()
      .filter((page) => page.data.hidden)
      .map((page) => page.url),
  );
}

function filterHiddenNodes(nodes: PageTree.Node[], hiddenUrls: Set<string>): PageTree.Node[] {
  const kept: PageTree.Node[] = [];

  for (const node of nodes) {
    if (node.type === "separator") {
      kept.push(node);
      continue;
    }

    if (node.type === "page") {
      if (!hiddenUrls.has(node.url)) {
        kept.push(node);
      }
      continue;
    }

    if (node.type === "folder") {
      const indexUrl = node.index?.url;
      if (indexUrl && hiddenUrls.has(indexUrl)) {
        continue;
      }

      const children = filterHiddenNodes(node.children, hiddenUrls);
      kept.push({ ...node, children });
    }
  }

  return kept;
}

export function getFilteredPageTree(): PageTree.Root {
  const hiddenUrls = getHiddenPageUrls();
  const tree = source.getPageTree();

  return {
    ...tree,
    children: decorateErrorsTree(
      decorateApiTree(filterHiddenNodes(tree.children, hiddenUrls), (url) => {
        const page = source.getPages().find((entry) => entry.url === url);
        return page?.data.title;
      }),
    ),
  };
}

export function getPageImage(page: Page) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}
