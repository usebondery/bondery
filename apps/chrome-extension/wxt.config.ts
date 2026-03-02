import { defineConfig } from "wxt";
import { resolve } from "path";

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
  srcDir: "src",
  entrypointsDir: "entrypoints",
  publicDir: "public",
  outDir: "dist",

  // Target Chromium browsers
  browser: "chrome",

  // Disable auto-imports for explicit control during migration
  imports: false,

  // React module for JSX/TSX support
  modules: ["@wxt-dev/module-react"],

  // Disable automatic browser startup in `wxt` dev
  webExt: {
    disabled: true,
  },

  // Keep extension dev server origin stable (prevents CSP/HMR port mismatch)
  dev: {
    server: {
      port: 3004,
      host: "localhost",
      origin: "http://localhost:3004",
    },
  },

  // Configure Vite
  vite: ({ mode }) => ({
    define:
      mode === "development"
        ? {
            "process.env.NODE_ENV": JSON.stringify("production"),
          }
        : {},
    build:
      mode === "development"
        ? {
            minify: "esbuild" as const,
            sourcemap: false,
          }
        : {},
    // Force esbuild to escape all non-ASCII characters so the output file is
    // valid UTF-8. Without this the transliteration character-map gets embedded
    // as raw bytes that Chrome rejects with "It isn't UTF-8 encoded".
    esbuild: {
      charset: "utf8",
    },
    resolve: {
      alias: {
        "@bondery/helpers": resolve(__dirname, "../../packages/helpers/src/index.ts"),
        "@bondery/branding-src": resolve(__dirname, "../../packages/branding/src/index.ts"),
      },
    },
    css: {
      postcss: {},
    },
  }),

  // Dynamic manifest configuration using environment variables
  manifest: ({ mode }) => {
    const isDev = mode === "development";

    // Environment variables (WXT_ prefix for Vite compatibility)
    const webappUrl = process.env.WXT_WEBAPP_URL || "http://localhost:3000";
    const supabaseUrl = process.env.WXT_SUPABASE_URL || "http://127.0.0.1:54321";

    // Build host permissions dynamically
    const hostPermissions = [
      "https://www.instagram.com/*",
      "https://instagram.com/*",
      "https://www.linkedin.com/*",
      "https://linkedin.com/*",
      "https://*.linkedin.com/*",
      "https://www.facebook.com/*",
      getOrigin(webappUrl),
    ];

    // Add Supabase URL for OAuth token exchange
    if (supabaseUrl) {
      hostPermissions.push(getOrigin(supabaseUrl));
    }

    return {
      name: "Bondery Social Integration",
      description: "Import contacts from social media directly to Bondery",
      version: "0.6.0",

      permissions: [
        "storage",
        "identity",
        "alarms",
        // scripting + tabs needed in dev builds for dynamic content script
        // registration fallback (ensureContentScriptsRegistered in background)
        ...(isDev ? (["scripting", "tabs"] as const) : []),
      ],
      host_permissions: hostPermissions,

      // Icons (matched from public/ directory)
      icons: {
        16: "/icons/icon16.png",
        48: "/icons/icon48.png",
        128: "/icons/icon128.png",
      },

      // Action button configuration
      action: {
        default_icon: {
          16: "/icons/icon16.png",
          48: "/icons/icon48.png",
          128: "/icons/icon128.png",
        },
        default_title: "Bondery",
      },

      // Web accessible resources for the MAIN world script injection
      web_accessible_resources: [
        {
          resources: ["instagram-interceptor.js"],
          matches: ["https://www.instagram.com/*", "https://instagram.com/*"],
        },
        {
          resources: ["linkedin-interceptor.js"],
          matches: [
            "https://www.linkedin.com/*",
            "https://linkedin.com/*",
            "https://*.linkedin.com/*",
          ],
        },
      ],
    };
  },

  // Build hooks for pre-build tasks (icon generation, env check)
  hooks: {
    "build:before": async (wxt) => {
      console.log("[wxt] Running pre-build checks...");

      // Validate required environment variables
      const requiredEnvVars = ["WXT_WEBAPP_URL", "WXT_SUPABASE_URL", "WXT_OAUTH_CLIENT_ID"];
      const missing = requiredEnvVars.filter((key) => !process.env[key]);

      if (missing.length > 0 && wxt.config.mode === "production") {
        console.warn(`[wxt] Warning: Missing environment variables: ${missing.join(", ")}`);
      }
    },
  },
});
