import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load environment variables for manifest generation.
 * Note: Parcel will automatically load .env files for the actual build,
 * but this script runs in prebuild (before Parcel), so we need manual loading.
 */
const NODE_ENV = process.env.NODE_ENV || "development";
const envFile = `.env.${NODE_ENV}.local`;

// Load from root directory (try both .env and .env.[NODE_ENV])

const localEnvPath = resolve(__dirname, "..", envFile);

if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  console.error(`❌ Error: ${envFile} not found in chrome-extension folder.`);
  process.exit(1);
}

// Get environment variables
const NEXT_PUBLIC_WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL;
const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;

// Extract origin from URL for host permissions
const getOrigin = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}/*`;
  } catch {
    return url;
  }
};

const hostPermissions = [
  SOCIAL_PLATFORM_URL_DETAILS.instagram.hostMatchPattern,
  "https://instagram.com/*",
  SOCIAL_PLATFORM_URL_DETAILS.linkedin.hostMatchPattern,
  "https://linkedin.com/*",
  "https://www.facebook.com/*",
  getOrigin(NEXT_PUBLIC_WEBAPP_URL!),
];

// Add Supabase URL for OAuth token exchange (service worker needs access)
if (PUBLIC_SUPABASE_URL) {
  hostPermissions.push(getOrigin(PUBLIC_SUPABASE_URL));
}

const manifest = {
  manifest_version: 3,
  name: "Bondery Social Integration",
  version: "0.6.0",
  description: "Import contacts from social media directly to Bondery",
  permissions: ["storage", "identity", "alarms"],
  host_permissions: hostPermissions,
  icons: {
    "16": "../public/icons/icon16.png",
    "48": "../public/icons/icon48.png",
    "128": "../public/icons/icon128.png",
  },
  background: {
    service_worker: "background/index.ts",
    type: "module",
  },
  action: {
    default_popup: "popup/index.html",
    default_icon: {
      "16": "../public/icons/icon16.png",
      "48": "../public/icons/icon48.png",
      "128": "../public/icons/icon128.png",
    },
    default_title: "Bondery",
  },
  content_scripts: [
    {
      matches: [SOCIAL_PLATFORM_URL_DETAILS.instagram.hostMatchPattern, "https://instagram.com/*"],
      js: ["instagram/index.tsx"],
    },
    {
      matches: [SOCIAL_PLATFORM_URL_DETAILS.instagram.hostMatchPattern, "https://instagram.com/*"],
      js: ["instagram/networkInterceptor.ts"],
      world: "MAIN",
      run_at: "document_start",
    },
    {
      matches: [SOCIAL_PLATFORM_URL_DETAILS.linkedin.hostMatchPattern, "https://linkedin.com/*"],
      js: ["linkedin/index.tsx"],
    },
    {
      matches: ["https://www.facebook.com/*"],
      js: ["facebook/index.tsx"],
    },
    {
      matches: [getOrigin(NEXT_PUBLIC_WEBAPP_URL!)],
      js: ["webapp/bridge.ts"],
    },
  ],
};

// Write manifest.json
const manifestPath = resolve(__dirname, "../src/manifest.json");

if (!NEXT_PUBLIC_WEBAPP_URL) {
  console.error(`❌ Error: NEXT_PUBLIC_WEBAPP_URL is not defined in ${envFile}`);
  console.error(`   Please create ${envFile} with NEXT_PUBLIC_WEBAPP_URL variable`);
  process.exit(1);
}

if (!PUBLIC_SUPABASE_URL) {
  console.error(`❌ Error: PUBLIC_SUPABASE_URL is not defined in ${envFile}`);
  console.error(`   Please create ${envFile} with PUBLIC_SUPABASE_URL variable`);
  process.exit(1);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`✅ Generated manifest.json with host permissions: ${hostPermissions.join(", ")}`);
