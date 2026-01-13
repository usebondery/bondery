import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

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

// Get APP_URL from environment
const APP_URL = process.env.APP_URL;

// Extract origin from URL for host permissions
const getOrigin = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}/*`;
  } catch {
    return url;
  }
};

const manifest = {
  manifest_version: 3,
  name: "Bondery Social Integration",
  version: "0.4.0",
  description: "Import Instagram, LinkedIn, and Facebook contacts directly to Bondery",
  permissions: ["storage"],
  host_permissions: [
    "https://www.instagram.com/*",

    "https://www.linkedin.com/*",
    "https://www.facebook.com/*",
    getOrigin(APP_URL!),
  ],
  icons: {
    "16": "../public/icons/icon16.png",
    "48": "../public/icons/icon48.png",
    "128": "../public/icons/icon128.png",
  },
  content_scripts: [
    {
      matches: ["https://www.instagram.com/*"],
      js: ["instagram/index.tsx"],
    },
    {
      matches: ["https://www.linkedin.com/*"],
      js: ["linkedin/index.tsx"],
    },
    {
      matches: ["https://www.facebook.com/*"],
      js: ["facebook/index.tsx"],
    },
  ],
};

// Write manifest.json
const manifestPath = resolve(__dirname, "../src/manifest.json");

if (!APP_URL) {
  console.error(`❌ Error: APP_URL is not defined in ${envFile}`);
  console.error(`   Please create ${envFile} with APP_URL variable`);
  process.exit(1);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`✅ Generated manifest.json with host permission: ${getOrigin(APP_URL)}`);
