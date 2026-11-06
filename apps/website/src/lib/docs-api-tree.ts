import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { resolveDocsIcon } from "@/lib/docs-icon";

/**
 * Group heading and icon per endpoint resource. The icon is not decoration: sibling
 * rows carry an icon slot, so a group without one started its text one slot further
 * right and read as a deeper level. `Route` marks a resource this file does not know.
 */
const RESOURCES: Record<string, { icon: string; label: string }> = {
  chat: { icon: "Message", label: "Chat" },
  contacts: { icon: "Users", label: "Contacts" },
  extension: { icon: "Puzzle", label: "Browser extension" },
  geocode: { icon: "MapPin", label: "Geocoding" },
  groups: { icon: "BoxMultiple", label: "Groups" },
  health: { icon: "Heartbeat", label: "Health" },
  interactions: { icon: "History", label: "Interactions" },
  me: { icon: "UserCircle", label: "Account" },
  mobile: { icon: "DeviceMobile", label: "Mobile app" },
  "oauth-providers": { icon: "Key", label: "Auth" },
  subscriptions: { icon: "CreditCard", label: "Billing" },
  sync: { icon: "Refresh", label: "Sync" },
  tags: { icon: "Tags", label: "Tags" },
  webhooks: { icon: "Webhook", label: "Webhooks" },
};

/**
 * Public prefix of the generated pages. The loader strips the generator folder, so a
 * page for `_generated/health/live/get.mdx` is served at `/docs/api/api-reference/health/live/get`.
 */
const API_REFERENCE_PREFIX = "/docs/api/api-reference";

/** Folder name the generator writes into. Only file paths carry it, never URLs. */
const GENERATED_SEGMENT = "_generated";

const HTTP_METHODS = new Set(["DELETE", "GET", "PATCH", "POST", "PUT"]);

/** HTTP method a generated docs URL ends with, or `null` for a hand-written page. */
export function docsApiMethod(url: string): string | null {
  if (!url.startsWith(`${API_REFERENCE_PREFIX}/`)) {
    return null;
  }

  const method = url.split("/").pop()?.toUpperCase();
  return method && HTTP_METHODS.has(method) ? method : null;
}

/** `true` when a page file path or folder ref lives under the generator folder. */
function isGeneratedPath(path: string | undefined): boolean {
  return path?.split("/").includes(GENERATED_SEGMENT) === true;
}

function isGeneratedFolder(node: PageTree.Folder): boolean {
  if (isGeneratedPath(node.$ref?.folder)) {
    return true;
  }

  // Direct page children only. A recursive check would also match every ancestor.
  return node.children.some((child) => child.type === "page" && isGeneratedPath(child.$ref));
}

function collectOperationItems(
  folder: PageTree.Folder,
  out: PageTree.Item[],
  resolveTitle: (url: string) => string | undefined,
): PageTree.Item[] {
  for (const child of folder.children) {
    if (child.type === "page") {
      if (docsApiMethod(child.url)) {
        // The OpenAPI loader appends its own method label to `name`. Use the page
        // title from the spec `summary` so the row is a plain string.
        const title = resolveTitle(child.url);
        out.push(title ? { ...child, name: title } : child);
      }
      continue;
    }

    if (child.type === "folder") {
      collectOperationItems(child, out, resolveTitle);
    }
  }

  return out;
}

function resourceKey(url: string): string {
  return url.slice(API_REFERENCE_PREFIX.length + 1).split("/")[0] ?? "";
}

function resourceLabel(key: string): string {
  const label = RESOURCES[key]?.label;
  if (label) {
    return label;
  }
  const words = key.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Icon for a group. An unknown resource still gets the fallback icon. */
function resourceIcon(key: string): ReactNode {
  return resolveDocsIcon(RESOURCES[key]?.icon ?? "Route");
}

/** Group heading and operation items in generator order. */
function buildResourceGroups(items: PageTree.Item[]): PageTree.Node[] {
  const groups = new Map<string, PageTree.Item[]>();

  for (const item of items) {
    const key = resourceKey(item.url);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const nodes: PageTree.Node[] = [];

  for (const [key, groupItems] of groups) {
    nodes.push({
      $id: `api-${key}`,
      children: groupItems,
      collapsible: true,
      defaultOpen: false,
      icon: resourceIcon(key),
      name: resourceLabel(key),
      type: "folder",
    });
  }

  return nodes;
}

function decorateNodes(
  nodes: PageTree.Node[],
  resolveTitle: (url: string) => string | undefined,
): PageTree.Node[] {
  const kept: PageTree.Node[] = [];

  for (const node of nodes) {
    if (node.type === "folder" && isGeneratedFolder(node)) {
      kept.push(...buildResourceGroups(collectOperationItems(node, [], resolveTitle)));
      continue;
    }

    if (node.type === "folder") {
      kept.push({ ...node, children: decorateNodes(node.children, resolveTitle) });
      continue;
    }

    kept.push(node);
  }

  return kept;
}

/**
 * Replace the generated `_generated` folder with readable resource groups.
 * Page titles come from `summary` in the OpenAPI spec, so they need no mapping here.
 */
export function decorateApiTree(
  nodes: PageTree.Node[],
  resolveTitle: (url: string) => string | undefined,
): PageTree.Node[] {
  return decorateNodes(nodes, resolveTitle);
}
