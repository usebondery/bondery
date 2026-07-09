/**
 * Validates API documentation route order in the generated OpenAPI spec.
 *
 * Usage: npx tsx scripts/check-api-route-order.ts
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getHttpMethodRank,
  getPathTier,
  OPENAPI_TAG_ORDER,
} from "@bondery/schemas/openapi/route-order";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = join(__dirname, "..", "openapi.yaml");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"] as const;

type OpenApiSpec = {
  tags?: Array<{ name: string }>;
  paths?: Record<string, Partial<Record<(typeof HTTP_METHODS)[number], { tags?: string[] }>>>;
};

const spec = parse(readFileSync(specPath, "utf8")) as OpenApiSpec;
const violations: string[] = [];

const declaredTags = (spec.tags ?? []).map((tag) => tag.name);
if (declaredTags.join("\0") !== OPENAPI_TAG_ORDER.join("\0")) {
  violations.push(
    `tags array order mismatch.\n  expected: ${OPENAPI_TAG_ORDER.join(" → ")}\n  actual:   ${declaredTags.join(" → ")}`,
  );
}

const opsByTag = new Map<string, Array<{ path: string; method: string }>>();

for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  if (!pathItem) {
    continue;
  }

  for (const method of HTTP_METHODS) {
    const operation = pathItem[method];
    if (!operation) {
      continue;
    }

    const tags = operation.tags ?? ["Untagged"];
    const primaryTag = tags[0] ?? "Untagged";
    const list = opsByTag.get(primaryTag) ?? [];
    list.push({ method, path });
    opsByTag.set(primaryTag, list);
  }
}

for (const [tag, operations] of opsByTag) {
  if (!OPENAPI_TAG_ORDER.includes(tag as (typeof OPENAPI_TAG_ORDER)[number])) {
    continue;
  }

  let lastTier = 0;
  let lastPath = "";
  let lastMethodRank = -1;

  for (const { path, method } of operations) {
    const tier = getPathTier(path);
    const methodRank = getHttpMethodRank(method);

    if (tier < lastTier) {
      violations.push(
        `${tag}: tier decreased at ${method.toUpperCase()} ${path} (tier ${tier} after tier ${lastTier})`,
      );
    } else if (path === lastPath && methodRank < lastMethodRank) {
      violations.push(
        `${tag}: method order violation on ${path} — ${method.toUpperCase()} should not follow a later verb`,
      );
    }

    lastTier = tier;
    lastPath = path;
    lastMethodRank = methodRank;
  }
}

if (violations.length > 0) {
  console.error(`API route order check failed:\n${violations.map((v) => `  - ${v}`).join("\n")}`);
  process.exit(1);
}

console.log("check-api-route-order: ok");
