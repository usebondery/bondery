/**
 * Fail CI when a docs page names an API route that does not exist.
 *
 * Docs are prose, so nothing else stops a writer from typing a path that a
 * refactor removed, or from prefixing an API-origin URL with `/api/`. A reader
 * who copies that call gets a 404. The OpenAPI spec is the contract, so every
 * method and path a docs page names is checked against it.
 *
 * Two shapes are checked:
 *
 * 1. `METHOD /path`, for example `POST /contacts/merge`.
 * 2. A full URL, for example `https://api.usebondery.com/contacts`.
 *
 * The webapp origin legitimately serves `/api/...`, because its BFF catch-all
 * route forwards `/api/*` to the API. The API origin never does. A `/api/`
 * prefix is therefore correct on the webapp origin and wrong on the API origin.
 *
 * Scope: every page under `docs/`, including changelogs and ADRs. A changelog
 * that names a since-removed route still tells a reader the wrong thing.
 *
 * Usage: node scripts/check/check-docs-api-routes.mjs (pnpm run check:docs:api-routes)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-docs-api-routes");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const docsRoot = join(repoRoot, "docs");
const specPath = join(repoRoot, "packages/openapi-spec/openapi.yaml");

/** Directories whose pages are generated from the spec, so they cannot drift. */
const EXCLUDED_DIRECTORIES = new Set(["_generated"]);

/**
 * First path segment of a real API resource. A path that starts with one of
 * these is checked against the spec.
 */
const API_FIRST_SEGMENTS = new Set([
  "auth",
  "chat",
  "contacts",
  "extension",
  "geocode",
  "groups",
  "health",
  "interactions",
  "mcp",
  "me",
  "mobile",
  "oauth-providers",
  "security",
  "subscriptions",
  "sync",
  "tags",
  "webhooks",
]);

/**
 * Non-API paths that a method may legitimately precede: app routes, static
 * files, and third-party probes. Anything else is an unknown first segment,
 * which is a typo in the resource name and is reported.
 */
const NON_API_PATHS = new Set(["files", "runtime-config.json", "status"]);

/**
 * Routes that exist in code but are hidden from the published spec, so the spec
 * cannot be the only source of truth. `docs/bondery/mcp.mdx` documents the MCP
 * routes. Better Auth owns the `/auth/*` tree and publishes it as metadata
 * rather than as OpenAPI operations.
 */
const ROUTES_OUTSIDE_SPEC = new Set([
  "POST /mcp",
  "GET /mcp",
  "DELETE /mcp",
  // Browser CSP reports. Hidden from the published spec because the caller cannot authenticate.
  "POST /security/csp-report",
]);
const EXTERNAL_PATH_PREFIXES = ["/auth/"];

/** Prefix the webapp BFF adds in front of an API path. */
const BFF_PREFIX = "api";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

/**
 * A method immediately followed by a path, for example `POST /contacts`.
 * The lookbehind keeps a match from starting mid-word.
 */
const MENTION = new RegExp(
  `(?<![A-Za-z0-9_-])(${HTTP_METHODS.join("|")})\\s+(\\/[A-Za-z0-9{}\\-_/.:]*)`,
  "g",
);

/** Any absolute URL, so an example curl command is checked too. */
const URL_PATTERN = /https?:\/\/[A-Za-z0-9.-]+(\/[A-Za-z0-9{}\-_/.:]*)?/g;

/**
 * `true` when the line marks the path as a webapp BFF route. The BFF forwards
 * `/api/*` to the API, so `/api/health/live` is correct on the webapp origin and
 * stays correct in prose that says so.
 */
function isBffContext(line) {
  return /\b(BFF|webapp)\b/i.test(line);
}

/** Strips punctuation a sentence adds around a path, never a path character. */
function trimPath(raw) {
  let path = raw;
  while (path.length > 1 && /[.,;:)]$/.test(path)) {
    path = path.slice(0, -1);
  }
  return path;
}

