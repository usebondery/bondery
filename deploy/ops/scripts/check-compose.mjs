#!/usr/bin/env node
/**
 * Mechanical checks for deploy/ops/docker-compose.yml:
 * - website must enable Traefik with BONDERY_INFRA_WEBSITE_DOMAIN
 * - public URLs must be derived from domain vars
 * - must not reference PRIVATE_* / BONDERY_PRIVATE_* or use env_file
 * - image must be floating :production (no tag env var)
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

const website = serviceBlock("website");

if (website) {
  if (/^\s*env_file:/m.test(website)) {
    errors.push("website must not use env_file");
  }
  const privateHits = [...website.matchAll(/\b(?:BONDERY_)?PRIVATE_[A-Z0-9_]+\b/g)].map(
    (m) => m[0],
  );
  if (privateHits.length > 0) {
    errors.push(
      `website must not reference PRIVATE_* / BONDERY_PRIVATE_* vars: ${[...new Set(privateHits)].join(", ")}`,
    );
  }
  if (!website.includes("BONDERY_INFRA_WEBSITE_DOMAIN")) {
    errors.push("website must define a Traefik Host() rule using BONDERY_INFRA_WEBSITE_DOMAIN");
  }
  if (!/traefik\.enable=true/.test(website)) {
    errors.push("website must enable Traefik (traefik.enable=true)");
  }
  if (!/BONDERY_PUBLIC_WEBAPP_URL:\s*https:\/\/\$\{BONDERY_INFRA_WEBAPP_DOMAIN/.test(website)) {
    errors.push(
      "website must derive BONDERY_PUBLIC_WEBAPP_URL from https:// + BONDERY_INFRA_WEBAPP_DOMAIN",
    );
  }
  if (!/BONDERY_PUBLIC_WEBSITE_URL:\s*https:\/\/\$\{BONDERY_INFRA_WEBSITE_DOMAIN/.test(website)) {
    errors.push(
      "website must derive BONDERY_PUBLIC_WEBSITE_URL from https:// + BONDERY_INFRA_WEBSITE_DOMAIN",
    );
  }
  if (!/image:\s*ghcr\.io\/usebondery\/website:production\b/.test(website)) {
    errors.push(
      'website image must be hardcoded to "ghcr.io/usebondery/website:production" (no tag env var)',
    );
  }
  if (/BONDERY_INFRA_WEBSITE_IMAGE_TAG/.test(website)) {
    errors.push("website must not use BONDERY_INFRA_WEBSITE_IMAGE_TAG (floating :production only)");
  }
  if (!/dokploy-network/.test(website)) {
    errors.push("website must join dokploy-network");
  }
}

if (errors.length > 0) {
  console.error("deploy/ops compose checks failed:\n");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("deploy/ops compose checks passed");
