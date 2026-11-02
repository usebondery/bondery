import type * as PageTree from "fumadocs-core/page-tree";
import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { openapiPlugin } from "fumadocs-openapi/server";
import { docs } from "@/lib/collections";

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
  },
  {
    baseUrl: "/docs",
    plugins: [lucideIconsPlugin(), openapiPlugin()],
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
    children: filterHiddenNodes(tree.children, hiddenUrls),
  };
}

export function getPageImage(page: Page) {
  const segments = [...page.slugs, "image.webp"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}
