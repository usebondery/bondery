import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isRc, parseCalver, toChromeVersion, toNpm } from "@bondery/helpers/version/calver";
import { DEV_PORTS, DEV_URLS } from "@bondery/schemas/constants";
import { defineConfig } from "wxt";
import { CWS_EXTENSION_PUBLIC_KEY } from "./cws-public-key";
import { loopbackHostPermissionPatterns } from "./src/lib/auth/oauth-urls";

const require = createRequire(import.meta.url);
const { version } = require("./package.json") as { version: string };
const parsedVersion = parseCalver(version);
const chromeVersion = toChromeVersion(parsedVersion);
const versionName = isRc(parsedVersion) ? toNpm(parsedVersion) : undefined;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const extensionDevOrigin = `http://127.0.0.1:${DEV_PORTS.EXTENSION}`;
const isCi = process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true";
const extensionFlavor =
  process.env.BONDERY_EXTENSION_FLAVOR === "production"
    ? "production"
    : process.env.BONDERY_EXTENSION_FLAVOR === "staging"
      ? "staging"
      : "local";
const includeManifestKey = extensionFlavor !== "production";

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

  // Bind HMR to 127.0.0.1. Chrome MV3 only allows localhost/127.0.0.1 in
  // unpacked extension_pages CSP; `localhost` can resolve to ::1 and then
  // Chrome drops the extra script-src and falls back to `script-src 'self'`.
  dev: {
    server: {
      host: "127.0.0.1",
      origin: extensionDevOrigin,
      port: DEV_PORTS.EXTENSION,
    },
  },
  entrypointsDir: "entrypoints",

  // Fail production builds that would inline empty BONDERY_PUBLIC_* (WXT bake time).
  hooks: {
    "build:before": (wxt) => {
      const requiredEnvVars = [
        "BONDERY_PUBLIC_API_URL",
        "BONDERY_PUBLIC_OAUTH_CLIENT_ID",
        "BONDERY_PUBLIC_WEBAPP_URL",
      ] as const;
      const missing = requiredEnvVars.filter((key) => !process.env[key]?.trim());

      if (missing.length > 0) {
        const message = `[wxt] Missing required environment variables: ${missing.join(", ")}`;
        if (wxt.config.mode === "production") {
          throw new Error(message);
        }
        console.warn(message);
        return;
      }

      if (wxt.config.mode === "production" && isCi) {
        const bakedUrls = [
          process.env.BONDERY_PUBLIC_API_URL,
          process.env.BONDERY_PUBLIC_WEBAPP_URL,
        ];
        if (bakedUrls.some((url) => url && /localhost|127\.0\.0\.1/i.test(url))) {
          throw new Error(
            "[wxt] Production CI build cannot bake localhost BONDERY_PUBLIC_API_URL or BONDERY_PUBLIC_WEBAPP_URL",
          );
        }
      }
    },
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.command !== "serve") {
        return;
      }
      // WXT adds `http://127.0.0.1:26633`. Chrome's unpacked CSP exception is
      // the host (any port), written as `http://127.0.0.1:*`.
      manifest.content_security_policy = {
        extension_pages:
          "script-src 'self' 'wasm-unsafe-eval' http://127.0.0.1:* http://localhost:*; object-src 'self';",
        sandbox:
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:* http://localhost:*; sandbox allow-scripts allow-forms allow-popups allow-modals; child-src 'self';",
      };
    },
  },

  // Disable auto-imports for explicit control during migration
  imports: false,

  // Dynamic manifest configuration using environment variables
  manifest: ({ mode }) => {
    const _isDev = mode === "development";

    const webappUrl = process.env.BONDERY_PUBLIC_WEBAPP_URL || DEV_URLS.webapp;
    const apiUrl = process.env.BONDERY_PUBLIC_API_URL || DEV_URLS.api;
    const webappOrigin = getOrigin(webappUrl);
    const apiOrigin = getOrigin(apiUrl);

    // Loopback aliases so token fetch to 127.0.0.1 is privileged when env is
    // localhost (and vice versa).
    const hostPermissions = [
      ...new Set([
        "https://www.instagram.com/*",
        "https://instagram.com/*",
        "https://www.linkedin.com/*",
        "https://linkedin.com/*",
        "https://*.linkedin.com/*",
        ...loopbackHostPermissionPatterns(webappUrl),
        ...(apiOrigin !== webappOrigin ? loopbackHostPermissionPatterns(apiUrl) : []),
      ]),
    ];

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
      // Local unpacked ID = Chrome Web Store ID so OAuth redirect_uri matches
      // BONDERY_INFRA_CHROME_EXTENSION_ID. Staging/RC zips keep the key; CWS omits it.
      ...(includeManifestKey ? { key: CWS_EXTENSION_PUBLIC_KEY } : {}),
      name: "Bondery Extension",

      permissions: ["storage", "identity", "alarms"],
      version: chromeVersion,
      ...(versionName ? { version_name: versionName } : {}),

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
    envPrefix: ["BONDERY_PUBLIC_", "BONDERY_EXTENSION_", "WXT_"],
    resolve: {
      alias: {
        "@bondery/translations": path.join(repoRoot, "packages/translations/src"),
      },
    },
    // Enable polling-based file watching on Windows where native FS events are unreliable
    server:
      mode === "development"
        ? {
            host: "127.0.0.1",
            origin: extensionDevOrigin,
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
