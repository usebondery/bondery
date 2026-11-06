import { API_ERROR_CODE_ENTRIES, API_ERROR_TYPES } from "@bondery/schemas/errors";
import type * as PageTree from "fumadocs-core/page-tree";
import { resolveDocsIcon } from "@/lib/docs-icon";

/** Folder the hand-written error pages live in. It never appears in the sidebar. */
const ERRORS_PREFIX = "/docs/api/errors";
const ERRORS_INDEX = `${ERRORS_PREFIX}/index`;

/**
 * Heading and icon per error type. The icon is not decoration: sibling rows carry an
 * icon slot, so a group without one started its text one slot further right and read
 * as a deeper level.
 */
const ERROR_TYPES: Record<string, { icon: string; label: string }> = {
  api_error: { icon: "Server", label: "Server errors" },
  authentication_error: { icon: "Key", label: "Authentication" },
  authorization_error: { icon: "Shield", label: "Authorization" },
  conflict_error: { icon: "GitMerge", label: "Conflicts" },
  invalid_request_error: { icon: "AlertCircle", label: "Invalid requests" },
  not_found_error: { icon: "Search", label: "Not found" },
  rate_limit_error: { icon: "Gauge", label: "Rate limits" },
  service_unavailable_error: { icon: "Cloud", label: "Service unavailable" },
};

/** Short label for a code. The sentence form lives in `description`. */
function codeLabel(code: string): string {
  const words = code.split("_").filter(Boolean);
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function errorType(code: string): string | null {
  return API_ERROR_CODE_ENTRIES[code as keyof typeof API_ERROR_CODE_ENTRIES]?.type ?? null;
}

function isErrorsFolder(node: PageTree.Folder): boolean {
  if (node.$ref?.folder?.endsWith("/api/errors")) {
    return true;
  }

  return node.children.some(
    (child) => child.type === "page" && child.url.startsWith(`${ERRORS_PREFIX}/`),
  );
}

function errorCodeFromUrl(url: string): string | null {
  if (!url.startsWith(`${ERRORS_PREFIX}/`)) {
    return null;
  }
  const code = url.slice(ERRORS_PREFIX.length + 1);
  if (code.length === 0 || code === "index" || code.includes("/")) {
    return null;
  }
  return code;
}

function buildErrorGroups(nodes: PageTree.Node[]): PageTree.Node[] {
  const codes = new Map<string, PageTree.Item>();
  let indexNode: PageTree.Item | undefined;

  for (const node of nodes) {
    if (node.type !== "page") {
      continue;
    }
    if (node.url === ERRORS_INDEX) {
      indexNode = node;
      continue;
    }
    const code = errorCodeFromUrl(node.url);
    if (code) {
      codes.set(code, { ...node, name: codeLabel(code) });
    }
  }

  const groups: PageTree.Node[] = [];

  for (const type of API_ERROR_TYPES) {
    const items = [...codes.entries()]
      .filter(([code]) => errorType(code) === type)
      .map(([, item]) => item);

    if (items.length === 0) {
      continue;
    }

    groups.push({
      $id: `errors-${type}`,
      children: items,
      collapsible: true,
      defaultOpen: false,
      icon: resolveDocsIcon(ERROR_TYPES[type]?.icon ?? "AlertCircle"),
      name: ERROR_TYPES[type]?.label ?? type,
      type: "folder",
    });
  }

  // Pages whose code is no longer in the catalog. They stay reachable, but they
  // sit last so they do not imply a live status.
  const retired = [...codes.entries()]
    .filter(([code]) => errorType(code) === null)
    .map(([, item]) => item);

  if (retired.length > 0) {
    groups.push({
      $id: "errors-retired",
      children: retired,
      collapsible: true,
      defaultOpen: false,
      icon: resolveDocsIcon("Archive"),
      name: "Retired codes",
      type: "folder",
    });
  }

  return indexNode ? [indexNode, ...groups] : groups;
}

function decorateNodes(nodes: PageTree.Node[]): PageTree.Node[] {
  const kept: PageTree.Node[] = [];

  for (const node of nodes) {
    if (node.type === "folder" && isErrorsFolder(node)) {
      kept.push({ ...node, children: buildErrorGroups(node.children) });
      continue;
    }

    if (node.type === "folder") {
      kept.push({ ...node, children: decorateNodes(node.children) });
      continue;
    }

    kept.push(node);
  }

  return kept;
}

/** HTTP status behind an error page, read from the generated catalog. */
export function docsErrorStatus(url: string): number | null {
  const code = errorCodeFromUrl(url);
  if (!code) {
    return null;
  }
  return API_ERROR_CODE_ENTRIES[code as keyof typeof API_ERROR_CODE_ENTRIES]?.httpStatus ?? null;
}

/**
 * Group error pages by error type and give each code a readable label.
 * The `index` page stays where it is, above the groups.
 */
export function decorateErrorsTree(nodes: PageTree.Node[]): PageTree.Node[] {
  return decorateNodes(nodes);
}

export { ERRORS_INDEX };
