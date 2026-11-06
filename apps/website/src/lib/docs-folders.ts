import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";

/**
 * A folder that represents its own page. An index page, or a folder path from the tree
 * ref, names the folder itself.
 */
export function folderOwnUrl(folder: PageTree.Folder): string | null {
  if (folder.index?.url) {
    return folder.index.url;
  }

  // `$ref.folder` is the folder path relative to the docs root, so it names the
  // folder itself. Deriving the URL from a child would return the parent of the
  // first child instead, and a folder of folders would resolve a level too high.
  if (folder.$ref?.folder) {
    return `/docs/${folder.$ref.folder}`;
  }

  return null;
}

/**
 * URL for a folder row. A folder with its own page wins. A generated group falls back
 * to the section its children live in, which is useful: the API resource groups link to
 * their first endpoint.
 *
 * `ancestorUrl` is the enclosing folder's own page. A generated group whose fallback
 * resolves back to that page is a label-only group (the error-type groups), so it gets
 * no link. Without this check the group would link to the page the reader is already on.
 */
export function folderUrl(folder: PageTree.Folder, ancestorUrl?: string | null): string | null {
  const own = folderOwnUrl(folder);
  if (own !== null) {
    return own;
  }

  const fallback = firstChildParentUrl(folder);
  if (fallback !== null && ancestorUrl !== undefined && fallback === ancestorUrl) {
    return null;
  }
  return fallback;
}

function firstChildParentUrl(folder: PageTree.Folder): string | null {
  for (const child of folder.children) {
    if (child.type === "page") {
      return parentUrl(child.url);
    }
    if (child.type === "folder") {
      const nested = folderUrl(child);
      if (nested) {
        return parentUrl(nested);
      }
    }
  }

  return null;
}

function parentUrl(url: string): string {
  const parts = url.split("/");
  parts.pop();
  const parent = parts.join("/");
  return parent.length > 0 ? parent : "/docs";
}

export function findFolderByPath(nodes: PageTree.Node[], pathname: string): PageTree.Folder | null {
  for (const node of nodes) {
    if (node.type !== "folder") {
      continue;
    }

    if (folderUrl(node) === pathname) {
      return node;
    }

    const nested = findFolderByPath(node.children, pathname);
    if (nested) {
      return nested;
    }
  }

  return null;
}

/**
 * Description for a folder page, from the `description` key in its `meta.json`.
 *
 * The folder page has no MDX file, so `meta.json` is the only place to declare
 * the text that becomes the `<meta name="description">` tag.
 */
export function folderDescription(folder: PageTree.Folder): string | undefined {
  return typeof folder.description === "string" && folder.description.trim().length > 0
    ? folder.description
    : undefined;
}

/** Icon for a docs page or folder URL. */
export function findDocsIcon(nodes: PageTree.Node[], url: string): ReactNode | undefined {
  for (const node of nodes) {
    if (node.type === "page" && node.url === url) {
      return node.icon;
    }
    if (node.type !== "folder") {
      continue;
    }
    if (node.index?.url === url || folderUrl(node) === url) {
      return node.index?.icon ?? node.icon;
    }
    const nested = findDocsIcon(node.children, url);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

/** Folder paths that are not already a real page. `known` holds slug joins such as `contributing/guides`. */
export function listFolderSlugs(nodes: PageTree.Node[], known: Set<string>): string[][] {
  const slugs: string[][] = [];

  function walk(list: PageTree.Node[]) {
    for (const node of list) {
      if (node.type !== "folder") {
        continue;
      }

      const url = folderUrl(node);
      if (url && url !== "/docs") {
        const slug = url.replace(/^\/docs\//, "").split("/");
        const key = slug.join("/");
        if (!known.has(key)) {
          slugs.push(slug);
        }
      }

      walk(node.children);
    }
  }

  walk(nodes);
  return slugs;
}
