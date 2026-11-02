// biome-ignore-all lint/suspicious/noConsole: temporary Voyager dump for the DOM-scrape trial

/**
 * Temporary Voyager response dump. Delete this file when the trial ends.
 *
 * Prints only when the extension is a dev build and the LinkedIn tab has
 * `localStorage["bondery:voyager-dump"] === "1"`.
 * Look at that tab's console and filter `[bondery][voyager]`.
 */

const DUMP_KEY = "bondery:voyager-dump";

const DEBUG = import.meta.env.DEV || import.meta.env.WXT_DEBUG === "true";

export interface VoyagerCoverageRow {
  dom: string;
  field: string;
  kept: string;
  voyager: string;
}

let dumpOwner: string | null = null;

export function isVoyagerDumpEnabled(): boolean {
  if (!DEBUG) {
    return false;
  }
  try {
    return localStorage.getItem(DUMP_KEY) === "1";
  } catch {
    return false;
  }
}

function pathnameOf(path: string): string {
  return path.split("?")[0] ?? path;
}

function isLogoPath(path: string): boolean {
  const pathname = pathnameOf(path);
  return (
    pathname === "/voyager/api/identity/dash/companies" ||
    pathname.startsWith("/voyager/api/organization/companies/")
  );
}

function labelForPath(path: string): string {
  const pathname = pathnameOf(path);
  if (!pathname.includes("/graphql")) {
    return pathname;
  }
  const queryId = new URLSearchParams(path.split("?")[1] ?? "").get("queryId");
  return queryId ? `graphql ${queryId}` : "graphql";
}

function includedCount(body: Record<string, unknown> | null | undefined): number {
  return Array.isArray(body?.included) ? body.included.length : 0;
}

export function beginVoyagerDump(handle: string): void {
  if (!isVoyagerDumpEnabled() || dumpOwner) {
    return;
  }
  dumpOwner = handle;
  console.groupCollapsed(`[bondery][voyager] ${handle}`);
}

export function logVoyagerExchange(details: {
  body?: Record<string, unknown> | null;
  error?: unknown;
  path: string;
  status: number | "error" | "no-jsession";
}): void {
  if (!isVoyagerDumpEnabled()) {
    return;
  }

  const label = labelForPath(details.path);
  if (isLogoPath(details.path)) {
    console.log(`[bondery][voyager] logo ${details.status} ${label}`);
    return;
  }

  const included = includedCount(details.body);
  console.groupCollapsed(`[bondery][voyager] ${details.status} ${label} included=${included}`);
  if (details.body) {
    console.log(details.body);
  }
  if (details.error !== undefined) {
    console.log(details.error);
  }
  console.groupEnd();
}

export function finishVoyagerDump(handle: string, rows: VoyagerCoverageRow[]): void {
  if (dumpOwner !== handle) {
    return;
  }
  console.log(
    "[bondery][voyager] The voyager column is the fetch helper result. That helper uses embedded page JSON when the HTTP body has no rows. HTTP bodies are the groups above this table.",
  );
  console.log(`[bondery][voyager] ${handle} coverage`);
  console.table(rows);
  console.groupEnd();
  dumpOwner = null;
}