/**
 * Docs write a path parameter as `:id` or `{id}`. The spec always uses `{id}`.
 * A bare trailing slash is a sentence artifact, so it is dropped too.
 */
function normalizePath(path) {
  const normalized = path.replace(/:([A-Za-z0-9_]+)/g, "{$1}").replace(/\/+$/, "");
  return normalized.length === 0 ? "/" : normalized;
}

function segments(path) {
  return path.split("/").filter(Boolean);
}

/**
 * The spec path for a path written in docs, or `null` when the path is not an
 * API route. `bff` says the path carried an `/api/` prefix, which only the webapp
 * origin serves. `unknown` says the first segment names no API resource, so the
 * path is reported rather than skipped.
 */
function toSpecPath(path) {
  const parts = segments(path);
  const [first] = parts;

  if (first === undefined) {
    return null;
  }

  if (first === BFF_PREFIX) {
    const [next] = parts.slice(1);
    if (next === undefined) {
      return null;
    }
    // `METHOD /api/...` is the original bug: a bare path with the webapp prefix.
    // A method and path in prose always describe the API origin, so report it.
    return { bff: true, path, specPath: `/${parts.slice(1).join("/")}`, unknown: false };
  }

  if (!API_FIRST_SEGMENTS.has(first)) {
    if (NON_API_PATHS.has(first)) {
      return null;
    }
    return { bff: false, path, specPath: path, unknown: true };
  }

  return { bff: false, path, specPath: path, unknown: false };
}

function walkMdxFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry)) {
        walkMdxFiles(full, acc);
      }
    } else if (entry.endsWith(".mdx")) {
      acc.push(full);
    }
  }
  return acc;
}

function repoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join("/");
}

/** Routes declared in the committed spec, keyed as `METHOD /path`. */
function loadSpecRoutes() {
  const spec = parse(readFileSync(specPath, "utf8"));
  const routes = new Set();
  const paths = new Set();

  for (const [path, item] of Object.entries(spec?.paths ?? {})) {
    if (item === null || typeof item !== "object") {
      continue;
    }
    paths.add(path);
    for (const method of HTTP_METHODS) {
      if (item[method.toLowerCase()] !== undefined) {
        routes.add(`${method} ${path}`);
      }
    }
  }

  return { paths, routes };
}

const { paths: specPaths, routes: specRoutes } = loadSpecRoutes();

if (specRoutes.size === 0) {
  check.add(`Parsed no routes from ${repoPath(specPath)}. Is the spec valid?`);
  check.ok("0 pages checked");
} else {
  const known = new Set([...specRoutes, ...ROUTES_OUTSIDE_SPEC]);
  let mentions = 0;
  let pages = 0;

  for (const filePath of walkMdxFiles(docsRoot).sort()) {
    const path = repoPath(filePath);
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    pages += 1;

    lines.forEach((line, index) => {
      const at = `${path}:${index + 1}`;

      for (const match of line.matchAll(MENTION)) {
        const method = match[1];
        const route = toSpecPath(normalizePath(trimPath(match[2])));

        if (route === null) {
          continue;
        }

        mentions += 1;

        // `METHOD /api/...` describes the API origin, so the prefix is wrong,
        // unless the line marks it as a webapp BFF route.
        if (route.bff) {
          if (isBffContext(line)) {
            continue;
          }
          check.add(
            `${at}: ${method} ${route.path} adds ${BFF_PREFIX}/ on the API origin.` +
              ` Use the bare path instead: ${method} ${route.specPath}`,
          );
          continue;
        }

        if (route.unknown) {
          check.add(
            `${at}: ${method} ${route.path} starts with an unknown resource segment. ` +
              "Use the API path (for example `/contacts`) or add the segment to API_FIRST_SEGMENTS.",
          );
          continue;
        }

        if (known.has(`${method} ${route.specPath}`)) {
          continue;
        }

        if (EXTERNAL_PATH_PREFIXES.some((prefix) => route.specPath.startsWith(prefix))) {
          continue;
        }

        check.add(
          `${at}: ${method} ${route.path} is not in the OpenAPI spec` +
            suggestionSuffix(method, route.specPath, known),
        );
      }

      for (const match of line.matchAll(URL_PATTERN)) {
        const url = match[0];

        // Bare API paths apply only on an API origin. A link to a vendor site, a
        // repository file, or the website is not a route and is not checked.
        if (!isApiHost(url)) {
          continue;
        }

        const urlPath = normalizePath(trimPath(match[1] ?? "/"));
        const route = toSpecPath(urlPath);

        if (route === null) {
          continue;
        }

        mentions += 1;

        // `/api/` on the API origin is the bug this check exists for.
        if (route.bff) {
          const origin = new URL(url).origin;
          check.add(
            `${at}: ${url} adds ${BFF_PREFIX}/ on the API origin.` +
              ` Use the bare path instead: ${origin}${route.specPath}`,
          );
          continue;
        }

        if (route.unknown) {
          check.add(
            `${at}: ${url} starts with an unknown resource segment. ` +
              "Use the API path (for example `/contacts`) or add the segment to API_FIRST_SEGMENTS.",
          );
          continue;
        }

        if (EXTERNAL_PATH_PREFIXES.some((prefix) => route.specPath.startsWith(prefix))) {
          continue;
        }

        // A URL carries no method, so any method on the path is enough.
        const served = HTTP_METHODS.some((method) => known.has(`${method} ${route.specPath}`));
        if (served || specPaths.has(route.specPath)) {
          continue;
        }

        check.add(`${at}: ${url} does not match any path in the OpenAPI spec`);
      }
    });
  }

  check.ok(`${mentions} route reference(s) across ${pages} pages match the OpenAPI spec`);
}

