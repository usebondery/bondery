/**
 * One-off codemod: update import paths after lib/ subsystem migration.
 * Usage: npx tsx scripts/codemod-lib-paths.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(__dirname, "..");

/** Longest-first replacements to avoid partial matches. */
const REPLACEMENTS: [string, string][] = [
  [
    "lib/delete-orphaned-interactions-for-contacts.js",
    "lib/contacts/delete-orphaned-interactions.js",
  ],
  ["lib/resolve-group-member-person-ids.js", "lib/contacts/resolve-group-member-ids.js"],
  ["lib/resolve-contact-person-ids.js", "lib/contacts/resolve-person-ids.js"],
  ["lib/contact-enrichment.js", "lib/contacts/enrichment.js"],
  ["lib/openapi-route-responses.js", "lib/platform/openapi/responses.js"],
  ["lib/openapi-route-meta.js", "lib/platform/openapi/meta.js"],
  ["lib/map-error-to-response.js", "lib/platform/errors/map-to-response.js"],
  ["lib/extensionVersionCheck.js", "lib/extension/version-check.js"],
  ["lib/default-import-groups.js", "lib/import/default-groups.js"],
  ["lib/with-domain-route.js", "lib/platform/with-domain-route.js"],
  ["lib/api-key-access.js", "lib/platform/auth/api-key-access.js"],
  ["lib/domain-context.js", "lib/platform/domain-context.js"],
  ["lib/linkedin-helpers.js", "lib/import/linkedin-helpers.js"],
  ["lib/fastify-types.js", "lib/platform/fastify-types.js"],
  ["lib/error-codes.js", "lib/platform/errors/codes.js"],
  ["lib/http-errors.js", "lib/platform/errors/http-errors.js"],
  ["lib/avatar-storage.js", "lib/contacts/avatar-storage.js"],
  ["lib/route-areas.js", "lib/platform/route-areas.js"],
  ["lib/rate-limit.js", "lib/platform/rate-limit.js"],
  ["lib/pagination.js", "lib/data/pagination.js"],
  ["lib/api-keys.js", "lib/platform/auth/api-keys.js"],
  ["lib/queries.js", "lib/data/select-fragments.js"],
  ["lib/supabase.js", "lib/data/supabase.js"],
  ["lib/posthog.js", "services/admin/posthog.js"],
  ["lib/socials.js", "lib/contacts/socials.js"],
  ["lib/polar.js", "services/billing/polar.js"],
  ["lib/search.js", "lib/data/search.js"],
  ["lib/logger.js", "lib/platform/logger.js"],
  ["lib/config.js", "lib/platform/config.js"],
  ["lib/redis.js", "lib/data/redis.js"],
  ["lib/mapy.js", "lib/integrations/mapy.js"],
  ["lib/myself.js", "lib/contacts/myself.js"],
  ["lib/auth.js", "lib/platform/auth/strategies.js"],
  ["../contact-enrichment.js", "../contacts/enrichment.js"],
  ["../../contact-enrichment.js", "../../contacts/enrichment.js"],
  ["../../../contact-enrichment.js", "../../../contacts/enrichment.js"],
  ["../queries.js", "../data/select-fragments.js"],
  ["../../queries.js", "../../data/select-fragments.js"],
  ["../../../queries.js", "../../../data/select-fragments.js"],
  ["../supabase.js", "../data/supabase.js"],
  ["../../supabase.js", "../../data/supabase.js"],
  ["../../../supabase.js", "../../../data/supabase.js"],
  ["../redis.js", "../data/redis.js"],
  ["../../redis.js", "../../data/redis.js"],
  ["../search.js", "../data/search.js"],
  ["../../search.js", "../../data/search.js"],
  ["../logger.js", "../platform/logger.js"],
  ["../../logger.js", "../../platform/logger.js"],
  ["../fastify-types.js", "../platform/fastify-types.js"],
  ["../../fastify-types.js", "../../platform/fastify-types.js"],
  ["../rate-limit.js", "../platform/rate-limit.js"],
  ["../../rate-limit.js", "../../platform/rate-limit.js"],
  ["../openapi-route-responses.js", "../platform/openapi/responses.js"],
  ["../../openapi-route-responses.js", "../../platform/openapi/responses.js"],
  ["../socials.js", "../contacts/socials.js"],
  ["../../socials.js", "../../contacts/socials.js"],
  ["./error-codes.js", "./codes.js"],
  ["./auth.js", "./auth/strategies.js"],
  ["../auth.js", "../auth/strategies.js"],
  ["../../auth.js", "../../auth/strategies.js"],
  ["../http-errors.js", "../errors/http-errors.js"],
  ["../../http-errors.js", "../../errors/http-errors.js"],
  ["../../../http-errors.js", "../../../platform/errors/http-errors.js"],
  ["../error-codes.js", "../errors/codes.js"],
  ["../../error-codes.js", "../../errors/codes.js"],
  ["../map-error-to-response.js", "../errors/map-to-response.js"],
  ["../../map-error-to-response.js", "../../errors/map-to-response.js"],
  ["../domain-context.js", "../domain-context.js"],
  ["./domain-context.js", "./domain-context.js"],
];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") {
        continue;
      }
      files.push(...walk(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(join(apiRoot, "src"))) {
  const original = readFileSync(file, "utf8");
  let content = original;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    writeFileSync(file, content, "utf8");
    changed += 1;
    console.log(`updated ${relative(apiRoot, file)}`);
  }
}

// scripts folder (check-redis-singleton etc.)
for (const file of walk(join(apiRoot, "scripts"))) {
  if (file.endsWith("codemod-lib-paths.ts")) {
    continue;
  }
  const original = readFileSync(file, "utf8");
  let content = original;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    writeFileSync(file, content, "utf8");
    changed += 1;
    console.log(`updated ${relative(apiRoot, file)}`);
  }
}

console.log(`codemod-lib-paths: ${changed} file(s) updated`);
