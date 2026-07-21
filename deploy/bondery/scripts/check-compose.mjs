#!/usr/bin/env node
/**
 * Mechanical checks for deploy/bondery compose:
 * - webapp must never receive PRIVATE_* or BONDERY_PRIVATE_* secrets (except
 *   server-only PostHog vars listed in WEBAPP_ALLOWED_PRIVATE)
 * - api and webapp must carry Traefik Host() rules and derive public URLs from domains
 * - redis must not carry Traefik labels or join dokploy-network
 * - kong must enable Traefik + healthcheck; db must not
 * - api/webapp must wait for kong healthy
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainPath = resolve(root, "docker-compose.yml");
const supabasePath = resolve(root, "docker-compose.supabase.yml");
const mainText = readFileSync(mainPath, "utf8");
const supabaseText = readFileSync(supabasePath, "utf8");
const text = `${mainText}\n${supabaseText}`;

const errors = [];

if (!/^\s*include:\s*$/m.test(mainText) || !mainText.includes("docker-compose.supabase.yml")) {
  errors.push("docker-compose.yml must include path: docker-compose.supabase.yml");
}

/** Slice a top-level service block by name (YAML indentation-aware). */
function serviceBlock(name, source = text) {
  const start = source.search(new RegExp(`^  ${name}:\\s*$`, "m"));
  if (start === -1) {
    errors.push(`Missing service "${name}"`);
    return "";
  }
  const rest = source.slice(start + 1);
  const next = rest.search(/^ {2}[a-zA-Z0-9_-]+:\s*$/m);
  return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
}

const webapp = serviceBlock("webapp", mainText);
const api = serviceBlock("api", mainText);
const redis = serviceBlock("redis", mainText);
const kong = serviceBlock("kong", supabaseText);
const db = serviceBlock("db", supabaseText);

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
  if (!/BONDERY_PUBLIC_SUPABASE_URL:\s*https:\/\/\$\{BONDERY_INFRA_SUPABASE_DOMAIN/.test(webapp)) {
    errors.push(
      "webapp must derive BONDERY_PUBLIC_SUPABASE_URL from https:// + BONDERY_INFRA_SUPABASE_DOMAIN",
    );
  }
  if (!/kong:\s*\n\s*condition:\s*service_healthy/.test(webapp)) {
    errors.push("webapp must depends_on kong with condition: service_healthy");
  }
}

if (api) {
  if (!api.includes("BONDERY_INFRA_API_DOMAIN")) {
    errors.push("api must define a Traefik Host() rule using BONDERY_INFRA_API_DOMAIN");
  }
  if (!/BONDERY_PUBLIC_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_API_DOMAIN/.test(api)) {
    errors.push("api must derive BONDERY_PUBLIC_API_URL from https:// + BONDERY_INFRA_API_DOMAIN");
  }
  if (!/BONDERY_PUBLIC_SUPABASE_URL:\s*https:\/\/\$\{BONDERY_INFRA_SUPABASE_DOMAIN/.test(api)) {
    errors.push(
      "api must derive BONDERY_PUBLIC_SUPABASE_URL from https:// + BONDERY_INFRA_SUPABASE_DOMAIN",
    );
  }
  if (!api.includes("BONDERY_INFRA_INTERNAL_SUPABASE_URL")) {
    errors.push("api must set BONDERY_INFRA_INTERNAL_SUPABASE_URL for server-side Supabase calls");
  }
  if (!/traefik\.enable=true/.test(api)) {
    errors.push("api must enable Traefik (traefik.enable=true)");
  }
  if (!/dokploy-network/.test(api) || !/internal/.test(api)) {
    errors.push("api must join both dokploy-network and internal");
  }
  if (!/kong:\s*\n\s*condition:\s*service_healthy/.test(api)) {
    errors.push("api must depends_on kong with condition: service_healthy");
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

if (kong) {
  if (!/traefik\.enable=true/.test(kong)) {
    errors.push("kong must enable Traefik (traefik.enable=true)");
  }
  if (!kong.includes("BONDERY_INFRA_SUPABASE_DOMAIN")) {
    errors.push("kong must define a Traefik Host() rule using BONDERY_INFRA_SUPABASE_DOMAIN");
  }
  if (!/^\s*healthcheck:/m.test(kong)) {
    errors.push("kong must define a healthcheck");
  }
  if (!/dokploy-network/.test(kong) || !/internal/.test(kong)) {
    errors.push("kong must join both dokploy-network and internal");
  }
  if (kong.includes("BONDERY_LEGACY") || kong.includes("SUPABASE_ANON_KEY:")) {
    errors.push("kong must use sb_* keys only (no legacy SUPABASE_ANON_KEY / SERVICE_KEY slots)");
  }
  if (!kong.includes("BONDERY_SUPABASE_ANON_KEY_ASYMMETRIC")) {
    errors.push("kong must set ANON_KEY_ASYMMETRIC from BONDERY_SUPABASE_ANON_KEY_ASYMMETRIC");
  }
  if (kong.includes("jwt-derived.env") || kong.includes("jwt-derive")) {
    errors.push("kong must not depend on jwt-derive or jwt-derived.env");
  }
}

const auth = serviceBlock("auth", supabaseText);
if (auth) {
  if (!auth.includes("BONDERY_INFRA_CHROME_EXTENSION_ID")) {
    errors.push(
      "auth GOTRUE_URI_ALLOW_LIST must derive chromiumapp.org URLs from BONDERY_INFRA_CHROME_EXTENSION_ID",
    );
  }
  if (!auth.includes("GOTRUE_JWT_KEYS: ${BONDERY_SUPABASE_GOTRUE_JWT_KEYS")) {
    errors.push("auth must set GOTRUE_JWT_KEYS from BONDERY_SUPABASE_GOTRUE_JWT_KEYS");
  }
}

const rest = serviceBlock("rest", supabaseText);
if (rest && !rest.includes("PGRST_JWT_SECRET: ${BONDERY_SUPABASE_JWT_JWKS")) {
  errors.push("rest must set PGRST_JWT_SECRET from BONDERY_SUPABASE_JWT_JWKS");
}

if (supabaseText.includes("jwt-derive:")) {
  errors.push("docker-compose.supabase.yml must not define a jwt-derive service");
}

if (db) {
  if (/traefik\./.test(db)) {
    errors.push("db must not carry Traefik labels");
  }
  if (/dokploy-network/.test(db)) {
    errors.push("db must not join dokploy-network");
  }
  if (!/internal/.test(db)) {
    errors.push("db must join the private internal network");
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
