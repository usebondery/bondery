import type * as PageTree from "fumadocs-core/page-tree";

type TabKey = "product" | "selfhost" | "integrate" | "develop";

const TAB_SLUGS: Record<TabKey, Set<string>> = {
  develop: new Set(["contributing"]),
  integrate: new Set(["api"]),
  product: new Set([
    "index",
    "getting-started",
    "apps",
    "bondery",
    "concepts",
    "getting-help-and-troubleshooting",
    "roadmap",
    "changelog",
  ]),
  selfhost: new Set(["deploy"]),
};

export function getActiveTabKey(pathname: string): TabKey {
  if (pathname.startsWith("/docs/deploy")) {
    return "selfhost";
  }
  if (pathname.startsWith("/docs/api")) {
    return "integrate";
  }
  if (pathname.startsWith("/docs/contributing")) {
    return "develop";
  }
  return "product";
}

/** First URL anywhere under a folder, so nested groups still resolve a slug. */
function firstUrl(node: PageTree.Node): string | null {
  if (node.type === "page") {
    return node.url;
  }
  if (node.type !== "folder") {
    return null;
  }
  const own = node.index?.url;
  if (own) {
    return own;
  }
  for (const child of node.children) {
    const url = firstUrl(child);
    if (url) {
      return url;
    }
  }
  return null;
}

function nodeSlug(node: PageTree.Node): string | null {
  if (node.type === "separator") {
    return null;
  }

  const url = firstUrl(node);

  if (!url) {
    return null;
  }
  if (url === "/docs") {
    return "index";
  }

  const match = url.match(/^\/docs\/([^/]+)/);
  return match?.[1] ?? null;
}

function nodeAllowed(node: PageTree.Node, allowed: Set<string>): boolean {
  const slug = nodeSlug(node);
  return slug !== null && allowed.has(slug);
}

function filterChildren(children: PageTree.Node[], allowed: Set<string>): PageTree.Node[] {
  const kept: PageTree.Node[] = [];

  for (const node of children) {
    if (node.type === "separator") {
      const nextContent = children
        .slice(children.indexOf(node) + 1)
        .find((item) => item.type !== "separator");
      if (nextContent && nodeAllowed(nextContent, allowed)) {
        kept.push(node);
      }
      continue;
    }

    if (node.type === "folder") {
      if (nodeAllowed(node, allowed)) {
        kept.push(node);
      }
      continue;
    }

    if (nodeAllowed(node, allowed)) {
      kept.push(node);
    }
  }

  return kept;
}

export function filterPageTreeForTab(tree: PageTree.Root, tabKey: TabKey): PageTree.Root {
  return {
    ...tree,
    $id: `${tree.$id ?? "root"}-${tabKey}`,
    children: filterChildren(tree.children, TAB_SLUGS[tabKey]),
  };
}

export function filterPageTreeForPathname(tree: PageTree.Root, pathname: string): PageTree.Root {
  return filterPageTreeForTab(tree, getActiveTabKey(pathname));
}
