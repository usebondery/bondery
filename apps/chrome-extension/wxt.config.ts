import { defineConfig } from "wxt";
import { resolve } from "path";

// Inline URL patterns to avoid requiring @bondery/helpers to be built before config loads
const INSTAGRAM_HOST_MATCH_PATTERN = "https://www.instagram.com/*";
const LINKEDIN_HOST_MATCH_PATTERN = "https://www.linkedin.com/*";

// Resolve workspace package paths relative to this config file
const packagesDir = resolve(__dirname, "../../packages");

/**
 * Extracts the origin wildcard from a full URL string.
 * e.g. "https://app.usebondery.com/path" → "https://app.usebondery.com/*"
 */
function getOriginWildcard(url: string): string {
  try {
    const { origin } = new URL(url);
    return `${origin}/*`;
  } catch {
    return url;
  }
}

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],

  vite: () => ({
    // Expose NEXT_PUBLIC_*, PUBLIC_*, and PRIVATE_* env vars to entrypoints
    envPrefix: ["VITE_", "NEXT_PUBLIC_", "PUBLIC_", "PRIVATE_"],
    resolve: {
      alias: {
        // Point workspace packages to their TypeScript source so Vite can
        // compile them directly without requiring a pre-build step.
        "@bondery/helpers": resolve(packagesDir, "helpers/src/index.ts"),
        "@bondery/branding": resolve(packagesDir, "branding/src/index.ts"),
        "@bondery/branding-src": resolve(packagesDir, "branding/src/index.ts"),
      },
    },
  }),

  manifest: () => {
    const appUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;

    if (!appUrl) {
      throw new Error(
        "NEXT_PUBLIC_WEBAPP_URL is not set. Create a .env.development.local or .env.production.local file.",
      );
    }
    if (!supabaseUrl) {
      throw new Error(
        "PUBLIC_SUPABASE_URL is not set. Create a .env.development.local or .env.production.local file.",
      );
    }

    const hostPermissions = [
      INSTAGRAM_HOST_MATCH_PATTERN,
      "https://instagram.com/*",
      LINKEDIN_HOST_MATCH_PATTERN,
      "https://linkedin.com/*",
      "https://www.facebook.com/*",
      getOriginWildcard(appUrl),
      getOriginWildcard(supabaseUrl),
    ];

    return {
      name: "Bondery Social Integration",
      description: "Import contacts from social media directly to Bondery",
      permissions: ["storage", "identity", "alarms"],
      host_permissions: hostPermissions,
      icons: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      },
      action: {
        default_title: "Bondery",
        default_icon: {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png",
        },
      },
    };
  },
});
