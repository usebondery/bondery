import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_PORTS, DEV_URLS } from "@bondery/schemas/constants";
import { defineConfig } from "wxt";

const require = createRequire(import.meta.url);
const { version } = require("./package.json") as { version: string };
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Helper to extract origin from URL for host permissions
const getOrigin = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}/*`;
  } catch {
    return url;
  }
};

export default defineConfig({
  // Target Chromium browsers
  browser: "chrome",

  // Keep extension dev server origin stable (prevents CSP/HMR port mismatch)
  dev: {
    server: {
      host: "localhost",
      origin: DEV_URLS.extension,
      port: DEV_PORTS.EXTENSION,
    },
  },
  entrypointsDir: "entrypoints",

  // Build hooks for pre-build tasks (icon generation, env check)
  hooks: {
    "build:before": async (wxt) => {
      console.log("[wxt] Running pre-build checks...");

      // Validate required environment variables
      const requiredEnvVars = [
        "BONDERY_PUBLIC_WEBAPP_URL",
        "BONDERY_PUBLIC_SUPABASE_URL",
        "BONDERY_PUBLIC_API_URL",
        "BONDERY_PUBLIC_SUPABASE_OAUTH_CLIENT_ID",
      ];
      const missing = requiredEnvVars.filter((key) => !process.env[key]);

      if (missing.length > 0 && wxt.config.mode === "production") {
        console.warn(`[wxt] Warning: Missing environment variables: ${missing.join(", ")}`);
      }
    },
  },

  // Disable auto-imports for explicit control during migration
  imports: false,

  // Dynamic manifest configuration using environment variables
  manifest: ({ mode }) => {
    const _isDev = mode === "development";

    const webappUrl = process.env.BONDERY_PUBLIC_WEBAPP_URL || DEV_URLS.webapp;
    const apiUrl = process.env.BONDERY_PUBLIC_API_URL || DEV_URLS.api;
    const supabaseUrl = process.env.BONDERY_PUBLIC_SUPABASE_URL || DEV_URLS.supabase;

    // Build host permissions dynamically
    const hostPermissions = [
      "https://www.instagram.com/*",
      "https://instagram.com/*",
      "https://www.linkedin.com/*",
      "https://linkedin.com/*",
      "https://*.linkedin.com/*",
      getOrigin(webappUrl),
    ];

    // Add API URL if it is on a different origin than the webapp
    if (getOrigin(apiUrl) !== getOrigin(webappUrl)) {
      hostPermissions.push(getOrigin(apiUrl));
    }

    // Add Supabase URL for OAuth token exchange
    if (supabaseUrl) {
      hostPermissions.push(getOrigin(supabaseUrl));
    }

    return {
      // Action button configuration
      action: {
        default_icon: {
          16: "icons/icon16.png",
          48: "icons/icon48.png",
          128: "icons/icon128.png",
        },
        default_title: "Bondery",
      },
      description: "Import contacts from social media directly to Bondery Webapp",
      host_permissions: hostPermissions,

      // Icons (matched from public/ directory)
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      name: "Bondery Extension",

      permissions: ["storage", "identity", "alarms"],
      version,

      // Web accessible resources for the MAIN world script injection
      web_accessible_resources: [
        {
          matches: ["https://www.instagram.com/*", "https://instagram.com/*"],
          resources: ["instagram-interceptor.js"],
        },
      ],
    };
  },

  // React module for JSX/TSX support
  modules: ["@wxt-dev/module-react"],
  outDir: "dist",
  publicDir: "public",
  srcDir: "src",

  // Configure Vite
  vite: ({ mode }) => ({
    build:
      mode === "development"
        ? {
            minify: "oxc",
            sourcemap: false,
          }
        : {},
    css: {
      postcss: {},
    },
    // Note: do NOT override process.env.NODE_ENV in development mode builds.
    // Forcing "production" here causes a mismatch: Vite's React plugin still
    // emits jsxDEV() calls (dev JSX transform), but React's production bundle
    // doesn't export jsxDEV — resulting in a runtime crash in the popup.
    define: {},
    // Expose BONDERY_PUBLIC_* to import.meta.env; keep WXT_ for framework (e.g. WXT_DEBUG)
    envPrefix: ["BONDERY_PUBLIC_", "WXT_"],
    resolve: {
      alias: {
        "@bondery/translations": path.join(repoRoot, "packages/translations/src"),
      },
    },
    // Enable polling-based file watching on Windows where native FS events are unreliable
    server:
      mode === "development"
        ? {
            watch: {
              interval: 300,
              usePolling: true,
            },
          }
        : {},
  }),

  // Disable automatic browser startup in `wxt` dev
  webExt: {
    disabled: true,
  },
});