/**
 * `true` when the URL host is an API origin (`api.example.com`), so bare paths
 * apply and `/api/` is a bug. A webapp or website host returns `false`.
 */
function isApiHost(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.startsWith("api.");
  } catch {
    return false;
  }
}

/**
 * The closest known route for the same method, so a typo or a stale prefix is
 * obvious from the failure. Returns `""` when nothing is close.
 */
function suggestionSuffix(method, specPath, known) {
  const wanted = segments(specPath);
  let best = null;
  let bestScore = 0;

  for (const route of known) {
    const [routeMethod, candidate] = route.split(" ");
    if (routeMethod !== method) {
      continue;
    }

    const candidateSegments = segments(candidate);
    if (candidateSegments.length !== wanted.length) {
      continue;
    }

    // Compare whole segments, then fall back to a prefix match so a typo in the
    // first segment (`/contacs`) still finds `/contacts`.
    const same = candidateSegments.filter(
      (segment, index) => segment === wanted[index] || isNearMiss(segment, wanted[index]),
    ).length;

    // Require the last segment to be close, so only one segment is off.
    if (same > bestScore && isNearMiss(candidateSegments.at(-1), wanted.at(-1))) {
      bestScore = same;
      best = route;
    }
  }

  return best === null ? "" : `. Did you mean ${best}?`;
}

/** `true` when two segments are equal or differ by one typo (length 1). */
function isNearMiss(candidate, wanted) {
  if (candidate === undefined || wanted === undefined) {
    return false;
  }
  if (candidate === wanted) {
    return true;
  }
  const longest = Math.max(candidate.length, wanted.length);
  if (longest < 4 || Math.abs(candidate.length - wanted.length) > 1) {
    return false;
  }
  return editDistanceAtMostOne(candidate, wanted);
}

/** Levenshtein distance of 1 or 0, without allocating a matrix. */
function editDistanceAtMostOne(a, b) {
  if (a === b) {
    return true;
  }
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.length - shorter.length > 1) {
    return false;
  }

  let index = 0;
  while (index < shorter.length && shorter[index] === longer[index]) {
    index += 1;
  }

  // One insertion in `longer`.
  if (shorter.length !== longer.length) {
    return shorter.slice(index) === longer.slice(index + 1);
  }

  // One substitution.
  return shorter.slice(index + 1) === longer.slice(index + 1);
}
