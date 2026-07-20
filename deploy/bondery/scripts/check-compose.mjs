#!/usr/bin/env node
/**
 * Mechanical checks for deploy/bondery/docker-compose.yml:
 * - webapp must never receive PRIVATE_* or BONDERY_PRIVATE_* secrets (except
 *   server-only PostHog vars listed in WEBAPP_ALLOWED_PRIVATE)
 * - api and webapp must carry Traefik Host() rules
 * - redis must not carry Traefik labels or join dokploy-network
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const composePath = resolve(root, "docker-compose.yml");
const text = readFileSync(composePath, "utf8");

const errors = [];

/** Slice a top-level service block by name (YAML indentation-aware). */
function serviceBlock(name) {
  const start = text.search(new RegExp(`^  ${name}:\\s*$`, "m"));
  if (start === -1) {
    errors.push(`Missing service "${name}"`);
    return "";
  }
  const rest = text.slice(start + 1);
  const next = rest.search(/^ {2}[a-zA-Z0-9_-]+:\s*$/m);
  return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
}

const webapp = serviceBlock("webapp");
const api = serviceBlock("api");
const redis = serviceBlock("redis");

const WEBAPP_ALLOWED_PRIVATE = new Set([
  "BONDERY_PRIVATE_POSTHOG_HOST",
  "BONDERY_PRIVATE_POSTHOG_KEY",
]);

if (webapp) {
  if (/^\s*env_file:/m.test(webapp)) {
    errors.push(
      "webapp must not use env_file (would load API PRIVATE_* / BONDERY_PRIVATE_* secrets)",
    );
  }
  const privateHits = [...webapp.matchAll(/\b(?:BONDERY_)?PRIVATE_[A-Z0-9_]+\b/g)]
    .map((m) => m[0])
    .filter((name) => !WEBAPP_ALLOWED_PRIVATE.has(name));
  if (privateHits.length > 0) {
    errors.push(
      `webapp must not reference PRIVATE_* / BONDERY_PRIVATE_* vars: ${[...new Set(privateHits)].join(", ")}`,
    );
  }
  if (!webapp.includes("BONDERY_INFRA_WEBAPP_DOMAIN")) {
    errors.push("webapp must define a Traefik Host() rule using BONDERY_INFRA_WEBAPP_DOMAIN");
  }
  if (!/traefik\.enable=true/.test(webapp)) {
    errors.push("webapp must enable Traefik (traefik.enable=true)");
  }
  if (!webapp.includes("BONDERY_INFRA_INTERNAL_API_URL")) {
    errors.push("webapp must set BONDERY_INFRA_INTERNAL_API_URL for server-side API calls");
  }
  if (!/BONDERY_PUBLIC_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_API_DOMAIN/.test(webapp)) {
    errors.push(
      "webapp must derive BONDERY_PUBLIC_API_URL from https:// + BONDERY_INFRA_API_DOMAIN",
    );
  }
  if (!/BONDERY_PUBLIC_WEBAPP_URL:\s*https:\/\/\$\{BONDERY_INFRA_WEBAPP_DOMAIN/.test(webapp)) {
    errors.push(
      "webapp must derive BONDERY_PUBLIC_WEBAPP_URL from https:// + BONDERY_INFRA_WEBAPP_DOMAIN",
    );
  }
  if (!/BONDERY_PUBLIC_WEBSITE_URL:\s*https:\/\/\$\{BONDERY_INFRA_WEBSITE_DOMAIN/.test(webapp)) {
    errors.push(
      "webapp must derive BONDERY_PUBLIC_WEBSITE_URL from https:// + BONDERY_INFRA_WEBSITE_DOMAIN",
    );
  }
}

if (api) {
  if (!api.includes("BONDERY_INFRA_API_DOMAIN")) {
    errors.push("api must define a Traefik Host() rule using BONDERY_INFRA_API_DOMAIN");
  }
  if (!/BONDERY_PUBLIC_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_API_DOMAIN/.test(api)) {
    errors.push("api must derive BONDERY_PUBLIC_API_URL from https:// + BONDERY_INFRA_API_DOMAIN");
  }
  if (!/traefik\.enable=true/.test(api)) {
    errors.push("api must enable Traefik (traefik.enable=true)");
  }
  if (!/dokploy-network/.test(api) || !/internal/.test(api)) {
    errors.push("api must join both dokploy-network and internal");
  }
}

if (redis) {
  if (/traefik\./.test(redis)) {
    errors.push("redis must not carry Traefik labels");
  }
  if (/dokploy-network/.test(redis)) {
    errors.push("redis must not join dokploy-network");
  }
  if (!/internal/.test(redis)) {
    errors.push("redis must join the private internal network");
  }
}

if (errors.length > 0) {
  console.error("deploy/bondery compose checks failed:\n");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("deploy/bondery compose checks passed");
