#!/usr/bin/env node

/**

 * Assert required CI env vars are set after Infisical production fetch.

 *

 * Usage: node .github/scripts/check-ci-infisical.mjs <profile>

 * Profiles: extension | extension-staging | services-webhook | website-webhook

 */

const profiles = {
  extension: [
    "BONDERY_INFRA_CHROME_EXTENSION_ID",

    "BONDERY_OPS_CHROME_PUBLISHER_ID",

    "BONDERY_PUBLIC_WEBAPP_URL",

    "BONDERY_PUBLIC_API_URL",

    "BONDERY_PUBLIC_OAUTH_CLIENT_ID",
  ],

  "extension-staging": [
    "BONDERY_PUBLIC_WEBAPP_URL",

    "BONDERY_PUBLIC_API_URL",

    "BONDERY_PUBLIC_OAUTH_CLIENT_ID",
  ],

  "services-webhook": ["BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK"],

  "website-webhook": ["BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK"],
};

const profile = process.argv[2];

const keys = profiles[profile];

if (!keys) {
  console.error(
    `Unknown profile "${profile}". Expected one of: ${Object.keys(profiles).join(", ")}`,
  );

  process.exit(1);
}

const missing = keys.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(`Missing required CI env for profile "${profile}":`);

  for (const key of missing) {
    console.error(`  - ${key}`);
  }

  process.exit(1);
}

console.log(`CI Infisical check OK (${profile}): ${keys.length} keys present`);
